import api from './axios'

export const payOrder = (orderId) => api.post(`/payments/pay/${orderId}/`)
export const releasePayment = (orderId) => api.post(`/payments/release/${orderId}/`)
export const getPayment = (orderId) => api.get(`/payments/${orderId}/`)
export const createOrderCheckout = (orderId) => api.post(`/payments/checkout/create/${orderId}/`)
export const verifyOrderCheckout = (orderId, payload) => api.post(`/payments/checkout/verify/${orderId}/`, payload)
export const createLogisticsCheckout = (requestId) => api.post(`/payments/logistics/checkout/create/${requestId}/`)
export const verifyLogisticsCheckout = (requestId, payload) => api.post(`/payments/logistics/checkout/verify/${requestId}/`, payload)
