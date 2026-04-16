/**
 * utils/api.js
 * ─────────────────────────────────────────────────────────
 * All API calls to the Node.js + MongoDB backend.
 * Automatically attaches Clerk user headers to every request
 * so the backend knows which clinician is making each call.
 */

import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 60_000 });

// ── Attach Clerk user headers to every request ────────────────────────────
// Call setClerkUser(user) once after login (done in main.jsx)
let _clerkUser = null;

export function setClerkUser(user) {
  _clerkUser = user;
}

api.interceptors.request.use((config) => {
  if (_clerkUser) {
    config.headers['x-clerk-user-id']    = _clerkUser.id;
    config.headers['x-clerk-user-email'] = _clerkUser.primaryEmailAddress?.emailAddress || '';
    config.headers['x-clerk-user-name']  =
      `${_clerkUser.firstName || ''} ${_clerkUser.lastName || ''}`.trim() || 'Unknown Clinician';
  }
  return config;
});

// ── Health ────────────────────────────────────────────────────────────────
export async function getHealth() {
  return (await api.get('/health')).data;
}

// ── Auth / User Sync (Clerk) ──────────────────────────────────────────────
// Called once after Clerk signs a user in/up to persist them in MongoDB.
export async function syncUser(imageUrl = '') {
  return (await api.post('/auth/sync-user', { imageUrl })).data;
}

export async function getMe() {
  return (await api.get('/auth/me')).data;
}

// ── Local Email+Password Auth ─────────────────────────────────────────────
// Store the JWT in localStorage so the user stays logged in on refresh.
const LOCAL_TOKEN_KEY = 'mammoai_local_token';
const LOCAL_USER_KEY  = 'mammoai_local_user';

export function getLocalToken() {
  return localStorage.getItem(LOCAL_TOKEN_KEY);
}
export function setLocalToken(token, user) {
  localStorage.setItem(LOCAL_TOKEN_KEY, token);
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
}
export function clearLocalToken() {
  localStorage.removeItem(LOCAL_TOKEN_KEY);
  localStorage.removeItem(LOCAL_USER_KEY);
}
export function getStoredLocalUser() {
  try { return JSON.parse(localStorage.getItem(LOCAL_USER_KEY)); } catch { return null; }
}

// Attach JWT Bearer token to every request if present
api.interceptors.request.use((config) => {
  const localToken = getLocalToken();
  if (localToken && !config.headers['authorization']) {
    config.headers['authorization'] = `Bearer ${localToken}`;
    
    // Transparently masquerade as Clerk headers so backend routes (scans, predicts, etc.) 
    // work exactly the same without rewriting them.
    const user = getStoredLocalUser();
    if (user && !config.headers['x-clerk-user-id']) {
      config.headers['x-clerk-user-id'] = user.id || user._id;
      config.headers['x-clerk-user-email'] = user.email;
      config.headers['x-clerk-user-name'] = user.fullName || `${user.firstName} ${user.lastName}`.trim();
    }
  }
  return config;
});

export async function localRegister(firstName, lastName, email, password) {
  const res = await api.post('/auth/register', { firstName, lastName, email, password });
  if (res.data.token) setLocalToken(res.data.token, res.data.user);
  return res.data;
}

export async function localLogin(email, password) {
  const res = await api.post('/auth/login', { email, password });
  if (res.data.token) setLocalToken(res.data.token, res.data.user);
  return res.data;
}

export async function getLocalProfile() {
  return (await api.get('/auth/profile')).data;
}


export async function deleteLocalAccount() {
  return (await api.delete('/auth/account')).data;
}

// ── Notifications ─────────────────────────────────────────────────────────
export async function getNotifications() {
  return (await api.get('/notifications')).data;
}

export async function markNotificationsRead(ids = []) {
  return (await api.patch('/notifications/mark-read', { ids })).data;
}

// ── Predict ───────────────────────────────────────────────────────────────
export async function predictImage(file, patientMeta = {}, onProgress) {
  const fd = new FormData();
  fd.append('file', file);

  // Attach patient metadata as form fields
  if (patientMeta.name)           fd.append('patient_name',   patientMeta.name);
  if (patientMeta.mrn)            fd.append('patient_mrn',    patientMeta.mrn);
  if (patientMeta.age)            fd.append('patient_age',    patientMeta.age);
  if (patientMeta.gender)         fd.append('patient_gender', patientMeta.gender);
  if (patientMeta.patientId)      fd.append('patient_id',     patientMeta.patientId);
  if (patientMeta.clinicalNotes)  fd.append('clinical_notes', patientMeta.clinicalNotes);

  const res = await api.post('/predict', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: evt => {
      if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
    },
  });
  return res.data;
}

// ── Scans ─────────────────────────────────────────────────────────────────
export async function getScans(params = {}) {
  return (await api.get('/scans', { params })).data;
}

export async function getScanStats() {
  return (await api.get('/scans/stats')).data;
}

export async function getScan(id) {
  return (await api.get(`/scans/${id}`)).data;
}

export async function updateScan(id, body) {
  return (await api.patch(`/scans/${id}`, body)).data;
}

export async function deleteScan(id) {
  return (await api.delete(`/scans/${id}`)).data;
}

export async function clearAllScans() {
  return (await api.delete('/scans')).data;
}

// ── Patients ──────────────────────────────────────────────────────────────
export async function getPatients(params = {}) {
  return (await api.get('/patients', { params })).data;
}

export async function createPatient(body) {
  return (await api.post('/patients', body)).data;
}

export async function getPatient(id) {
  return (await api.get(`/patients/${id}`)).data;
}

export async function updatePatient(id, body) {
  return (await api.patch(`/patients/${id}`, body)).data;
}

export async function deletePatient(id) {
  return (await api.delete(`/patients/${id}`)).data;
}

// ── Legacy aliases (keep old names working in existing pages) ─────────────
export const getHistory    = () => getScans({ limit: 100 }).then(d => ({ records: d.records, count: d.total }));
export const deleteRecord  = (id) => deleteScan(id);
export const clearHistory  = () => clearAllScans();
export const getLocalRecords = () => [];        // no-op: data now lives in MongoDB
export const saveLocalRecord = (r) => r;        // no-op
export const deleteLocalRecord = () => {};      // no-op
export const clearLocalRecords = () => {};      // no-op
export const getLocalRecord = () => null;       // no-op
