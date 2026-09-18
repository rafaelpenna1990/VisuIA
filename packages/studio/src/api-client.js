// packages/studio/src/api-client.js
//
// Drop-in replacements for the functions in muapi.js. Same names, same
// signatures — so studio components that call generateImage(apiKey, params)
// don't need rewriting, they just need to import from here instead.
// The apiKey argument is accepted but ignored; your Muapi key never leaves
// the server anymore.

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

export async function generateImage(_apiKey, params) {
  return postJSON('/api/generate', { kind: 'image', ...params });
}

export async function generateI2I(_apiKey, params) {
  return postJSON('/api/generate', { kind: 'i2i', ...params });
}

export async function generateVideo(_apiKey, params) {
  return postJSON('/api/generate', { kind: 'video', ...params });
}

export async function generateI2V(_apiKey, params) {
  return postJSON('/api/generate', { kind: 'i2v', ...params });
}

export async function processLipSync(_apiKey, params) {
  return postJSON('/api/generate', { kind: 'lipsync', ...params });
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
