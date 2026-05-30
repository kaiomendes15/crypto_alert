import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const TICKER_COINS = [
  { symbol: 'BTC', price: '$104,230', change: '+2.41%', positive: true },
  { symbol: 'ETH', price: '$2,840', change: '-0.83%', positive: false },
  { symbol: 'SOL', price: '$168.20', change: '+5.12%', positive: true },
  { symbol: 'BNB', price: '$612.30', change: '+1.24%', positive: true },
  { symbol: 'XRP', price: '$0.582', change: '-1.07%', positive: false },
  { symbol: 'ADA', price: '$0.441', change: '+3.20%', positive: true },
  { symbol: 'DOGE', price: '$0.184', change: '+7.55%', positive: true },
  { symbol: 'AVAX', price: '$28.90', change: '-2.10%', positive: false },
  { symbol: 'DOT', price: '$6.72', change: '+0.88%', positive: true },
  { symbol: 'LINK', price: '$14.20', change: '-0.42%', positive: false },
]

const STATS = [
  { value: '100', unit: '+', label: 'Assets tracked' },
  { value: '30', unit: 's', label: 'Price refresh' },
  { value: '4', unit: '', label: 'Alert conditions' },
  { value: '∞', unit: '', label: 'History stored' },
]

// OHLC candlestick data — uptrend with realistic retracements
// bodyBottom: px from chart bottom, bodyH: body height, wicks in px
const CANDLES = [
  { type: 'bear', left: 0,   bodyBottom: 22,  bodyH: 42, wickTop: 12, wickBottom: 9  },
  { type: 'bull', left: 40,  bodyBottom: 40,  bodyH: 56, wickTop: 20, wickBottom: 11 },
  { type: 'bear', left: 80,  bodyBottom: 74,  bodyH: 34, wickTop: 16, wickBottom: 10 },
  { type: 'bull', left: 120, bodyBottom: 84,  bodyH: 64, wickTop: 22, wickBottom: 8  },
  { type: 'bull', left: 160, bodyBottom: 130, bodyH: 48, wickTop: 18, wickBottom: 14 },
  { type: 'bear', left: 200, bodyBottom: 150, bodyH: 30, wickTop: 20, wickBottom: 10 },
  { type: 'bull', left: 240, bodyBottom: 162, bodyH: 58, wickTop: 24, wickBottom: 12 },
  { type: 'bull', left: 280, bodyBottom: 198, bodyH: 44, wickTop: 16, wickBottom: 9  },
]

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    const elements = document.querySelectorAll('.reveal')
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function Home() {
  useScrollReveal()

  return (
    <div className="home">
      <header className="home-header">
        <span className="home-logo">CryptoAlert</span>
        <nav className="home-nav">
          <Link to="/login" className="home-nav-login">Sign in</Link>
          <Link to="/register" className="home-nav-register">Get started</Link>
        </nav>
      </header>

      <div className="home-ticker" aria-label="Sample market data">
        <div className="home-ticker-badge">
          <span className="home-ticker-dot" aria-hidden="true" />
          LIVE
        </div>
        <div className="home-ticker-overflow">
          <div className="home-ticker-track">
            {[...TICKER_COINS, ...TICKER_COINS].map((coin, i) => (
              <span key={i} className="home-ticker-item">
                <span className="home-ticker-symbol">{coin.symbol}</span>
                <span className="home-ticker-price">{coin.price}</span>
                <span className={`home-ticker-change ${coin.positive ? 'is-positive' : 'is-negative'}`}>
                  {coin.change}
                </span>
                <span className="home-ticker-sep" aria-hidden="true">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <main className="home-main">
        <section className="home-hero" aria-labelledby="hero-headline">

          {/* CSS candlestick chart — pure CSS, no images */}
          <div className="home-hero-visual" aria-hidden="true">
            <div className="hv-glow" />
            <div className="hv-grid" />
            {CANDLES.map((c, i) => (
              <div
                key={i}
                className={`hv-candle hv-candle--${c.type}`}
                style={{
                  '--c-left':         `${c.left}px`,
                  '--c-bottom':       `${c.bodyBottom}px`,
                  '--c-height':       `${c.bodyH}px`,
                  '--c-wick-top':     `${c.wickTop}px`,
                  '--c-wick-bottom':  `${c.wickBottom}px`,
                }}
              />
            ))}
            <div className="hv-scan" />
            <div className="hv-baseline" />
          </div>

          <div className="home-hero-content">
            <p className="eyebrow home-anim-eyebrow">Real-time crypto intelligence</p>
            <h1 id="hero-headline" className="home-headline home-anim-headline">
              Monitor crypto.<br />
              Get notified.<br />
              Stay ahead.
            </h1>
            <p className="home-subheadline home-anim-sub">
              Define price and 24h change conditions for any asset.
              Receive email notifications the moment your thresholds are crossed.
            </p>
            <Link to="/register" className="home-cta home-anim-cta">
              Get started →
            </Link>
          </div>
        </section>

        <section className="home-stats" aria-label="Platform statistics">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="home-stat reveal"
              style={{ '--reveal-delay': `${i * 0.1}s` }}
            >
              <span className="home-stat-value">
                {stat.value}
                {stat.unit && <span className="home-stat-unit">{stat.unit}</span>}
              </span>
              <span className="home-stat-label">{stat.label}</span>
            </div>
          ))}
        </section>

        <section className="home-features" aria-labelledby="features-label">
          <p className="home-features-label reveal" id="features-label">Core features</p>
          <div className="home-features-grid">
            <article className="home-feature-card reveal" style={{ '--reveal-delay': '0.05s' }}>
              <svg className="home-feature-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="1" />
                <polyline points="5,16 9,10 13,13 19,7" stroke="currentColor" strokeWidth="1" fill="none" />
                <circle cx="19" cy="7" r="1.5" fill="currentColor" />
              </svg>
              <h3>Live Price Tracking</h3>
              <p>
                Top 100 crypto markets pulled from CoinGecko every 30 seconds.
                Filter by name, symbol, or CoinGecko ID.
              </p>
            </article>

            <article className="home-feature-card reveal" style={{ '--reveal-delay': '0.15s' }}>
              <svg className="home-feature-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polygon points="12,3 22,20 2,20" stroke="currentColor" strokeWidth="1" fill="none" />
                <line x1="12" y1="9" x2="12" y2="14" stroke="currentColor" strokeWidth="1" />
                <circle cx="12" cy="17" r="0.8" fill="currentColor" />
              </svg>
              <h3>Smart Alert Rules</h3>
              <p>
                Set <code>price_above</code>, <code>price_below</code>, <code>change_above</code>,
                or <code>change_below</code> conditions. Alerts fire once and log automatically.
              </p>
            </article>

            <article className="home-feature-card reveal" style={{ '--reveal-delay': '0.25s' }}>
              <svg className="home-feature-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="1" />
                <line x1="4" y1="9" x2="20" y2="9" stroke="currentColor" strokeWidth="1" />
                <line x1="4" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="1" />
                <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="1" />
              </svg>
              <h3>Alert History</h3>
              <p>
                Every triggered alert is logged with the exact price, threshold,
                24h change, and timestamp for full auditability.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>© 2026 CryptoAlert</p>
      </footer>
    </div>
  )
}

export default Home
