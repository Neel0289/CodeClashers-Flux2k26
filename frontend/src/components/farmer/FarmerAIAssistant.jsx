import { useMemo, useState } from 'react'
import { Bot, MessageCircle, Send, X } from 'lucide-react'

import { chatWithFarmerAssistant } from '../../api/assistant'

const quickPrompts = [
  'Which crop should I grow next month in my area?',
  'What does tomorrow weather imply for my pricing?',
  'How do I request logistics for an order?',
]

export default function FarmerAIAssistant() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Namaste! I can suggest what crop to grow next using weather and nearby demand, and I can guide you on using this app. Ask me anything.',
    },
  ])

  const historyPayload = useMemo(() => {
    return messages.map((msg) => ({ role: msg.role, content: msg.content }))
  }, [messages])

  const sendMessage = async (raw) => {
    const message = String(raw || '').trim()
    if (!message || loading) return

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: message }
    setMessages((prev) => [...prev, userMsg])
    setText('')
    setLoading(true)

    try {
      const { data } = await chatWithFarmerAssistant({
        message,
        history: historyPayload.slice(-8),
      })
      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data?.reply || 'I could not generate a response right now.',
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const detail = err?.response?.data?.detail
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: detail || 'Assistant is currently unavailable. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      {open ? (
        <div className="w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <p className="text-sm font-semibold">Farmer AI Assistant</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-y-auto bg-slate-50 p-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'ml-8 bg-emerald-600 text-white' : 'mr-8 bg-white text-slate-800 border border-slate-200'}`}>
                {msg.content}
              </div>
            ))}
            {loading ? <p className="text-xs text-slate-500">Thinking...</p> : null}
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage(text)
                  }
                }}
                placeholder="Ask about crops, weather, demand, or app usage..."
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={loading || !text.trim()}
                onClick={() => sendMessage(text)}
                className="rounded-xl bg-emerald-700 p-2 text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-800"
        >
          <MessageCircle className="h-4 w-4" />
          AI Crop Assistant
        </button>
      ) : null}
    </div>
  )
}
