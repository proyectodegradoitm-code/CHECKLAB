import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/AdminNav'
import AlertaBanner from '@/components/AlertaBanner'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Watermark ITM */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 ml-64">
        <img src="/logoitm.png" alt="" className="w-[480px] select-none" style={{ opacity: 0.04 }} />
      </div>
      <AdminNav userEmail={user.email ?? ''} />
      <AlertaBanner />
      <main className="flex-1 ml-64 pt-8 px-8 pb-8 relative z-10">
        {children}
      </main>
    </div>
  )
}
