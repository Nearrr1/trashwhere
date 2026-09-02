/**
 * NextAuth v5 (Auth.js) Configuration for TrashWhere (Phase 13).
 *
 * Implements optional Google authentication with JWT encrypted session cookies.
 * Does not require external database persistence for authentication tokens.
 *
 * Exposes:
 *  - handlers: Next.js App Router GET/POST route handlers
 *  - auth: Server-side session verification helper (works in Route Handlers & Server Components)
 *  - signIn / signOut: Authentication action triggers
 */

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  'trashwhere-dev-secret-key-minimum-32-chars-length'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
  ],
  secret: authSecret,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id || user.email || token.sub
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string) || session.user.email || ''
      }
      return session
    },
  },
})
