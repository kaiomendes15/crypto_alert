import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, BellRing, LineChart, Lock, LogIn, Mail, Star } from 'lucide-react'
import api from '../api'

const FEATURES = [
  { icon: LineChart, title: 'Live market view', body: 'Real-time CoinGecko market prices on one dashboard.' },
  { icon: Star, title: 'Watchlist control', body: 'Keep selected coins available for fast monitoring.' },
  { icon: BellRing, title: 'Alert rules', body: 'Price and 24h change conditions for each asset.' },
]

function getErrorMessage(error) {
  return error.response?.data?.detail || 'Unable to sign in. Check your email and password.'
}

function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const { data } = await api.post('/auth/login', form)
      localStorage.setItem('crypto_alert_token', data.access_token)
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-layout">
        <section className="product-panel" aria-labelledby="product-title">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Activity size={16} strokeWidth={2.4} />
            </span>
            <span className="brand-name">CryptoAlert</span>
          </span>
          <div className="product-panel-lead">
            <h2 id="product-title">Price alerts for crypto markets</h2>
            <p>
              Track watched coins, define alert rules, and receive notification history
              from one authenticated workspace.
            </p>
          </div>

          <ul className="feature-list">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <span className="feature-list-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <strong>{title}</strong>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="auth-panel" aria-labelledby="login-title">
          <div className="auth-copy">
            <p className="eyebrow">Secure access</p>
            <h1 id="login-title">Sign in</h1>
            <p>Use your account to open the CryptoAlert dashboard.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <div className="input-wrap">
                <Mail size={16} strokeWidth={2} className="input-icon" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={updateField}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <Lock size={16} strokeWidth={2} className="input-icon" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={updateField}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="alert-banner" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
              <LogIn size={16} strokeWidth={2.2} />
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            No account yet? <Link to="/register">Create one</Link>
          </p>
        </section>
      </div>
    </main>
  )
}

export default Login
