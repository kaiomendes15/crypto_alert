import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowDownRight, ArrowUpRight, History as HistoryIcon, RefreshCw } from 'lucide-react'
import api from '../api'
import PageHeader from '../components/PageHeader'

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
    return '—'
  }

  return `${value > 0 ? '+' : ''}${numberFormatter.format(value)}%`
}

function changeMeta(value) {
  if (value === null || value === undefined) {
    return { className: 'change-neutral', Icon: null }
  }

  return value >= 0
    ? { className: 'change-positive', Icon: ArrowUpRight }
    : { className: 'change-negative', Icon: ArrowDownRight }
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

  return (
    <>
      <PageHeader
        eyebrow="Audit log"
        title="Alert history"
        subtitle="Triggered alerts are listed newest first and refresh every 30 seconds."
      >
        <span className={`status-pill ${isRefreshing ? 'is-active' : ''}`}>
          <RefreshCw size={13} strokeWidth={2} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing' : 'Live · 30s'}
        </span>
      </PageHeader>

      {error && (
        <p className="alert-banner" role="alert">
          <AlertCircle size={16} strokeWidth={2} />
          {error}
        </p>
      )}

      <section className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Coin</th>
                <th scope="col">Condition</th>
                <th scope="col" className="col-right">Threshold</th>
                <th scope="col" className="col-right">Triggered price</th>
                <th scope="col" className="col-right">24h change</th>
                <th scope="col" className="col-right">Date</th>
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
                    <td className="col-right">
                      <span className="skeleton-line medium" />
                    </td>
                    <td className="col-right">
                      <span className="skeleton-line medium" />
                    </td>
                    <td className="col-right">
                      <span className="skeleton-line short" />
                    </td>
                    <td className="col-right">
                      <span className="skeleton-line wide" />
                    </td>
                  </tr>
                ))
              ) : history.length > 0 ? (
                history.map((item) => {
                  const { className, Icon } = changeMeta(item.change_24h)
                  return (
                    <tr key={item.id}>
                      <td className="coin-name">{item.coin_name}</td>
                      <td>
                        <span className="condition-cell">{formatCondition(item.condition)}</span>
                      </td>
                      <td className="num col-right">{numberFormatter.format(item.threshold)}</td>
                      <td className="num col-right">
                        {numberFormatter.format(item.price_at_trigger)}
                      </td>
                      <td className={`num col-right ${className}`}>
                        <span className="change-cell">
                          {Icon && <Icon size={14} strokeWidth={2.2} aria-hidden="true" />}
                          {formatChange(item.change_24h)}
                        </span>
                      </td>
                      <td className="col-right text-dim">
                        {dateFormatter.format(new Date(item.triggered_at))}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td className="empty-cell" colSpan="6">
                    <HistoryIcon size={22} strokeWidth={1.6} />
                    No triggered alerts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default History
