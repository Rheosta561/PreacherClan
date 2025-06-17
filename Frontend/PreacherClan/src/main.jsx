import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {HeroUIProvider} from '@heroui/react'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register';

registerSW(); 

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HeroUIProvider>
    <App />
    </HeroUIProvider>
  </StrictMode>,
)
