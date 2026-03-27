import api from './axios'

export const register = (payload) => api.post('/auth/register/', payload)
export const login = (payload) => api.post('/auth/login/', payload)
export const getProfile = () => api.get('/auth/profile/')
export const updateProfile = (payload) => api.put('/auth/profile/', payload)
