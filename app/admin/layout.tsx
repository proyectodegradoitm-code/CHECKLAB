import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminNav userEmail={user.email ?? ''} />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}
