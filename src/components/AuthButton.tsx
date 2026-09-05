'use client'

import { useState, useEffect } from 'react'
import { LogIn, LogOut, User, Clock, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { signIn, signOut } from 'next-auth/react'

interface AuthUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function AuthButton() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data?.user) {
            setUser(data.user)
          }
        }
      } catch (err) {
        console.warn('Unable to load auth session:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    checkSession()
    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div
        className="w-8 h-8 rounded-full bg-forest-hover animate-pulse"
        aria-hidden="true"
      />
    )
  }

  if (!user) {
    return (
      <button
        type="button"
        id="btn-google-login"
        onClick={() => signIn('google', { redirectTo: '/history' })}
        aria-label="Đăng nhập với Google"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-paper cursor-pointer"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <LogIn size={14} aria-hidden="true" />
        <span>Đăng nhập</span>
      </button>
    )
  }

  const displayName = user.name || user.email?.split('@')[0] || 'Tài khoản'

  return (
    <div className="relative">
      <button
        type="button"
        id="btn-user-menu"
        onClick={() => setMenuOpen(prev => !prev)}
        aria-expanded={menuOpen}
        aria-label={`Menu người dùng: ${displayName}`}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-paper focus-visible:outline-paper cursor-pointer"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
        }}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <User size={14} aria-hidden="true" />
        )}
        <span className="max-w-[80px] truncate">{displayName}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="absolute right-0 mt-2 w-48 rounded-md shadow-overlay bg-paper border border-paper-rule py-1 z-40"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '13px' }}
          >
            <div className="px-3 py-2 border-b border-paper-rule text-xs text-ink-secondary">
              <p className="font-semibold text-ink truncate">{user.name}</p>
              <p className="truncate">{user.email}</p>
            </div>

            <Link
              href="/history"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-ink hover:bg-paper-hover transition-colors"
            >
              <Clock size={15} aria-hidden="true" />
              Lịch sử quét
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ redirectTo: '/' })}
              className="w-full flex items-center gap-2 px-3 py-2 text-terra hover:bg-paper-hover transition-colors text-left cursor-pointer"
            >
              <LogOut size={15} aria-hidden="true" />
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </div>
  )
}
