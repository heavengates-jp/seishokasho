import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { logout } from '../lib/auth'

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
    navigate('/admin/login')
  }

  return (
    <div className="app">
      <header className="shell header">
        <div className="brand">
          <span className="brand-mark">✶</span>
          <div>
            <p className="title">今日の聖書箇所 Ver.24</p>
          </div>
        </div>
        <nav className="nav">
          {[
            { to: '/', label: '今日' },
            { to: '/history', label: '履歴' },
            ...(pathname.startsWith('/admin') ? [{ to: '/admin', label: '管理' }] : []),
          ].map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== '/' && pathname.startsWith(item.to))
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link ${active ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="auth">
          {user ? (
            <button className="ghost" onClick={handleSignOut}>
              サインアウト
            </button>
          ) : pathname.startsWith('/admin') ? (
            <Link className="ghost" to="/admin/login">
              ログイン
            </Link>
          ) : null}
        </div>
      </header>
      <main className="shell">{children}</main>
    </div>
  )
}
