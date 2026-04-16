/**
 * context/LocalAuthContext.jsx
 * ─────────────────────────────────────────────────────────
 * Manages local (email+password) auth state separately from Clerk.
 * Reads the JWT from localStorage on mount so sessions persist.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredLocalUser, getLocalToken, clearLocalToken } from '../utils/api';

const LocalAuthContext = createContext(null);

export function LocalAuthProvider({ children }) {
  const [localUser, setLocalUser] = useState(null);
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);

  // Restore session from localStorage on first mount
  useEffect(() => {
    const token = getLocalToken();
    const stored = getStoredLocalUser();
    if (token && stored) {
      setLocalUser(stored);
    }
    setIsLocalLoaded(true);
  }, []);

  function loginLocal(user) {
    setLocalUser(user);
  }

  function logoutLocal() {
    clearLocalToken();
    setLocalUser(null);
  }

  return (
    <LocalAuthContext.Provider value={{ localUser, isLocalLoaded, loginLocal, logoutLocal }}>
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const ctx = useContext(LocalAuthContext);
  if (!ctx) throw new Error('useLocalAuth must be used inside LocalAuthProvider');
  return ctx;
}
