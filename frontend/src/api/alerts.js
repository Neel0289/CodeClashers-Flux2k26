import api from './axios'

export const createSellFastAlert = (payload) => api.post('/alerts/sell-fast/', payload)

export const getSellFastAlerts = () => api.get('/alerts/sell-fast/')

export const buySellFastAlert = (alertId, payload) => api.post(`/alerts/sell-fast/${alertId}/buy/`, payload)
