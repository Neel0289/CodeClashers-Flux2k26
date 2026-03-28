import api from './axios'

export const getChatConversations = () => api.get('/chats/conversations/')

export const getChatMessages = (orderId) => api.get('/chats/messages/', { params: { order_id: orderId } })

export const sendChatMessage = ({ order_id, text }) => api.post('/chats/messages/', { order_id, text })
