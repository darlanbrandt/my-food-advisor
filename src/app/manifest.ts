import type { MetadataRoute } from 'next'

// Gera /manifest.webmanifest automaticamente (Next.js App Router).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Food Advisor',
    short_name: 'Food Advisor',
    description: 'Painel pessoal de alimentação — plano, metas e preparação',
    id: '/dashboard',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'pt-BR',
    dir: 'ltr',
    background_color: '#141413',
    theme_color: '#141413',
    categories: ['health', 'lifestyle', 'food'],
    icons: [
      { src: '/icons/icon-192.png',     sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png',     sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
