import api from './axios'

export const getMarketPrices = (params = {}) => api.get('/market-prices/', { params })
export const getMarketCommodities = () => api.get('/market-prices/commodities/')
export const compareMarketPrice = (params) => api.get('/market-prices/compare/', { params })
