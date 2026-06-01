import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

const POLL_INTERVAL_MS = 30000

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 8,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatCondition(value) {
  return value.replaceAll('_', ' ')
}

function formatChange(value) {
  if (value === null || value === undefined) {
    return 'Unavailable'
  }

  return `${value > 0 ? '+' : ''}${numberFormatter.format(value)}%`
}

function History() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadHistory(isPolling = false) {
      if (isPolling) {
        setIsRefreshing(true)
      }

      try {
        const { data } = await api.get('/alerts/history')

        if (!isMounted) {
          return
        }

        setHistory(data)
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

        setError(requestError.response?.data?.detail || 'Unable to load alert history.')
      } finally {
        if (isMounted) {
          setIsInitialLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    loadHistory()
    const intervalId = window.setInterval(() => loadHistory(true), POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [navigate])

  function handleSignOut() {
    localStorage.removeItem('crypto_alert_token')
    navigate('/login', { replace: true })
  }

  return (
    <main className="dashboard-shell">
      <section className="market-dashboard" aria-labelledby="history-title">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">CryptoAlert</p>
            <h1 id="history-title">Alert history</h1>
            <p>Triggered alerts are listed newest first and refresh every 30 seconds.</p>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-button nav-link" to="/dashboard">
              Dashboard
            </Link>
            <Link className="secondary-button nav-link" to="/alerts">
              Alerts
            </Link>
            <button type="button" className="secondary-button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <p className="form-error dashboard-error" role="alert">
            {error}
          </p>
        )}

        <div className="market-table-wrap">
          <table className="market-table">
            <thead>
              <tr>
                <th scope="col">Coin</th>
                <th scope="col">Condition</th>
                <th scope="col">Threshold</th>
                <th scope="col">Triggered price</th>
                <th scope="col">24h change</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {isInitialLoading ? (
                Array.from({ length: 8 }, (_, index) => (
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
                      <span className="skeleton-line medium" />
                    </td>
                    <td>
                      <span className="skeleton-line short" />
                    </td>
                    <td>
                      <span className="skeleton-line wide" />
                    </td>
                  </tr>
                ))
              ) : history.length > 0 ? (
                history.map((item) => (
                  <tr key={item.id}>
                    <td className="numeric-cell">{item.coin_name}</td>
                    <td>{formatCondition(item.condition)}</td>
                    <td className="numeric-cell">{numberFormatter.format(item.threshold)}</td>
                    <td className="numeric-cell">
                      {numberFormatter.format(item.price_at_trigger)}
                    </td>
                    <td className="numeric-cell">{formatChange(item.change_24h)}</td>
                    <td>{dateFormatter.format(new Date(item.triggered_at))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="empty-table" colSpan="6">
                    No triggered alerts yet.
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

export default History
