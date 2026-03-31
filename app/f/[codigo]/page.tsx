import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import FormFGL004 from '@/components/forms/FormFGL004'
import FormFGL010 from '@/components/forms/FormFGL010'
import FormFGL140 from '@/components/forms/FormFGL140'

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const supabase = await createClient()

  const { data: qr } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('codigo', codigo)
    .eq('activo', true)
    .single()

  if (!qr) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
            <span className="text-white text-xl">
              {qr.tipo === 'fgl004' ? '🔑' : qr.tipo === 'fgl010' ? '🧪' : '🦺'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            {qr.tipo === 'fgl004' && 'Préstamo / Devolución de Equipos'}
            {qr.tipo === 'fgl010' && 'Registro de Sustancia Química'}
            {qr.tipo === 'fgl140' && 'Control de Elemento de Protección'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{qr.laboratorio}</p>
          {qr.descripcion && <p className="text-xs text-gray-400">{qr.descripcion}</p>}
          <div className="mt-2">
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
              qr.tipo === 'fgl004' ? 'bg-blue-100 text-blue-700' :
              qr.tipo === 'fgl010' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }`}>
              {qr.tipo.toUpperCase().replace('FGL', 'FGL ')}
            </span>
          </div>
        </div>

        <hr className="border-gray-100 mb-6" />

        {qr.tipo === 'fgl004' && <FormFGL004 qrCodigo={qr.codigo} laboratorio={qr.laboratorio} />}
        {qr.tipo === 'fgl010' && <FormFGL010 qrCodigo={qr.codigo} laboratorio={qr.laboratorio} />}
        {qr.tipo === 'fgl140' && <FormFGL140 qrCodigo={qr.codigo} laboratorio={qr.laboratorio} />}

        <p className="text-center text-xs text-gray-300 mt-6">
          CHECKLAB · ITM Laboratorios
        </p>
      </div>
    </div>
  )
}
