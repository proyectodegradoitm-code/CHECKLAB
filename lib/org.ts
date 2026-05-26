/**
 * Identidad de la organización activa.
 * Cada despliegue (universidad) configura estas variables en Vercel.
 */
export const ORG_ID     = process.env.NEXT_PUBLIC_ORG_ID     ?? ''
export const ORG_NOMBRE = process.env.NEXT_PUBLIC_ORG_NOMBRE ?? 'Laboratorios'
export const ORG_SLUG   = process.env.NEXT_PUBLIC_ORG_SLUG   ?? ''
