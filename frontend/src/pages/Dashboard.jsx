import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

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
    return 'Unavailable'
  }

  return `${value > 0 ? '+' : ''}${percentFormatter.format(value)}%`
}

function changeClassName(value) {
  if (value === null || value === undefined) {
    return 'change-neutral'
  }

  return value >= 0 ? 'change-positive' : 'change-negative'
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

  function handleSignOut() {
    localStorage.removeItem('crypto_alert_token')
    navigate('/login', { replace: true })
  }

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
    <main className="dashboard-shell">
      <section className="market-dashboard" aria-labelledby="dashboard-title">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">CryptoAlert</p>
            <h1 id="dashboard-title">Live prices</h1>
            <p>Top 20 crypto markets by default. Search by name, symbol, or CoinGecko ID.</p>
          </div>
          <div className="dashboard-actions">
            <span className={isRefreshing ? 'refresh-status is-active' : 'refresh-status'}>
              {isRefreshing ? 'Refreshing' : 'Polling every 30s'}
            </span>
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

        <form className="dashboard-toolbar" onSubmit={handleSearchSubmit}>
          <label htmlFor="coin-search">Search market</label>
          <input
            id="coin-search"
            name="coin-search"
            type="search"
            placeholder="bitcoin, ethereum, solana"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <span className="result-count">
            {isInitialLoading ? 'Loading markets' : `${visibleCoins.length} shown`}
          </span>
        </form>

        <div className="market-table-wrap">
          <table className="market-table">
            <thead>
              <tr>
                <th scope="col">Coin</th>
                <th scope="col">Symbol</th>
                <th scope="col">Price</th>
                <th scope="col">24h change</th>
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
                      <td>
                        <span className="skeleton-line short" />
                      </td>
                      <td>
                        <span className="skeleton-line medium" />
                      </td>
                      <td>
                        <span className="skeleton-line medium" />
                      </td>
                    </tr>
                  ))
                : visibleCoins.map((coin) => (
                    <tr key={coin.id}>
                      <td>
                        <span className="coin-cell">
                          <img src={coin.image} alt="" width="28" height="28" />
                          <span>{coin.name}</span>
                        </span>
                      </td>
                      <td className="symbol-cell">{coin.symbol.toUpperCase()}</td>
                      <td className="numeric-cell">{formatPrice(coin.current_price)}</td>
                      <td className={`numeric-cell ${changeClassName(coin.price_change_percentage_24h)}`}>
                        {formatChange(coin.price_change_percentage_24h)}
                      </td>
                    </tr>
                  ))}
              {!isInitialLoading && visibleCoins.length === 0 && (
                <tr>
                  <td className="empty-table" colSpan="4">
                    No coin matched your search.
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

export default Dashboard
