import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No StrictMode: the viewer, store and text panes are imperative singletons from
// the vanilla whl-* modules, and a double-invoked effect would build two of each.
createRoot(document.getElementById('root')!).render(<App />)
