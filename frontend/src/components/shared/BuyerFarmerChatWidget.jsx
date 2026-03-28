import { ChevronLeft, MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { getChatConversations, getChatMessages, sendChatMessage } from '../../api/chats'
import useAuth from '../../hooks/useAuth'

function formatTime(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

export default function BuyerFarmerChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [threadOpen, setThreadOpen] = useState(false)
  const messageListRef = useRef(null)

  const selectedConversation = useMemo(
    () => conversations.find((item) => String(item.order_id) === String(selectedOrderId)) || null,
    [conversations, selectedOrderId],
  )

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, row) => sum + (Number(row.unread_count) || 0), 0),
    [conversations],
  )

  const loadConversations = async ({ silent = false } = {}) => {
    if (!silent) {
      setConversationsLoading(true)
    }

    try {
      const { data } = await getChatConversations()
      const rows = Array.isArray(data) ? data : []
      setConversations(rows)
      if (!selectedOrderId && rows.length > 0) {
        setSelectedOrderId(rows[0].order_id)
      }
    } catch {
      if (!silent) {
        setError('Could not load chats right now.')
      }
    } finally {
      if (!silent) {
        setConversationsLoading(false)
      }
    }
  }

  const loadMessages = async (orderId, { silent = false } = {}) => {
    if (!orderId) return
    if (!silent) {
      setMessagesLoading(true)
    }

    try {
      const { data } = await getChatMessages(orderId)
      setMessages(Array.isArray(data) ? data : [])
      setError('')
    } catch {
      if (!silent) {
        setError('Could not load messages.')
      }
    } finally {
      if (!silent) {
        setMessagesLoading(false)
      }
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (!selectedOrderId) return
    loadMessages(selectedOrderId)
  }, [selectedOrderId])

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadConversations({ silent: true })
      if (selectedOrderId) {
        loadMessages(selectedOrderId, { silent: true })
      }
    }, 4000)

    return () => clearInterval(intervalId)
  }, [selectedOrderId])

  useEffect(() => {
    if (!messageListRef.current) return
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight
  }, [messages, open])

  const handleSend = async () => {
    const text = String(input || '').trim()
    if (!selectedOrderId || !text || sending) return

    setSending(true)
    setError('')
    try {
      await sendChatMessage({ order_id: selectedOrderId, text })
      setInput('')
      await Promise.all([
        loadMessages(selectedOrderId, { silent: true }),
        loadConversations({ silent: true }),
      ])
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  const handleOpenConversation = (orderId) => {
    setSelectedOrderId(orderId)
    setThreadOpen(true)
    setInput('')
    setError('')
  }

  const handleBackToList = () => {
    setThreadOpen(false)
    setInput('')
    setError('')
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 left-4 z-[1200] flex h-[34rem] w-[22rem] flex-col overflow-hidden rounded-[16px] border border-border bg-white shadow-2xl md:left-6 md:w-[24rem]">
          <div className="flex items-center justify-between border-b border-border bg-emerald-700 px-3 py-2 text-white">
            <div>
              <p className="text-sm font-semibold">Buyer-Farmer Chat</p>
              <p className="text-[11px] text-emerald-100">WhatsApp-style live conversation</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-emerald-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 bg-white">
            {!threadOpen && (
              <div className="h-full overflow-y-auto bg-surface-2">
                {conversationsLoading && <p className="p-3 text-xs text-text-muted">Loading chats...</p>}
                {!conversationsLoading && conversations.length === 0 && (
                  <p className="p-3 text-xs text-text-muted">No shared orders yet. Create an order to start chatting.</p>
                )}
                {conversations.map((conv) => (
                  <button
                    key={conv.order_id}
                    type="button"
                    onClick={() => handleOpenConversation(conv.order_id)}
                    className="w-full border-b border-border bg-white px-3 py-3 text-left hover:bg-emerald-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-text-primary">{conv.other_user_name}</p>
                      {Number(conv.unread_count) > 0 && (
                        <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-muted">Order #{conv.order_id} • {conv.product_name}</p>
                    <p className="truncate text-xs text-text-muted">{conv.last_message || 'No messages yet'}</p>
                  </button>
                ))}
              </div>
            )}

            {threadOpen && selectedConversation && (
              <div className="grid h-full min-h-0 grid-rows-[auto,1fr,auto]">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="rounded p-1 text-text-muted hover:bg-surface-2 hover:text-text-primary"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{selectedConversation.other_user_name}</p>
                    <p className="text-xs text-text-muted">Order #{selectedConversation.order_id} • {selectedConversation.product_name}</p>
                  </div>
                </div>

                <div ref={messageListRef} className="min-h-0 space-y-2 overflow-y-auto bg-white p-2">
                  {messagesLoading && <p className="text-xs text-text-muted">Loading messages...</p>}
                  {!messagesLoading && messages.length === 0 && (
                    <p className="text-xs text-text-muted">Start the conversation by sending a message below.</p>
                  )}
                  {messages.map((msg) => {
                    const mine = Number(msg.sender) === Number(user?.id)
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-[12px] px-3 py-2 text-xs ${mine ? 'bg-emerald-600 text-white' : 'bg-surface-2 text-text-primary'}`}>
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-emerald-100' : 'text-text-muted'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-border bg-white p-2">
                  {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
                  <div className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder={`Message ${selectedConversation.other_user_name}...`}
                      className="flex-1 rounded-[10px] border border-border px-2 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !input.trim()}
                      className="rounded-[10px] bg-emerald-700 p-2 text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-4 left-4 z-[1200] flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-800 md:left-6"
      >
        <MessageCircle className="h-4 w-4" />
        Chat
        {unreadTotal > 0 && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{unreadTotal}</span>
        )}
      </button>
    </>
  )
}
