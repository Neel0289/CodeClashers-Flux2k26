import api from './axios'

export const createReview = (payload) => api.post('/reviews/', payload)
export const getReviews = (userId) => api.get('/reviews/', { params: { user_id: userId } })
