import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BellRing,
  Copyright,
  Infinity as InfinityIcon,
  LineChart,
  ScrollText,
} from 'lucide-react'

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
  { value: null, icon: InfinityIcon, label: 'History stored' },
]

const FEATURES = [
  {
    icon: LineChart,
    title: 'Live price tracking',
    body: 'Top 100 crypto markets pulled from CoinGecko every 30 seconds. Filter by name, symbol, or CoinGecko ID.',
  },
  {
    icon: BellRing,
    title: 'Smart alert rules',
    body: 'Set price-above, price-below, change-above, or change-below conditions. Alerts fire once and log automatically.',
  },
  {
    icon: ScrollText,
    title: 'Alert history',
    body: 'Every triggered alert is logged with the exact price, threshold, 24h change, and timestamp for full auditability.',
  },
]

// OHLC candlestick data — uptrend with realistic retracements
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
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Activity size={16} strokeWidth={2.4} />
          </span>
          <span className="brand-name">CryptoAlert</span>
        </span>
        <nav className="home-nav">
          <Link to="/login" className="home-nav-login">Sign in</Link>
          <Link to="/register" className="home-nav-register">
            Get started
            <ArrowRight size={15} strokeWidth={2.2} />
          </Link>
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
                <span className="home-ticker-sep" aria-hidden="true" />
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
              Get started
              <ArrowRight size={16} strokeWidth={2.2} />
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
                {stat.icon ? (
                  <stat.icon size={36} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <>
                    {stat.value}
                    {stat.unit && <span className="home-stat-unit">{stat.unit}</span>}
                  </>
                )}
              </span>
              <span className="home-stat-label">{stat.label}</span>
            </div>
          ))}
        </section>

        <section className="home-features" aria-labelledby="features-label">
          <p className="home-features-label reveal" id="features-label">Core features</p>
          <div className="home-features-grid">
            {FEATURES.map((feature, i) => (
              <article
                key={feature.title}
                className="home-feature-card reveal"
                style={{ '--reveal-delay': `${0.05 + i * 0.1}s` }}
              >
                <span className="home-feature-icon" aria-hidden="true">
                  <feature.icon size={22} strokeWidth={1.8} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>
          <Copyright size={13} strokeWidth={2} aria-hidden="true" />
          2026 CryptoAlert
        </p>
      </footer>
    </div>
  )
}

export default Home
