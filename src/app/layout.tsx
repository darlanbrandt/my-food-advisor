import type { Metadata } from 'next'
import { Instrument_Sans } from 'next/font/google'
import './globals.css'

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
}

// Aplica o tema salvo antes da primeira pintura, evitando flash de tema
// (e fazendo todas as páginas, inclusive /login, respeitarem a preferência).
const themeScript = `(function(){try{var t=localStorage.getItem('fa_theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" className={instrumentSans.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  )
}
