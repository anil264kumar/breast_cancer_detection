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
