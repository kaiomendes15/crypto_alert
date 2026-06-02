import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, BellRing, Check, LineChart, Lock, Mail, ShieldCheck, UserPlus, X } from 'lucide-react'
import api from '../api'

const FEATURES = [
  { icon: LineChart, title: 'REST market data', body: 'CoinGecko prices flow through the CryptoAlert API.' },
  { icon: BellRing, title: 'Personal rules', body: 'Alert settings are tied to your authenticated account.' },
  { icon: Mail, title: 'Email pipeline', body: 'Triggered alerts are delivered by the notification worker.' },
]

// Frontend-only password policy. `confirmPassword` is never sent to the API.
const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (value) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'One lowercase letter (a–z)', test: (value) => /[a-z]/.test(value) },
  { id: 'number', label: 'One number (0–9)', test: (value) => /\d/.test(value) },
  { id: 'special', label: 'One special character (!@#$…)', test: (value) => /[^A-Za-z0-9]/.test(value) },
]

const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']

function getErrorMessage(error) {
  const detail = error.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(' ')
  }

  return detail || 'Unable to create account. Check the fields and try again.'
}

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(form.password) })),
    [form.password],
  )
  const metCount = ruleResults.filter((rule) => rule.met).length
  const allRulesMet = metCount === PASSWORD_RULES.length
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword
  const canSubmit = allRulesMet && passwordsMatch && form.email.length > 0

  async function handleSubmit(event) {
    event.preventDefault()

    if (!allRulesMet) {
      setError('Your password does not meet all the requirements below.')
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      // confirmPassword stays on the client — only credentials are sent.
      await api.post('/auth/register', { email: form.email, password: form.password })
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
          <span className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Activity size={16} strokeWidth={2.4} />
            </span>
            <span className="brand-name">CryptoAlert</span>
          </span>
          <div className="product-panel-lead">
            <h2 id="product-title">A focused workspace for market alerts</h2>
            <p>
              Create an account to connect your watchlist, alert rules, and triggered
              alert history under one login.
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

        <section className="auth-panel" aria-labelledby="register-title">
          <div className="auth-copy">
            <p className="eyebrow">Account setup</p>
            <h1 id="register-title">Create account</h1>
            <p>Use an email and password to start tracking price alerts.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
              <div className="password-field-wrap">
                <div className="input-wrap">
                  <Lock size={16} strokeWidth={2} className="input-icon" aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={updateField}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    aria-describedby="password-requirements"
                    required
                  />
                </div>

                {form.password.length > 0 && (
                  <div
                    className={`password-meter ${passwordFocused ? 'is-visible' : ''}`}
                    id="password-requirements"
                    aria-live="polite"
                  >
                    <div className="password-meter-head">
                      <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
                      <span className={`password-meter-label strength-${metCount}`}>
                        {STRENGTH_LABELS[metCount] ?? STRENGTH_LABELS[0]}
                      </span>
                    </div>
                    <div
                      className="password-bars"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={PASSWORD_RULES.length}
                      aria-valuenow={metCount}
                      aria-label="Password strength"
                    >
                      {PASSWORD_RULES.map((rule, index) => (
                        <span
                          key={rule.id}
                          className={`password-bar ${index < metCount ? `is-on strength-${metCount}` : ''}`}
                        />
                      ))}
                    </div>
                    <ul className="password-rules">
                      {ruleResults.map((rule) => (
                        <li key={rule.id} className={rule.met ? 'is-met' : 'is-unmet'}>
                          <span className="password-rule-icon" aria-hidden="true">
                            {rule.met ? <Check size={13} strokeWidth={2.6} /> : <X size={13} strokeWidth={2.6} />}
                          </span>
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="input-wrap">
                <Lock size={16} strokeWidth={2} className="input-icon" aria-hidden="true" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={updateField}
                  aria-describedby="confirm-feedback"
                  required
                />
              </div>
              {form.confirmPassword.length > 0 && (
                <p
                  id="confirm-feedback"
                  className={`field-feedback ${passwordsMatch ? 'is-ok' : 'is-bad'}`}
                >
                  {passwordsMatch ? <Check size={13} strokeWidth={2.6} /> : <X size={13} strokeWidth={2.6} />}
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            {error && (
              <p className="alert-banner" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isSubmitting || !canSubmit}
            >
              <UserPlus size={16} strokeWidth={2.2} />
              {isSubmitting ? 'Creating account…' : 'Create account'}
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
