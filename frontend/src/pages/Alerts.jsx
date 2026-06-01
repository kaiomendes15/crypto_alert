import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import SignOutButton from '../components/SignOutButton'

const CONDITIONS = [
  { value: 'price_above', label: 'Price above' },
  { value: 'price_below', label: 'Price below' },
  { value: 'change_above', label: '24h change above' },
  { value: 'change_below', label: '24h change below' },
]

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 8,
})

function formatCondition(value) {
  return CONDITIONS.find((condition) => condition.value === value)?.label || value
}

function parseThreshold(value) {
  const cleaned = value.trim().replace(/[^\d,.-]/g, '')
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  if (!cleaned) {
    return Number.NaN
  }

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const groupSeparator = decimalSeparator === ',' ? '.' : ','
    return Number(cleaned.replaceAll(groupSeparator, '').replace(decimalSeparator, '.'))
  }

  if (lastComma !== -1) {
    const [, decimalPart = ''] = cleaned.split(',')
    const normalised = decimalPart.length <= 2
      ? cleaned.replace(',', '.')
      : cleaned.replaceAll(',', '')
    return Number(normalised)
  }

  return Number(cleaned)
}

function Alerts() {
  const navigate = useNavigate()
  const [watchlistItems, setWatchlistItems] = useState([])
  const [watchlistCoins, setWatchlistCoins] = useState([])
  const [alerts, setAlerts] = useState([])
  const [form, setForm] = useState({ coin_id: '', condition: 'price_above', threshold: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingAlertId, setPendingAlertId] = useState('')
  const [error, setError] = useState('')
  const isChangeCondition = form.condition.startsWith('change_')

  const coinOptions = useMemo(() => {
    const coinsById = new Map(watchlistCoins.map((coin) => [coin.id, coin]))
    return watchlistItems.map((item) => {
      const coin = coinsById.get(item.coin_id)
      return {
        id: item.coin_id,
        name: coin?.name || item.coin_id,
        symbol: coin?.symbol || item.coin_id,
      }
    })
  }, [watchlistCoins, watchlistItems])

  useEffect(() => {
    let isMounted = true

    async function loadAlertsPage() {
      try {
        const [watchlistResponse, alertsResponse] = await Promise.all([
          api.get('/watchlist'),
          api.get('/alerts'),
        ])

        if (!isMounted) {
          return
        }

        setWatchlistItems(watchlistResponse.data)
        setAlerts(alertsResponse.data)

        if (watchlistResponse.data.length > 0) {
          const ids = watchlistResponse.data.map((item) => item.coin_id).join(',')
          const marketsResponse = await api.get('/coins/markets', { params: { ids } })

          if (!isMounted) {
            return
          }

          setWatchlistCoins(marketsResponse.data)
          setForm((currentForm) => ({
            ...currentForm,
            coin_id: currentForm.coin_id || watchlistResponse.data[0].coin_id,
          }))
        }

        setError('')
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        if (requestError.response?.status === 401) {
          localStorage.removeItem('crypto_alert_token')
          navigate('/login', { replace: true })
          return
        }

        setError(requestError.response?.data?.detail || 'Unable to load alerts.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadAlertsPage()

    return () => {
      isMounted = false
    }
  }, [navigate])

  function updateField(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }))
  }

  async function createAlert(event) {
    event.preventDefault()

    const selectedCoin = coinOptions.find((coin) => coin.id === form.coin_id)
    if (!selectedCoin) {
      setError('Add a coin to your watchlist before creating an alert.')
      return
    }

    const threshold = parseThreshold(form.threshold)
    if (!Number.isFinite(threshold)) {
      setError('Enter a valid threshold value.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { data } = await api.post('/alerts', {
        coin_id: selectedCoin.id,
        coin_name: selectedCoin.name,
        condition: form.condition,
        threshold,
      })

      setAlerts((currentAlerts) => [data, ...currentAlerts])
      setForm((currentForm) => ({ ...currentForm, threshold: '' }))
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        localStorage.removeItem('crypto_alert_token')
        navigate('/login', { replace: true })
        return
      }

      setError(requestError.response?.data?.detail || 'Unable to create alert.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function deleteAlert(alertId) {
    const previousAlerts = alerts
    setPendingAlertId(alertId)
    setError('')
    setAlerts((currentAlerts) => currentAlerts.filter((alert) => alert.id !== alertId))

    try {
      await api.delete(`/alerts/${alertId}`)
    } catch (requestError) {
      setAlerts(previousAlerts)

      if (requestError.response?.status === 401) {
        localStorage.removeItem('crypto_alert_token')
        navigate('/login', { replace: true })
        return
      }

      setError(requestError.response?.data?.detail || 'Unable to delete alert.')
    } finally {
      setPendingAlertId('')
    }
  }

  function handleSignOut() {
    localStorage.removeItem('crypto_alert_token')
    navigate('/login', { replace: true })
  }

  return (
    <main className="dashboard-shell">
      <section className="market-dashboard" aria-labelledby="alerts-title">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">CryptoAlert</p>
            <h1 id="alerts-title">Alerts</h1>
            <p>Create price and 24h change rules for coins in your watchlist.</p>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-button nav-link" to="/dashboard">
              Dashboard
            </Link>
            <Link className="secondary-button nav-link" to="/watchlist">
              Watchlist
            </Link>
            <Link className="secondary-button nav-link" to="/history">
              History
            </Link>
            <SignOutButton onClick={handleSignOut} />
          </div>
        </header>

        {error && (
          <p className="form-error dashboard-error" role="alert">
            {error}
          </p>
        )}

        <form className="alert-form" onSubmit={createAlert}>
          <div className="form-field">
            <label htmlFor="alert-coin">Coin</label>
            <select
              id="alert-coin"
              name="coin_id"
              value={form.coin_id}
              onChange={updateField}
              disabled={coinOptions.length === 0}
              required
            >
              {coinOptions.length === 0 ? (
                <option value="">No watchlist coins</option>
              ) : (
                coinOptions.map((coin) => (
                  <option key={coin.id} value={coin.id}>
                    {coin.name} ({coin.symbol.toUpperCase()})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="alert-condition">Condition</label>
            <select
              id="alert-condition"
              name="condition"
              value={form.condition}
              onChange={updateField}
              required
            >
              {CONDITIONS.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="alert-threshold">Threshold</label>
            <input
              id="alert-threshold"
              name="threshold"
              type="text"
              inputMode="decimal"
              placeholder={isChangeCondition ? '-5' : '$72,900.00'}
              value={form.threshold}
              onChange={updateField}
              required
            />
          </div>

          <button type="submit" disabled={isSubmitting || coinOptions.length === 0}>
            {isSubmitting ? 'Creating alert' : 'Create Alert'}
          </button>
        </form>

        <div className="market-table-wrap">
          <table className="market-table">
            <thead>
              <tr>
                <th scope="col">Coin</th>
                <th scope="col">Condition</th>
                <th scope="col">Threshold</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }, (_, index) => (
                  <tr className="skeleton-row" key={index}>
                    <td>
                      <span className="skeleton-line wide" />
                    </td>
                    <td>
                      <span className="skeleton-line medium" />
                    </td>
                    <td>
                      <span className="skeleton-line medium" />
                    </td>
                    <td>
                      <span className="skeleton-line short" />
                    </td>
                    <td>
                      <span className="skeleton-line medium" />
                    </td>
                  </tr>
                ))
              ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="numeric-cell">{alert.coin_name}</td>
                    <td>{formatCondition(alert.condition)}</td>
                    <td className="numeric-cell">{numberFormatter.format(alert.threshold)}</td>
                    <td className={alert.is_active ? 'change-positive' : 'change-neutral'}>
                      {alert.is_active ? 'Active' : 'Triggered'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action remove-action"
                        disabled={pendingAlertId === alert.id}
                        onClick={() => deleteAlert(alert.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="empty-table" colSpan="5">
                    No alerts created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default Alerts
