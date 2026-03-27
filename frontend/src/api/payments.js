import api from './axios'

export const payOrder = (orderId) => api.post(`/payments/pay/${orderId}/`)
export const releasePayment = (orderId) => api.post(`/payments/release/${orderId}/`)
export const getPayment = (orderId) => api.get(`/payments/${orderId}/`)
