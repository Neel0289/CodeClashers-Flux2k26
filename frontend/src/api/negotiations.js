import api from './axios'

export const getNegotiations = () => api.get('/negotiations/')
export const getNegotiation = (id) => api.get(`/negotiations/${id}/`)
export const createNegotiation = (payload) => api.post('/negotiations/', payload)
export const respondNegotiation = (id, payload) => api.post(`/negotiations/${id}/respond/`, payload)
