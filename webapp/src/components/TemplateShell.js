'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MODULE_MENU_ITEMS, isNavActive } from '@/lib/navigation/menu'
import { applyThemeToDocument, getStoredThemeDark } from '@/lib/theme'

export default function TemplateShell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const dark = getStoredThemeDark()
    setIsDark(dark)
    applyThemeToDocument(dark)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) applyThemeToDocument(isDark)
  }, [isDark, mounted])

  const toggleTheme = () => setIsDark((prev) => !prev)

  const handleLogout = () => {
    document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/login')
  }

  const isLoginPage = pathname?.startsWith('/login')

  if (isLoginPage) {
    return <div className="login-container">{children}</div>
  }

  return (
    <>
      <aside id="left-sidebar" className="sidebar uspg-sidebar" aria-label="Navegación principal">
        <div className="brand-name uspg-sidebar__brand">
          <Link href="/">
            <img src="/logou.png" alt="Universidad San Pablo de Guatemala" className="uspg-sidebar__logo" />
          </Link>
        </div>

        <p className="uspg-sidebar__heading">Módulos</p>

        <nav className="sidebar-nav uspg-sidebar__nav">
          <ul className="metismenu">
            {MODULE_MENU_ITEMS.map((item) => {
              const active = isNavActive(item.path, pathname)
              return (
                <li key={item.path} className={active ? 'active' : ''}>
                  <Link href={item.path} className="uspg-sidebar__link">
                    <i className={`fa ${item.icon}`} aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="uspg-sidebar__footer">
          <button
            type="button"
            className="uspg-sidebar__logout"
            onClick={handleLogout}
          >
            <i className="fa fa-sign-out" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="page uspg-page">
        <header className="page-header uspg-page-header">
          <div className="uspg-page-header__title">
            <i className="fa fa-graduation-cap" aria-hidden="true" />
            <span>Proyecto Integrador — USPG</span>
          </div>
          <div className="uspg-page-header__actions">
            <button
              type="button"
              className="uspg-theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              <i className={`fa ${isDark ? 'fa-sun-o' : 'fa-moon-o'}`} aria-hidden="true" />
            </button>
            <i className="fa fa-bell-o uspg-header-icon" aria-hidden="true" />
            <div className="uspg-header-avatar" aria-hidden="true">
              <i className="fa fa-user" />
            </div>
          </div>
        </header>

        <div className="section-body uspg-section-body">
          <div className="container-fluid">{children}</div>
        </div>
      </div>
    </>
  )
}
