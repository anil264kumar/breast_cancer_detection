import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider, useUser } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { setClerkUser } from './utils/api';
import './index.css';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_REPLACE_WITH_YOUR_CLERK_KEY';

// Syncs the signed-in Clerk user into the API layer so every
// backend request carries the correct x-clerk-user-* headers.
function ClerkUserSync() {
  const { user, isLoaded } = useUser();
  React.useEffect(() => {
    if (isLoaded) setClerkUser(user || null);
  }, [user, isLoaded]);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={CLERK_KEY}
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <ClerkUserSync />
      <ThemeProvider>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-surface)',
                color:      'var(--text-primary)',
                border:     '1px solid var(--border)',
                borderRadius: '9px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize:   '0.875rem',
                boxShadow:  'var(--shadow)',
              },
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    </ClerkProvider>
  </React.StrictMode>
);
