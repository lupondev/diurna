'use client'

import { Toaster as HotToaster } from 'react-hot-toast'

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1a1a2e',
          color: '#e0e0e0',
          border: '1px solid #2a2a3e',
          borderRadius: '8px',
          fontSize: '14px',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#1a1a2e' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' },
          duration: 5000,
        },
      }}
    />
  )
}
