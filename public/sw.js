/* Service worker — Food Advisor PWA
   Estratégias:
   - /api/*            → sempre rede (nunca cacheia dados autenticados)
   - assets estáticos  → stale-while-revalidate
   - navegações (HTML) → network-first, com fallback offline ao cache
   Suba o VERSION para invalidar os caches antigos. */
const VERSION = 'fa-v1'
const STATIC  = `${VERSION}-static`
const PAGES   = `${VERSION}-pages`

const PRECACHE = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return // dados dinâmicos: sempre rede

  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|woff2?|png|jpe?g|svg|ico|webp)$/.test(url.pathname)

  // Assets estáticos: stale-while-revalidate
  if (isStatic) {
    event.respondWith(caches.open(STATIC).then(async (cache) => {
      const cached = await cache.match(request)
      const network = fetch(request)
        .then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res })
        .catch(() => cached)
      return cached || network
    }))
    return
  }

  // Navegações: network-first com fallback ao HTML em cache
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(request)
        const cache = await caches.open(PAGES)
        cache.put(request, res.clone())
        return res
      } catch {
        const cache = await caches.open(PAGES)
        const cached = await cache.match(request)
        return cached || (await cache.match('/dashboard')) || Response.error()
      }
    })())
  }
})
