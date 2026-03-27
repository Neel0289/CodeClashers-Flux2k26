import api from './axios'

export const getPartners = (params) => api.get('/logistics/partners/', { params })
export const createLogisticsRequest = (payload) => api.post('/logistics/request/', payload)
export const getLogisticsRequests = () => api.get('/logistics/requests/')
export const getLogisticsRequest = (id) => api.get(`/logistics/requests/${id}/`)
export const quoteRequest = (id, payload) => api.post(`/logistics/requests/${id}/quote/`, payload)
export const acceptRequest = (id) => api.post(`/logistics/requests/${id}/accept/`)
export const pickupRequest = (id) => api.patch(`/logistics/requests/${id}/pickup/`)
export const deliverRequest = (id) => api.patch(`/logistics/requests/${id}/deliver/`)
