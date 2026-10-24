import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Forms no longer keep drafts; clear any left in this browser by older versions
try {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('ofcDraft:'))
    .forEach((key) => localStorage.removeItem(key))
} catch {
  // storage may be unavailable; nothing to clear
}

createRoot(document.getElementById('root')).render(
  <App />,
)
