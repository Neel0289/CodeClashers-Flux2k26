import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, X, Volume2, CheckCircle, RotateCcw } from 'lucide-react'
import { PRODUCT_OPTIONS } from './productCatalog'

const PRODUCT_ALIASES = {
  vegetables: {
    Tomato: ['ટામેટા', 'ટમેટા', 'टमाटर', 'tamatar'],
    Onion: ['ડુંગળી', 'કાંદા', 'प्याज़', 'pyaz', 'kanda'],
    Potato: ['બટેટા', 'બટાકા', 'આલુ', 'आलू', 'aloo', 'batata'],
    Cabbage: ['કોબીજ', 'કોબી', 'पत गोभी', 'patta gobhi'],
    Cauliflower: ['ફૂલેવર', 'ફૂલગોભી', 'फूलगोभी', 'phool gobhi'],
    Carrot: ['ગાજર', 'गाजर', 'gajar'],
    Beetroot: ['ચુકંદર', 'चुकंदर', 'beet root'],
    Spinach: ['પાલક', 'पालक'],
    Coriander: ['ધાણા', 'हरा धनिया', 'dhania', 'coriander leaves'],
    Brinjal: ['રીંગણ', 'બેંગન', 'बैंगन', 'baingan', 'eggplant'],
    Capsicum: ['શિમલા મરચા', 'शिमला मिर्च', 'shimla mirch', 'bell pepper'],
    'Green Chilli': ['લીલા મરચા', 'हरी मिर्च', 'hari mirch', 'mirchi'],
    Cucumber: ['કાકડી', 'खीरा', 'kheera'],
    Pumpkin: ['કોળું', 'कद्दू', 'kaddu'],
    'Bottle Gourd': ['દૂધી', 'लौकी', 'lauki', 'dudhi'],
    Ladyfinger: ['ભીંડા', 'भिंडी', 'bhindi', 'okra'],
    Peas: ['વટાણા', 'मटर', 'matar'],
    Radish: ['મૂળા', 'मूली', 'mooli'],
  },
  fruits: {
    Banana: ['કેળા', 'કેળું', 'केला', 'kela'],
    Apple: ['સફરજન', 'सेब', 'seb'],
    Mango: ['કેરી', 'आम', 'aam'],
    Orange: ['નારંગી', 'संतरा', 'santra'],
    Grapes: ['દ્રાક્ષ', 'अंगूर', 'angoor'],
    Pomegranate: ['દાડમ', 'अनार', 'anar'],
    Papaya: ['પપૈયું', 'पपीता', 'papita'],
    Watermelon: ['તરબૂચ', 'तरबूज', 'tarbooj'],
    Muskmelon: ['ખરબૂજ', 'खरबूजा', 'kharbuja'],
    Guava: ['જામફળ', 'अमरूद', 'amrood'],
    Pineapple: ['અનાનસ', 'अनानास', 'ananas'],
    Lemon: ['લીંબુ', 'नींबू', 'nimbu'],
    'Sweet Lime': ['મોસંબી', 'मौसंबी', 'mosambi'],
    Strawberry: ['સ્ટ્રોબેરી', 'स्ट्रॉबेरी'],
    Pear: ['નાશપતી', 'नाशपाती', 'nashpati'],
    Litchi: ['લીચી', 'लीची'],
  },
  grains: {
    Wheat: ['ઘઉં', 'गेहूं', 'gehun'],
    Rice: ['ચોખા', 'चावल', 'chawal'],
    Maize: ['મકાઈ', 'मक्का', 'makka', 'corn'],
    Barley: ['જૌ', 'जौ', 'jau'],
    Bajra: ['બાજરી', 'बाजरा'],
    Jowar: ['જવાર', 'ज्वार'],
    Ragi: ['રાગી', 'रागी', 'nachni'],
    Oats: ['ओट्स'],
    'Millet Mix': ['મિલેટ', 'millet'],
    Chickpea: ['ચણા', 'चना', 'chana'],
    Lentils: ['દાળ', 'दाल', 'dal'],
    'Pigeon Pea': ['તુવેર', 'अरहर', 'toor', 'tur'],
    'Green Gram': ['મૂંગ', 'मूंग', 'moong'],
    'Black Gram': ['ઉડદ', 'उड़द', 'urad'],
  },
  spices: {
    Turmeric: ['હળદર', 'हल्दी', 'haldi'],
    Cumin: ['જીરું', 'जीरा', 'jeera'],
    'Coriander Seeds': ['ધાણા બીજ', 'धनिया बीज', 'coriander seed'],
    'Mustard Seeds': ['રાઈ', 'सरसों', 'rai', 'sarso'],
    Fenugreek: ['મેથી', 'मेथी', 'methi'],
    Cardamom: ['એલચી', 'इलायची', 'elaichi'],
    'Black Pepper': ['કાળી મરી', 'काली मिर्च', 'kali mirch'],
    Clove: ['લવિંગ', 'लौंग', 'laung'],
    Cinnamon: ['દાલચિની', 'दालचीनी'],
    'Dry Red Chilli': ['સુકા લાલ મરચા', 'सूखी लाल मिर्च'],
    'Bay Leaf': ['તેજ પાન', 'तेज पत्ता', 'tej patta'],
    Fennel: ['સોફ', 'सौंफ', 'saunf'],
    Ajwain: ['અજમો', 'अजवाइन'],
    Ginger: ['આદુ', 'अदरक', 'adrak'],
    Garlic: ['લસણ', 'लहसुन', 'lehsun'],
  },
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildProductsMap() {
  const map = {}
  for (const [category, products] of Object.entries(PRODUCT_OPTIONS)) {
    map[category] = {}
    for (const productName of products) {
      const aliases = new Set([
        productName,
        productName.toLowerCase(),
        productName.replace(/\s+/g, ''),
      ])

      const customAliases = PRODUCT_ALIASES?.[category]?.[productName] || []
      for (const alias of customAliases) aliases.add(alias)

      map[category][productName] = Array.from(aliases)
    }
  }
  return map
}

const ALL_PRODUCTS_MAP = buildProductsMap()

function findBestProductMatch(text) {
  if (!text) return { name: text, category: null }
  const query = normalizeText(text)
  
  for (const [cat, products] of Object.entries(ALL_PRODUCTS_MAP)) {
    for (const [engName, synonyms] of Object.entries(products)) {
      if (synonyms.some((s) => {
        const normalizedAlias = normalizeText(s)
        return normalizedAlias && (query.includes(normalizedAlias) || normalizedAlias.includes(query))
      })) {
         return { name: engName, category: cat }
      }
    }
  }
  return { name: text, category: null }
}

// ─── Language options ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'en-US', label: 'English' },
]

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = ['name', 'description', 'qty', 'price', 'confirm']

const STEP_LABELS = {
  name:        'Product Name',
  description: 'Description',
  qty:         'Quantity',
  price:       'Price per kg',
  confirm:     'Confirm',
}

// ─── Language strings ─────────────────────────────────────────────────────────
const PROMPTS = {
  'gu-IN': {
    intro:       'ચાલો ઉત્પાદન ઉમેરીએ.',
    name:        'તમે કયું શાકભાજી ઉમેરવા માંગો છો?',
    description: 'આ ઉત્પાદન વિશે વર્ણન કરો.',
    qty:         'કેટલી માત્રા ઉપલબ્ધ છે?',
    price:       'કિલો દીઠ ભાવ શું છે?',
    confirm:     (f) => `તમે ${f.qty} કિલો ${f.name}, ₹${f.price} ના ભાવે ઉમેર્યા છે. ખાતરી કરો? "હા" અથવા "ના" બોલો.`,
    stepDone:    (label, val) => `${label}: ${val}`,
    yes:         ['હા', 'हाँ', 'yes', 'ha', 'haa', 'ok'],
    no:          ['ના', 'नहीं', 'no', 'naa', 'cancel'],
    retry:       'સમજાયું નહીં. ફરીથી બોલો.',
    done:        'ઉત્પાદન ઉમેરાઈ ગયું!',
  },
  'hi-IN': {
    intro:       'चलिए उत्पाद जोड़ते हैं।',
    name:        'आप कौन सा उत्पाद जोड़ना चाहते हैं?',
    description: 'इस उत्पाद का वर्णन करें।',
    qty:         'कितनी मात्रा उपलब्ध है?',
    price:       'प्रति किलो दाम क्या है?',
    confirm:     (f) => `आपने ${f.qty} किलो ${f.name}, ₹${f.price} प्रति किलो जोड़ा है। क्या यह सही है? "हाँ" या "नहीं" बोलें।`,
    stepDone:    (label, val) => `${label}: ${val}`,
    yes:         ['हाँ', 'ha', 'haan', 'yes', 'ji', 'sahi', 'bilkul'],
    no:          ['नहीं', 'nahi', 'no', 'na', 'cancel'],
    retry:       'समझ नहीं आया। फिर से बोलें।',
    done:        'उत्पाद जोड़ दिया गया है!',
  },
  'en-US': {
    intro:       'Let\'s add a product.',
    name:        'What product do you want to add?',
    description: 'Please describe the product.',
    qty:         'What is the quantity available?',
    price:       'What is the price per kilogram?',
    confirm:     (f) => `Adding ${f.qty} kg of ${f.name} at ₹${f.price} per kg. Confirm? Say yes or no.`,
    stepDone:    (label, val) => `${label}: ${val}`,
    yes:         ['yes', 'ya', 'yep', 'sure', 'correct', 'right', 'confirm'],
    no:          ['no', 'nope', 'cancel', 'stop', 'restart'],
    retry:       'Could not understand. Please repeat.',
    done:        'Product added successfully!',
  },
}

const WORD_NUMBERS = {
  'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5, 'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10,
  'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'chhe': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
}

function parseNumber(text) {
  if (!text) return ''
  const trimmed = text.trim()
  const numericOnly = trimmed.replace(/[^\d.]/g, '')
  const direct = Number(numericOnly)
  if (!isNaN(direct) && direct > 0) return String(direct)
  const lower = trimmed.toLowerCase()
  const entry = Object.entries(WORD_NUMBERS).find(([word]) => lower.includes(word))
  if (entry) return String(entry[1])
  return trimmed
}


function speak(text, lang, onEnd, onError) {
  const safeEnd = () => {
    if (typeof onEnd === 'function') onEnd()
  }

  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    if (typeof onError === 'function') {
      onError('Speech output is not supported in this browser.')
    }
    setTimeout(safeEnd, 0)
    return
  }

  try {
    window.speechSynthesis.cancel()
    window.speechSynthesis.resume()

    const utter = new SpeechSynthesisUtterance(String(text || ''))
    utter.lang = lang
    utter.rate = 0.95
    utter.pitch = 1
    utter.volume = 1

    const voices = window.speechSynthesis.getVoices() || []
    const exactVoice = voices.find((voice) => voice.lang?.toLowerCase() === String(lang).toLowerCase())
    const baseVoice = voices.find((voice) => {
      const wanted = String(lang).split('-')[0]?.toLowerCase()
      return voice.lang?.toLowerCase().startsWith(wanted)
    })
    utter.voice = exactVoice || baseVoice || null

    utter.onend = safeEnd
    utter.onerror = () => {
      if (typeof onError === 'function') {
        onError('Could not play voice prompt. Check device volume and browser sound permissions.')
      }
      safeEnd()
    }

    window.speechSynthesis.speak(utter)
  } catch {
    if (typeof onError === 'function') {
      onError('Voice playback failed. Please try again.')
    }
    setTimeout(safeEnd, 0)
  }
}

function createRecognition(lang) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const r = new SR()
  r.lang = lang
  r.interimResults = true
  r.continuous = false
  return r
}

export default function VoiceFormAssistant({ onFill, onClose }) {
  const [lang, setLang] = useState('gu-IN')
  const [step, setStep] = useState(-1)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [question, setQuestion] = useState('Tap Mic to Start')
  const [data, setData] = useState({ name: '', description: '', qty: '', price: '' })
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const recogRef = useRef(null)

  const stopAll = useCallback(() => {
    window.speechSynthesis?.cancel()
    if (recogRef.current) {
      try { recogRef.current.stop() } catch (_) {}
      recogRef.current = null
    }
    setListening(false)
  }, [])

  const testVoice = () => {
    const sample = {
      'gu-IN': 'આ અવાજ ચકાસણી છે. તમે મને સાંભળી શકો છો?',
      'hi-IN': 'यह आवाज जांच है। क्या आप मुझे सुन पा रहे हैं?',
      'en-US': 'This is a voice check. Can you hear me?',
    }
    setError('')
    speak(sample[lang] || sample['en-US'], lang, null, (msg) => setError(msg))
  }

  useEffect(() => () => stopAll(), [stopAll])

  const processAnswer = useCallback((raw, currentStep, currentLang, currentData) => {
    const s = PROMPTS[currentLang]
    const stepKey = STEPS[currentStep]

    if (stepKey === 'confirm') {
      const lower = raw.toLowerCase()
      if (s.yes.some((y) => lower.includes(y))) {
        setDone(true)
        setQuestion(s.done)
        speak(s.done, currentLang)
        onFill(currentData)
        return
      }
      if (s.no.some((n) => lower.includes(n))) {
        setStep(0)
        setData({ name: '', description: '', qty: '', price: '' })
        goToStep(0, currentLang, { name: '', description: '', qty: '', price: '' })
        return
      }
      speak(s.retry, currentLang, () => listenForAnswer(currentStep, currentLang, currentData))
      return
    }

    let value = raw.trim()
    if (stepKey === 'qty' || stepKey === 'price') value = parseNumber(raw)
    
    let updatedData = { ...currentData, [stepKey]: value }
    if (stepKey === 'name') {
      const match = findBestProductMatch(raw)
      updatedData = { ...updatedData, name: match.name, category: match.category }
    }

    setData(updatedData)
    const nextIdx = currentStep + 1
    setStep(nextIdx)
    goToStep(nextIdx, currentLang, updatedData)
  }, [onFill])

  const listenForAnswer = useCallback((currentStep, currentLang, currentData) => {
    const recog = createRecognition(currentLang)
    if (!recog) return
    recogRef.current = recog
    recog.onstart = () => setListening(true)
    recog.onend = () => setListening(false)
    recog.onresult = (event) => {
      const result = event.results[event.results.length - 1]
      const raw = result[0].transcript
      setTranscript(raw)
      if (result.isFinal) processAnswer(raw, currentStep, currentLang, currentData)
    }
    try { recog.start() } catch (_) {}
  }, [processAnswer])

  const goToStep = useCallback((idx, currentLang, currentData) => {
    const s = PROMPTS[currentLang]
    const key = STEPS[idx]
    const q = key === 'confirm' ? s.confirm(currentData) : s[key]
    setStep(idx)
    setQuestion(q)
    speak(q, currentLang, () => listenForAnswer(idx, currentLang, currentData), (msg) => setError(msg))
  }, [listenForAnswer])

  const startSession = () => {
    stopAll()
    setData({ name: '', description: '', qty: '', price: '' })
    setDone(false)
    setStep(0)
    setError('')
    speak(
      PROMPTS[lang].intro,
      lang,
      () => goToStep(0, lang, { name: '', description: '', qty: '', price: '' }),
      (msg) => setError(msg),
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-[#2E7D32]">
          <Mic size={20} />
          <h3 className="font-bold text-lg">Speak to Add Item</h3>
        </div>
        <select
          value={lang}
          onChange={(e) => { stopAll(); setLang(e.target.value); setStep(-1); setQuestion('Tap Mic to Start') }}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>

      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={testVoice}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface-2"
        >
          <Volume2 size={14} />
          Test Voice
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col items-center justify-center py-6 relative">
        <div className="flex items-center gap-6">
          <button
            onClick={startSession}
            disabled={listening}
            className={`flex h-24 w-24 items-center justify-center rounded-full transition-all active:scale-90 ${
              listening 
                ? 'bg-accent/10 text-accent ring-8 ring-accent/5' 
                : 'bg-[#2E7D32] text-white shadow-xl hover:bg-[#1B5E20]'
            }`}
          >
            {listening ? <div className="animate-pulse"><Mic size={40} /></div> : <Mic size={40} />}
          </button>
          
          {listening && (
            <div className="flex flex-col max-w-[180px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Listening...</span>
              </div>
              <p className="text-sm font-bold text-accent italic line-clamp-2 leading-tight">
                "{transcript || '...'}"
              </p>
            </div>
          )}
        </div>
        
        <p className={`mt-6 text-center font-bold text-lg ${listening ? 'text-text-muted opacity-60' : 'text-text-primary'}`}>
          {question}
        </p>
      </div>

      {step >= 0 && !done && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {STEPS.map((s, i) => (
            <div 
              key={s} 
              className={`h-2 w-12 rounded-full transition-all ${
                i <= step ? 'bg-[#2E7D32]' : 'bg-gray-100'
              }`} 
            />
          ))}
        </div>
      )}

      {done && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[#2E7D32] bg-[#2E7D32]/5 py-3 rounded-xl border border-[#2E7D32]/20">
          <CheckCircle size={20} />
          <span className="font-bold">Information captured!</span>
        </div>
      )}
    </div>
  )
}
