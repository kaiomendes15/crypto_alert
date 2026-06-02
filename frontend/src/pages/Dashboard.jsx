import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowDownRight, ArrowUpRight, RefreshCw, Search } from 'lucide-react'
import api from '../api'
import PageHeader from '../components/PageHeader'

const POLL_INTERVAL_MS = 30000
const VISIBLE_COINS = 20

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatPrice(value) {
  return priceFormatter.format(value)
}

function formatChange(value) {
  if (value === null || value === undefined) {
    return '—'
  }

  return `${value > 0 ? '+' : ''}${percentFormatter.format(value)}%`
}

function changeMeta(value) {
  if (value === null || value === undefined) {
    return { className: 'change-neutral', Icon: null }
  }

  return value >= 0
    ? { className: 'change-positive', Icon: ArrowUpRight }
    : { className: 'change-negative', Icon: ArrowDownRight }
}

function Dashboard() {
  const navigate = useNavigate()
  const [coins, setCoins] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  const normalisedSearch = searchQuery.trim().toLowerCase()
  const visibleCoins = normalisedSearch
    ? coins.filter((coin) =>
        [coin.id, coin.name, coin.symbol].some((value) =>
          value.toLowerCase().includes(normalisedSearch),
        ),
      )
    : coins.slice(0, VISIBLE_COINS)

  useEffect(() => {
    let isMounted = true

    async function fetchMarkets(isPolling = false) {
      if (isPolling) {
        setIsRefreshing(true)
      }

      try {
        const { data } = await api.get('/coins/markets')

        if (!isMounted) {
          return
        }

        setCoins(data)
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

        setError(requestError.response?.data?.detail || 'Unable to load market prices.')
      } finally {
        if (isMounted) {
          setIsInitialLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    fetchMarkets()
    const intervalId = window.setInterval(() => fetchMarkets(true), POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [navigate])

  async function handleSearchSubmit(event) {
    event.preventDefault()

    if (!normalisedSearch || visibleCoins.length > 0) {
      return
    }

    setIsSearching(true)
    setError('')

    try {
      const coinId = normalisedSearch.replace(/\s+/g, '-')
      const { data } = await api.get('/coins/markets', { params: { ids: coinId } })

      if (data.length === 0) {
        return
      }

      setCoins((currentCoins) => {
        const knownIds = new Set(currentCoins.map((coin) => coin.id))
        const newCoins = data.filter((coin) => !knownIds.has(coin.id))
        return [...currentCoins, ...newCoins]
      })
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        localStorage.removeItem('crypto_alert_token')
        navigate('/login', { replace: true })
        return
      }

      setError(requestError.response?.data?.detail || 'Unable to search this coin.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Markets"
        title="Live prices"
        subtitle="Top 20 crypto markets by default. Search by name, symbol, or CoinGecko ID."
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
        <form className="toolbar" onSubmit={handleSearchSubmit}>
          <div className="input-wrap toolbar-search">
            <Search size={16} strokeWidth={2} className="input-icon" aria-hidden="true" />
            <input
              id="coin-search"
              name="coin-search"
              type="search"
              aria-label="Search market"
              placeholder="Search bitcoin, ethereum, solana…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-ghost" disabled={isSearching}>
            {isSearching ? 'Searching…' : 'Fetch by ID'}
          </button>
          <span className="result-count">
            {isInitialLoading ? 'Loading…' : `${visibleCoins.length} shown`}
          </span>
        </form>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Coin</th>
                <th scope="col" className="col-right">Price</th>
                <th scope="col" className="col-right">24h change</th>
              </tr>
            </thead>
            <tbody>
              {isInitialLoading
                ? Array.from({ length: VISIBLE_COINS }, (_, index) => (
                    <tr className="skeleton-row" key={index}>
                      <td>
                        <span className="skeleton-logo" />
                        <span className="skeleton-line wide" />
                      </td>
                      <td className="col-right">
                        <span className="skeleton-line medium" />
                      </td>
                      <td className="col-right">
                        <span className="skeleton-line short" />
                      </td>
                    </tr>
                  ))
                : visibleCoins.map((coin) => {
                    const { className, Icon } = changeMeta(coin.price_change_percentage_24h)
                    return (
                      <tr key={coin.id}>
                        <td>
                          <span className="coin-cell">
                            <img src={coin.image} alt="" width="30" height="30" loading="lazy" />
                            <span className="coin-cell-text">
                              <span className="coin-name">{coin.name}</span>
                              <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
                            </span>
                          </span>
                        </td>
                        <td className="num col-right">{formatPrice(coin.current_price)}</td>
                        <td className={`num col-right ${className}`}>
                          <span className="change-cell">
                            {Icon && <Icon size={14} strokeWidth={2.2} aria-hidden="true" />}
                            {formatChange(coin.price_change_percentage_24h)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              {!isInitialLoading && visibleCoins.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan="3">
                    <Search size={22} strokeWidth={1.6} />
                    No coin matched your search.
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

export default Dashboard
