import api from './axios'

export const getOrders = () => api.get('/orders/')
export const getOrder = (id) => api.get(`/orders/${id}/`)
export const setOrderLocations = (id, payload) => api.post(`/orders/${id}/set-locations/`, payload)
export const updateOrderStatus = (id, payload) => api.patch(`/orders/${id}/status/`, payload)
