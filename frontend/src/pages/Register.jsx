import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

function getErrorMessage(error) {
  const detail = error.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(' ')
  }

  return detail || 'Unable to create account. Check the fields and try again.'
}

function Register() {
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
      await api.post('/auth/register', form)
      navigate('/login', { replace: true })
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
          <h2 id="product-title">A focused workspace for market alerts</h2>
          <p>
            Create an account to connect your watchlist, alert rules, and triggered
            alert history under one login.
          </p>

          <ul className="feature-list">
            <li>
              <span>01</span>
              <strong>REST market data</strong>
              <p>CoinGecko prices flow through the CryptoAlert API.</p>
            </li>
            <li>
              <span>02</span>
              <strong>Personal rules</strong>
              <p>Alert settings are tied to your authenticated account.</p>
            </li>
            <li>
              <span>03</span>
              <strong>Email pipeline</strong>
              <p>Triggered alerts are prepared for the notification worker.</p>
            </li>
          </ul>
        </section>

        <section className="auth-panel" aria-labelledby="register-title">
          <div className="auth-copy">
            <p className="eyebrow">Account setup</p>
            <h1 id="register-title">Create account</h1>
            <p>Use an email and password to start tracking price alerts.</p>
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
              autoComplete="new-password"
              minLength="8"
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
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </main>
  )
}

export default Register
