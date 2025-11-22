import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import App from './App.tsx'
import CameraScan from './pages/CameraScan'
import History from './pages/History'
import Home from './pages/Home'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Rewards from './pages/Rewards'
import './index.css'
import './App.css'
import { MiniKit } from '@worldcoin/minikit-js'

// TODO: Remove this once we have a proper app ID
MiniKit.install?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<App />}>
          <Route path="home" element={<Home />} />
          <Route path="history" element={<History />} />
          <Route path="rewards" element={<Rewards />} />
        </Route>
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="camera-scan" element={<CameraScan />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
