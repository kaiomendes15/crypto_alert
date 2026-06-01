import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

const DISPLAY_LIMIT = 40

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatPrice(value) {
  return priceFormatter.format(value)
}

function Watchlist() {
  const navigate = useNavigate()
  const [coins, setCoins] = useState([])
  const [watchlistItems, setWatchlistItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingCoinId, setPendingCoinId] = useState('')
  const [error, setError] = useState('')

  const watchedCoinIds = useMemo(
    () => new Set(watchlistItems.map((item) => item.coin_id)),
    [watchlistItems],
  )
  const normalisedSearch = searchQuery.trim().toLowerCase()
  const visibleCoins = normalisedSearch
    ? coins.filter((coin) =>
        [coin.id, coin.name, coin.symbol].some((value) =>
          value.toLowerCase().includes(normalisedSearch),
        ),
      )
    : coins.slice(0, DISPLAY_LIMIT)

  useEffect(() => {
    let isMounted = true

    async function loadWatchlistPage() {
      try {
        const [marketsResponse, watchlistResponse] = await Promise.all([
          api.get('/coins/markets'),
          api.get('/watchlist'),
        ])

        if (!isMounted) {
          return
        }

        setCoins(marketsResponse.data)
        setWatchlistItems(watchlistResponse.data)
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

        setError(requestError.response?.data?.detail || 'Unable to load watchlist.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadWatchlistPage()

    return () => {
      isMounted = false
    }
  }, [navigate])

  async function addCoin(coinId) {
    const previousItems = watchlistItems
    setPendingCoinId(coinId)
    setError('')
    setWatchlistItems((currentItems) => [
      { id: `pending-${coinId}`, coin_id: coinId, added_at: new Date().toISOString() },
      ...currentItems,
    ])

    try {
      const { data } = await api.post('/watchlist', { coin_id: coinId })
      setWatchlistItems((currentItems) =>
        currentItems.map((item) => (item.coin_id === coinId ? data : item)),
      )
    } catch (requestError) {
      setWatchlistItems(previousItems)

      if (requestError.response?.status === 401) {
        localStorage.removeItem('crypto_alert_token')
        navigate('/login', { replace: true })
        return
      }

      setError(requestError.response?.data?.detail || 'Unable to add this coin.')
    } finally {
      setPendingCoinId('')
    }
  }

  async function removeCoin(coinId) {
    const previousItems = watchlistItems
    setPendingCoinId(coinId)
    setError('')
    setWatchlistItems((currentItems) => currentItems.filter((item) => item.coin_id !== coinId))

    try {
      await api.delete(`/watchlist/${coinId}`)
    } catch (requestError) {
      setWatchlistItems(previousItems)

      if (requestError.response?.status === 401) {
        localStorage.removeItem('crypto_alert_token')
        navigate('/login', { replace: true })
        return
      }

      setError(requestError.response?.data?.detail || 'Unable to remove this coin.')
    } finally {
      setPendingCoinId('')
    }
  }

  function handleSignOut() {
    localStorage.removeItem('crypto_alert_token')
    navigate('/login', { replace: true })
  }

  return (
    <main className="dashboard-shell">
      <section className="market-dashboard" aria-labelledby="watchlist-title">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">CryptoAlert</p>
            <h1 id="watchlist-title">Watchlist</h1>
            <p>Search markets and choose the coins you want to monitor.</p>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-button nav-link" to="/dashboard">
              Dashboard
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

        <div className="dashboard-toolbar">
          <label htmlFor="watchlist-search">Search coin</label>
          <input
            id="watchlist-search"
            name="watchlist-search"
            type="search"
            placeholder="bitcoin, btc, ethereum"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <span className="result-count">
            {isLoading ? 'Loading markets' : `${visibleCoins.length} shown`}
          </span>
          <span className="result-count">{watchlistItems.length} watched</span>
        </div>

        <div className="market-table-wrap">
          <table className="market-table">
            <thead>
              <tr>
                <th scope="col">Coin</th>
                <th scope="col">Symbol</th>
                <th scope="col">Price</th>
                <th scope="col">Watchlist</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 20 }, (_, index) => (
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
                : visibleCoins.map((coin) => {
                    const isWatched = watchedCoinIds.has(coin.id)
                    const isPending = pendingCoinId === coin.id

                    return (
                      <tr key={coin.id}>
                        <td>
                          <span className="coin-cell">
                            <img src={coin.image} alt="" width="28" height="28" />
                            <span>{coin.name}</span>
                          </span>
                        </td>
                        <td className="symbol-cell">{coin.symbol.toUpperCase()}</td>
                        <td className="numeric-cell">{formatPrice(coin.current_price)}</td>
                        <td>
                          <button
                            type="button"
                            className={isWatched ? 'table-action remove-action' : 'table-action'}
                            disabled={isPending}
                            onClick={() => (isWatched ? removeCoin(coin.id) : addCoin(coin.id))}
                          >
                            {isWatched ? 'Remove' : 'Add'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              {!isLoading && visibleCoins.length === 0 && (
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

export default Watchlist
