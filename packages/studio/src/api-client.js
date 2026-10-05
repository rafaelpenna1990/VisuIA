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
// While a job is pending, its id is saved to localStorage (alongside any
// OTHER job that's also still pending — see readPendingJobs below). If
// the page is refreshed or closed mid-generation, the in-memory polling
// loop dies — but the job keeps running on Muapi's side, and the
// pre-charged estimate is still sitting on it. resumePendingJob() (called
// once on app load, see StandaloneShell.js) picks every saved id back up
// and keeps polling each until it settles, so the credit always gets
// properly refunded/charged and the result isn't silently lost.

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 600; // 600 * 3s = 30 minutes, matches the old video budget
const PENDING_JOBS_KEY = 'visuia_pending_jobs';

// This used to be a single key holding only the MOST RECENT pending job —
// so starting a second generation before the first one settled silently
// overwrote the first one's resume record. If the tab then closed or
// refreshed before THAT first job finished, nothing was ever going to
// poll it again, even though it kept running (and finishing) on Muapi's
// side: it just sat 'pending' in the DB until the 30-minute sweep gave up
// on it. That's the "video ficou pronto na Muapi e não veio pro site"
// pattern — it only ever happened to a job that wasn't the last one
// started. Now this is a small list, so every job still pending when the
// page loads gets resumed, not just the latest.
function readPendingJobs() {
  try {
    const raw = localStorage.getItem(PENDING_JOBS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingJobs(jobs) {
  try {
    if (jobs.length === 0) localStorage.removeItem(PENDING_JOBS_KEY);
    else localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(jobs));
  } catch {
    // localStorage unavailable (private browsing, etc.) — worst case the
    // resume-on-refresh feature just doesn't kick in; generation itself
    // still works normally.
  }
}

function savePendingJob(jobId, kind) {
  const jobs = readPendingJobs().filter((j) => j.jobId !== jobId);
  jobs.push({ jobId, kind, savedAt: Date.now() });
  writePendingJobs(jobs);
}

function clearPendingJob(jobId) {
  writePendingJobs(readPendingJobs().filter((j) => j.jobId !== jobId));
}

// Kept for any caller that just wants to know "is anything pending at
// all" — the first tracked job, or null.
export function getPendingJob() {
  return readPendingJobs()[0] || null;
}

export function getPendingJobs() {
  return readPendingJobs();
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
      clearPendingJob(jobId);
      if (poll.error) throw new Error(poll.error);
      return { url: poll.url, charged_brl: poll.charged_brl, id: poll.id };
    }
  }
  throw new Error('A geração demorou demais. Tente de novo em instantes.');
}

async function submitAndPoll(kind, params) {
  const initial = await postJSON('/api/generate', { kind, ...params });

  if (initial.done) {
    if (initial.error) throw new Error(initial.error);
    return { url: initial.url, charged_brl: initial.charged_brl, id: initial.id };
  }

  savePendingJob(initial.job_id, kind);
  return pollUntilDone(initial.job_id);
}

// Called once when the app loads (StandaloneShell.js). If any jobs were
// left over from before a refresh/close, keeps polling ALL of them in the
// background until each settles — same money-safety guarantee as a normal
// generation, just without a studio screen watching any of them live.
// Each job is resumed independently (Promise.all over per-job try/catch),
// so one that errors or times out doesn't stop the others from being
// recovered, and this always resolves to an array — one entry per job
// that was pending, in the shape { kind, url, charged_brl } on success or
// { kind, error } if it genuinely failed.
export async function resumePendingJob() {
  const pending = readPendingJobs();
  if (pending.length === 0) return [];
  return Promise.all(
    pending.map(async (job) => {
      try {
        const result = await pollUntilDone(job.jobId);
        return { kind: job.kind, ...result };
      } catch (err) {
        clearPendingJob(job.jobId);
        return { kind: job.kind, error: err.message };
      }
    })
  );
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
