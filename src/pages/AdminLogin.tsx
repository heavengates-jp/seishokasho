import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { login } from '../lib/auth'

export default function AdminLogin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) navigate('/admin')
  }, [navigate, user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      console.error(err)
      setError('ログインに失敗しました。ID/PWDを確認してください。')
    }
  }

  return (
    <div className="stack page narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>管理者ログイン</h1>
        </div>
      </div>
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          ログインID（メール）
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          ログイン
        </button>
      </form>
    </div>
  )
}
