import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Check, Plus, Search, Star } from 'lucide-react'
import api from '../api'
import PageHeader from '../components/PageHeader'

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

  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Watchlist"
        subtitle="Search markets and choose the coins you want to monitor."
      >
        <span className="status-pill">
          <Star size={13} strokeWidth={2} />
          {watchlistItems.length} watched
        </span>
      </PageHeader>

      {error && (
        <p className="alert-banner" role="alert">
          <AlertCircle size={16} strokeWidth={2} />
          {error}
        </p>
      )}

      <section className="panel">
        <div className="toolbar">
          <div className="input-wrap toolbar-search">
            <Search size={16} strokeWidth={2} className="input-icon" aria-hidden="true" />
            <input
              id="watchlist-search"
              name="watchlist-search"
              type="search"
              aria-label="Search coin"
              placeholder="Search bitcoin, btc, ethereum…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <span className="result-count">
            {isLoading ? 'Loading…' : `${visibleCoins.length} shown`}
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Coin</th>
                <th scope="col" className="col-right">Price</th>
                <th scope="col" className="col-right">Watchlist</th>
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
                      <td className="col-right">
                        <span className="skeleton-line medium" />
                      </td>
                      <td className="col-right">
                        <span className="skeleton-line short" />
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
                            <img src={coin.image} alt="" width="30" height="30" loading="lazy" />
                            <span className="coin-cell-text">
                              <span className="coin-name">{coin.name}</span>
                              <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
                            </span>
                          </span>
                        </td>
                        <td className="num col-right">{formatPrice(coin.current_price)}</td>
                        <td className="col-right">
                          <button
                            type="button"
                            className={`btn btn-sm ${isWatched ? 'btn-danger-ghost' : 'btn-ghost'}`}
                            disabled={isPending}
                            onClick={() => (isWatched ? removeCoin(coin.id) : addCoin(coin.id))}
                          >
                            {isWatched ? (
                              <>
                                <Check size={14} strokeWidth={2.2} />
                                Watching
                              </>
                            ) : (
                              <>
                                <Plus size={14} strokeWidth={2.2} />
                                Add
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              {!isLoading && visibleCoins.length === 0 && (
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

export default Watchlist
