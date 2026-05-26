"""
Incrusta el logo ITM como fondo de hoja (watermark) en cada plantilla Excel.
Uso:  python scripts/add-watermark-to-templates.py
"""
import zipfile, shutil, os, re, io, sys

LOGO_SRC  = "public/logoitm.png"
LOGO_DEST = "xl/media/logoitm.png"
IMG_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"

TEMPLATES = [
    "public/templates/FGL-004-template.xlsx",
    "public/templates/FGL-010-template.xlsm",
    "public/templates/FGL-140-template.xlsm",
]

logo_bytes = open(LOGO_SRC, "rb").read()


def next_rel_id(rels_xml):
    ids = re.findall(r'Id="(rId\d+)"', rels_xml)
    nums = [int(i[3:]) for i in ids if i.startswith("rId")]
    return "rId{}".format(max(nums) + 1) if nums else "rId1"


def inject_background(sheet_xml, rel_id):
    picture_tag = '<picture r:id="{}"/>'.format(rel_id)
    if picture_tag in sheet_xml:
        return sheet_xml  # ya inyectado
    if "<sheetPr" in sheet_xml:
        # Existe sheetPr — insertar antes del cierre
        if re.search(r'<sheetPr[^>]*/>', sheet_xml):
            sheet_xml = re.sub(
                r'(<sheetPr[^>]*/>)',
                lambda m: m.group(1).replace("/>", ">{}</sheetPr>".format(picture_tag)),
                sheet_xml, count=1,
            )
        else:
            sheet_xml = re.sub(
                r'(</sheetPr>)',
                '{}</sheetPr>'.format(picture_tag),
                sheet_xml, count=1,
            )
    else:
        tag = "<sheetData" if "<sheetData" in sheet_xml else "<dimension"
        sheet_xml = sheet_xml.replace(
            tag, "<sheetPr>{}</sheetPr>{}".format(picture_tag, tag), 1
        )
    return sheet_xml


def add_image_rel(rels_xml, rel_id):
    new_rel = (
        '<Relationship Id="{}" Type="{}" Target="../media/logoitm.png"/>'
    ).format(rel_id, IMG_REL_TYPE)
    return rels_xml.replace("</Relationships>", "{}{}".format(new_rel, "</Relationships>"))


def process_template(path):
    print("Procesando: {}".format(path))
    backup = path + ".bak"
    shutil.copy2(path, backup)

    buf = io.BytesIO()
    with zipfile.ZipFile(path, "r") as zin:
        sheet_paths = [n for n in zin.namelist()
                       if re.match(r"xl/worksheets/sheet\d+\.xml$", n)]

        # Pre-compute updated rels for each sheet
        updated_rels = {}   # rels_path -> updated xml bytes
        sheet_updates = {}  # sheet_path -> updated xml bytes

        for sp in sheet_paths:
            rp = sp.replace("xl/worksheets/", "xl/worksheets/_rels/") \
                   .replace(".xml", ".xml.rels")
            if rp in zin.namelist():
                rels_xml = zin.read(rp).decode("utf-8")
            else:
                rels_xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                            '<Relationships xmlns="http://schemas.openxmlformats.org'
                            '/package/2006/relationships"></Relationships>')
            rel_id = next_rel_id(rels_xml)
            updated_rels[rp] = add_image_rel(rels_xml, rel_id).encode("utf-8")
            sheet_updates[sp] = inject_background(
                zin.read(sp).decode("utf-8"), rel_id
            ).encode("utf-8")
            print("  Fondo en {} (rel={})".format(sp, rel_id))

        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            written = set()
            for item in zin.infolist():
                fn = item.filename
                if fn in written:
                    continue
                written.add(fn)

                if fn == LOGO_DEST:
                    zout.writestr(item, logo_bytes)
                elif fn in sheet_updates:
                    zout.writestr(item, sheet_updates[fn])
                elif fn in updated_rels:
                    zout.writestr(item, updated_rels[fn])
                else:
                    zout.writestr(item, zin.read(fn))

            # Agregar rels de hojas que no existian
            for rp, data in updated_rels.items():
                if rp not in written:
                    zout.writestr(rp, data)
                    written.add(rp)

            # Agregar logo si no existia
            if LOGO_DEST not in written:
                zout.writestr(LOGO_DEST, logo_bytes)
                print("  Logo agregado: {}".format(LOGO_DEST))

    with open(path, "wb") as f:
        f.write(buf.getvalue())
    os.remove(backup)
    print("  Guardado OK: {}\n".format(path))


for tpl in TEMPLATES:
    try:
        process_template(tpl)
    except Exception as e:
        print("  ERROR en {}: {}\n".format(tpl, e))

print("Listo! Templates actualizados.")
