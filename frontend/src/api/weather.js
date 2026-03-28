import api from './axios'

export const getTomorrowWeather = () => api.get('/weather/tomorrow/')
