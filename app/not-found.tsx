import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">QR no encontrado</h1>
        <p className="text-gray-500 text-sm mb-6">
          Este código QR no existe o fue desactivado.
        </p>
        <p className="text-xs text-gray-400">CHECKLAB · ITM Laboratorios</p>
      </div>
    </div>
  )
}
