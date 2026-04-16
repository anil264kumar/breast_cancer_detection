import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider, useUser } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { LocalAuthProvider } from './context/LocalAuthContext';
import { setClerkUser, syncUser } from './utils/api';
import './index.css';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_REPLACE_WITH_YOUR_CLERK_KEY';

// Syncs the signed-in Clerk user into the API layer so every
// backend request carries the correct x-clerk-user-* headers.
// Also persists the user into MongoDB on first sign-up / sign-in.
function ClerkUserSync() {
  const { user, isLoaded } = useUser();
  const lastSyncedId = React.useRef(null);

  React.useEffect(() => {
    if (!isLoaded) return;

    // Update in-memory Clerk user for request headers
    setClerkUser(user || null);

    // Sync to MongoDB once per user session (not on every re-render)
    if (user && user.id !== lastSyncedId.current) {
      lastSyncedId.current = user.id;
      syncUser(user.imageUrl || '')
        .then(res => console.log('[Auth] User synced to DB:', res.message))
        .catch(err => console.error('[Auth] Failed to sync user:', err.message));
    }
  }, [user, isLoaded]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={CLERK_KEY}
    >
      <ClerkUserSync />
      <LocalAuthProvider>
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
      </LocalAuthProvider>
    </ClerkProvider>
  </React.StrictMode>
);
