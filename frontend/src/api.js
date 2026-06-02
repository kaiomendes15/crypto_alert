import axios from 'axios'
const rawBaseUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : 'https://crypto-alert-api-sn2o.onrender.com')
const normalizedBaseUrl = rawBaseUrl.includes('://') ? rawBaseUrl : `https://${rawBaseUrl}`
const baseURL = normalizedBaseUrl.replace(/\/$/, '').endsWith('/api/v1')
  ? normalizedBaseUrl.replace(/\/$/, '')
  : `${normalizedBaseUrl.replace(/\/$/, '')}/api/v1`

const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crypto_alert_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
