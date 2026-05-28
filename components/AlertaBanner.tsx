'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ORG_ID } from '@/lib/org'
import Link from 'next/link'

type Alerta = {
  tipo: 'error' | 'warning' | 'info'
  mensaje: string
  link: string
}

export default function AlertaBanner() {
  const supabase = createClient()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const fetchAlertas = async () => {
      const today = new Date().toISOString().split('T')[0]
      const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      let qSustVenc = supabase.from('fgl_010').select('*', { count: 'exact', head: true })
        .lt('fecha_vencimiento', today).not('fecha_vencimiento', 'is', null)
      let qSustProx = supabase.from('fgl_010').select('*', { count: 'exact', head: true })
        .gte('fecha_vencimiento', today).lte('fecha_vencimiento', in30days)
      let qEppVenc = supabase.from('fgl_140').select('*', { count: 'exact', head: true })
        .lt('fecha_vencimiento', today).not('fecha_vencimiento', 'is', null)
      let qEppProx = supabase.from('fgl_140').select('*', { count: 'exact', head: true })
        .gte('fecha_vencimiento', today).lte('fecha_vencimiento', in7days)
      let qPrest = supabase.from('fgl_004').select('*', { count: 'exact', head: true })
        .eq('estado', 'activo')

      if (ORG_ID) {
        qSustVenc = qSustVenc.eq('organizacion_id', ORG_ID)
        qSustProx = qSustProx.eq('organizacion_id', ORG_ID)
        qEppVenc  = qEppVenc.eq('organizacion_id', ORG_ID)
        qEppProx  = qEppProx.eq('organizacion_id', ORG_ID)
        qPrest    = qPrest.eq('organizacion_id', ORG_ID)
      }

      const [
        { count: sustVencidas },
        { count: sustProximas },
        { count: eppVencidos },
        { count: eppProximos },
        { count: prestamosActivos },
      ] = await Promise.all([qSustVenc, qSustProx, qEppVenc, qEppProx, qPrest])

      const nuevas: Alerta[] = []

      if ((sustVencidas ?? 0) > 0)
        nuevas.push({ tipo: 'error', mensaje: `${sustVencidas} sustancia(s) química(s) VENCIDA(S)`, link: '/admin/fgl010' })
      if ((eppVencidos ?? 0) > 0)
        nuevas.push({ tipo: 'error', mensaje: `${eppVencidos} elemento(s) EPP VENCIDO(S)`, link: '/admin/fgl140' })
      if ((eppProximos ?? 0) > 0)
        nuevas.push({ tipo: 'warning', mensaje: `${eppProximos} EPP vence en los próximos 7 días`, link: '/admin/fgl140' })
      if ((sustProximas ?? 0) > 0)
        nuevas.push({ tipo: 'warning', mensaje: `${sustProximas} sustancia(s) vence(n) en los próximos 30 días`, link: '/admin/fgl010' })
      if ((prestamosActivos ?? 0) > 0)
        nuevas.push({ tipo: 'info', mensaje: `${prestamosActivos} préstamo(s) pendiente(s) de devolución`, link: '/admin/fgl004' })

      setAlertas(nuevas)
    }

    fetchAlertas()
  }, [])

  if (!visible || alertas.length === 0) return null

  const colorMap = {
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-600 text-white',
  }

  return (
    <div className="fixed top-0 left-64 right-0 z-40 flex flex-col gap-0.5">
      {alertas.map((a, i) => (
        <div key={i} className={`flex items-center justify-between px-5 py-2 text-sm font-medium ${colorMap[a.tipo]}`}>
          <Link href={a.link} className="hover:underline flex items-center gap-2">
            {a.tipo === 'error' ? '🚨' : a.tipo === 'warning' ? '⚠️' : 'ℹ️'} {a.mensaje}
          </Link>
          {i === 0 && (
            <button onClick={() => setVisible(false)} className="ml-4 opacity-80 hover:opacity-100 text-base leading-none">✕</button>
          )}
        </div>
      ))}
    </div>
  )
}
