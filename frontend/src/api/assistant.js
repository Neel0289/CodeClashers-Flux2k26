import api from './axios'

export const chatWithFarmerAssistant = ({ message, history = [] }) => api.post('/market-prices/assistant/chat/', {
  message,
  history,
})
