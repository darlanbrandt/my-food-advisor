import type { Metadata, Viewport } from 'next'
import { Instrument_Sans } from 'next/font/google'
import './globals.css'
import RegisterSW from '@/components/pwa/RegisterSW'

// Auto-hospedada pelo Next no build — sem requisição a terceiros em runtime
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Food Advisor',
  description: 'Painel pessoal de alimentação',
  applicationName: 'Food Advisor',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Food Advisor',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf8' },
    { media: '(prefers-color-scheme: dark)',  color: '#141413' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Aplica o tema salvo antes da primeira pintura, evitando flash de tema
// (e fazendo todas as páginas, inclusive /login, respeitarem a preferência).
const themeScript = `(function(){try{var t=localStorage.getItem('fa_theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light" className={instrumentSans.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}
