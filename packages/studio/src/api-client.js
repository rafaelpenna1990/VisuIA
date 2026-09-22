// packages/studio/src/api-client.js
//
// Drop-in replacements for the functions in muapi.js. Same names, same
// signatures — so studio components that call generateImage(apiKey, params)
// don't need rewriting, they just need to import from here instead.
// The apiKey argument is accepted but ignored; your Muapi key never leaves
// the server anymore.
//
// Generation now happens in two steps behind the scenes: submit (POST
// /api/generate) returns almost immediately, and if the result isn't ready
// yet, this file polls GET /api/generate/poll every few seconds until it
// is. That keeps every single request short — nothing sits open long
// enough for Railway's ~60s proxy timeout to cut it, which is what used to
// 502 on longer video generations.
//
// While a job is pending, its id is saved to localStorage. If the page is
// refreshed or closed mid-generation, the in-memory polling loop dies —
// but the job keeps running on Muapi's side, and the pre-charged estimate
// is still sitting on it. resumePendingJob() (called once on app load, see
// StandaloneShell.js) picks that saved id back up and keeps polling until
// it settles, so the credit always gets properly refunded/charged and the
// result isn't silently lost.

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 600; // 600 * 3s = 30 minutes, matches the old video budget
const PENDING_JOB_KEY = 'visuia_pending_job';

function savePendingJob(jobId, kind) {
  try {
    localStorage.setItem(PENDING_JOB_KEY, JSON.stringify({ jobId, kind, savedAt: Date.now() }));
  } catch {
    // localStorage unavailable (private browsing, etc.) — worst case the
    // resume-on-refresh feature just doesn't kick in; generation itself
    // still works normally.
  }
}

function clearPendingJob() {
  try {
    localStorage.removeItem(PENDING_JOB_KEY);
  } catch {}
}

export function getPendingJob() {
  try {
    const raw = localStorage.getItem(PENDING_JOB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Erro ${response.status}`);
    if (response.status === 402) err.insufficientCredits = true;
    throw err;
  }
  return data;
}

async function getJSON(url) {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }
  return data;
}

async function pollUntilDone(jobId) {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const poll = await getJSON(`/api/generate/poll?job_id=${jobId}`);
    if (poll.done) {
      clearPendingJob();
      if (poll.error) throw new Error(poll.error);
      return { url: poll.url, charged_brl: poll.charged_brl };
    }
  }
  throw new Error('A geração demorou demais. Tente de novo em instantes.');
}

async function submitAndPoll(kind, params) {
  const initial = await postJSON('/api/generate', { kind, ...params });

  if (initial.done) {
    if (initial.error) throw new Error(initial.error);
    return { url: initial.url, charged_brl: initial.charged_brl };
  }

  savePendingJob(initial.job_id, kind);
  return pollUntilDone(initial.job_id);
}

// Called once when the app loads (StandaloneShell.js). If there's a job
// left over from before a refresh/close, keeps polling it in the
// background until it settles — same money-safety guarantee as a normal
// generation, just without a studio screen watching it live.
export async function resumePendingJob() {
  const pending = getPendingJob();
  if (!pending) return null;
  try {
    const result = await pollUntilDone(pending.jobId);
    return { ...result, kind: pending.kind };
  } catch (err) {
    clearPendingJob();
    throw err;
  }
}

export async function generateImage(_apiKey, params) {
  return submitAndPoll('image', params);
}

export async function generateI2I(_apiKey, params) {
  return submitAndPoll('i2i', params);
}

export async function generateVideo(_apiKey, params) {
  return submitAndPoll('video', params);
}

export async function generateI2V(_apiKey, params) {
  return submitAndPoll('i2v', params);
}

export async function processLipSync(_apiKey, params) {
  return submitAndPoll('lipsync', params);
}

export function uploadFile(_apiKey, file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.withCredentials = true;

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          resolve(data.url);
        } else {
          reject(new Error(data.error || 'Falha no upload'));
        }
      } catch {
        reject(new Error('Falha ao interpretar resposta do upload'));
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede durante o upload'));
    xhr.send(formData);
  });
}
