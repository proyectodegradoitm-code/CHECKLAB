'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ORG_NOMBRE } from '@/lib/org'

const IconDashboard = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
const IconQr = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" />
    <rect x="3" y="15" width="6" height="6" rx="1" />
    <path strokeLinecap="round" d="M15 15h2m4 0v2m0 4h-4m-2-2v2m2-6v2" />
  </svg>
)
const IconKey = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)
const IconFlask = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6m-5 6l-4 9a1 1 0 00.9 1.5h10.2a1 1 0 00.9-1.5L14 9V3H10v6z" />
    <path strokeLinecap="round" d="M8.5 16.5h2m1 0h3" />
  </svg>
)
const IconShield = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
  </svg>
)
const IconClock = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
  </svg>
)
const IconLogout = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const navItems = [
  { href: '/admin',           label: 'Dashboard',            icon: <IconDashboard /> },
  { href: '/admin/qr',        label: 'Gestión QR',           icon: <IconQr /> },
  { href: '/admin/fgl004',    label: 'FGL 004 — Préstamos',  icon: <IconKey /> },
  { href: '/admin/fgl010',    label: 'FGL 010 — Inventario', icon: <IconFlask /> },
  { href: '/admin/fgl140',    label: 'FGL 140 — Control EPP',icon: <IconShield /> },
  { href: '/admin/historial', label: 'Historial',            icon: <IconClock /> },
]

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userEmail.slice(0, 2).toUpperCase()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-950 via-blue-900 to-blue-900 text-white flex flex-col shadow-2xl z-10">
      {/* Marca superior */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md shrink-0">
            <span className="text-blue-900 font-black text-sm tracking-tight">CL</span>
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-[15px] leading-tight tracking-widest text-white">CHECKLAB</p>
            <p className="text-blue-300 text-[11px] truncate mt-0.5">{ORG_NOMBRE}</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-blue-400/70 text-[10px] font-bold uppercase tracking-[0.15em] px-3 mb-3">
          Menú principal
        </p>
        {navItems.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? 'bg-white/[0.14] text-white font-semibold shadow-sm'
                  : 'text-blue-200/80 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <span className={`transition-colors ${active ? 'text-white' : 'text-blue-300/80 group-hover:text-blue-100'}`}>
                {item.icon}
              </span>
              <span className="flex-1 text-[13px]">{item.label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Usuario */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border border-blue-400/40 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-white">{initials}</span>
          </div>
          <p className="text-blue-200/80 text-[11px] truncate flex-1">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-blue-300/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-150"
        >
          <IconLogout />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
