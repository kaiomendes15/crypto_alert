import axios from 'axios'
const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const baseURL = rawBaseUrl.replace(/\/$/, '').endsWith('/api/v1')
  ? rawBaseUrl.replace(/\/$/, '')
  : `${rawBaseUrl.replace(/\/$/, '')}/api/v1`

const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crypto_alert_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
