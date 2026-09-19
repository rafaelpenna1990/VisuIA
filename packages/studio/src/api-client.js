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

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 600; // 600 * 3s = 30 minutes, matches the old video budget

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
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

async function submitAndPoll(kind, params) {
  const initial = await postJSON('/api/generate', { kind, ...params });

  if (initial.done) {
    if (initial.error) throw new Error(initial.error);
    return { url: initial.url, charged_brl: initial.charged_brl };
  }

  const jobId = initial.job_id;
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const poll = await getJSON(`/api/generate/poll?job_id=${jobId}`);
    if (poll.done) {
      if (poll.error) throw new Error(poll.error);
      return { url: poll.url, charged_brl: poll.charged_brl };
    }
  }
  throw new Error('A geração demorou demais. Tente de novo em instantes.');
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
