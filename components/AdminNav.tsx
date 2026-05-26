'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ORG_NOMBRE } from '@/lib/org'

const navItems = [
  { href: '/admin',           label: 'Dashboard',           icon: '📊' },
  { href: '/admin/qr',        label: 'Gestión QR',          icon: '📱' },
  { href: '/admin/fgl004',    label: 'FGL 004 — Préstamos', icon: '🔑' },
  { href: '/admin/fgl010',    label: 'FGL 010 — Inventario',icon: '🧪' },
  { href: '/admin/fgl140',    label: 'FGL 140 — Control EPP',icon: '🦺' },
  { href: '/admin/historial', label: 'Historial',           icon: '📋' },
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

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-blue-900 text-white flex flex-col shadow-xl z-10">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <span className="text-blue-900 font-bold text-sm">CL</span>
          </div>
          <div>
            <p className="font-bold text-base leading-tight">CHECKLAB</p>
            <p className="text-blue-300 text-xs">{ORG_NOMBRE}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-white text-blue-900 font-semibold'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-blue-700">
        <p className="text-blue-300 text-xs truncate mb-3">{userEmail}</p>
        <button
          onClick={handleSignOut}
          className="w-full text-left flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors"
        >
          <span>🚪</span> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
