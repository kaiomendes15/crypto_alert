import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

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
          <p className="eyebrow">CryptoAlert</p>
          <h2 id="product-title">Price alerts for crypto markets</h2>
          <p>
            Track watched coins, define alert rules, and receive notification history
            from one authenticated workspace.
          </p>

          <ul className="feature-list">
            <li>
              <span>01</span>
              <strong>Live market view</strong>
              <p>Dashboard foundation for CoinGecko market prices.</p>
            </li>
            <li>
              <span>02</span>
              <strong>Watchlist control</strong>
              <p>Keep selected coins available for fast monitoring.</p>
            </li>
            <li>
              <span>03</span>
              <strong>Alert rules</strong>
              <p>Prepare price and 24h change conditions for each asset.</p>
            </li>
          </ul>
        </section>

        <section className="auth-panel" aria-labelledby="login-title">
          <div className="auth-copy">
            <p className="eyebrow">Secure access</p>
            <h1 id="login-title">Sign in</h1>
            <p>Use your account to open the CryptoAlert dashboard.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={updateField}
              required
            />

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
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
