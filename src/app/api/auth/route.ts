import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { createHash, timingSafeEqual } from 'node:crypto'

// Comparação em tempo constante: compara digests SHA-256 (sempre 32 bytes),
// evitando vazar o tamanho/conteúdo da senha por timing attack.
function passwordMatches(input: string, expected: string): boolean {
  const a = createHash('sha256').update(input).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const expected = process.env.DASHBOARD_PASSWORD

  if (typeof password !== 'string' || !expected || !passwordMatches(password, expected)) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)
  const token = await new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('auth_token')
  return res
}
