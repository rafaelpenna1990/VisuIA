import { getModelById, getVideoModelById, getI2IModelById, getI2VModelById, getV2VModelById, getLipSyncModelById } from './models.js';

const BASE_URL = 'https://api.muapi.ai';

// ── request builders ──────────────────────────────────────────────────────
// Each of these just figures out the Muapi endpoint + payload for a kind of
// generation. They don't call the network — that's split out below so the
// server can submit once and poll separately, instead of holding one HTTP
// connection open for the whole generation (which is what caused 502s on
// Railway for anything taking longer than ~60s, like video).

export function buildImageRequest(params) {
    const modelInfo = getModelById(params.model);
    const endpoint = modelInfo?.endpoint || params.model;
    const payload = { prompt: params.prompt };
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
    if (params.resolution) payload.resolution = params.resolution;
    if (params.quality) payload.quality = params.quality;
    if (params.image_url) { payload.image_url = params.image_url; payload.strength = params.strength || 0.6; }
    else payload.image_url = null;
    if (params.seed && params.seed !== -1) payload.seed = params.seed;
    return { endpoint, payload };
}

export function buildI2IRequest(params) {
    const modelInfo = getI2IModelById(params.model);
    const endpoint = modelInfo?.endpoint || params.model;
    const payload = {};
    if (params.prompt) payload.prompt = params.prompt;
    const imageField = modelInfo?.imageField || 'image_url';
    const imagesList = params.images_list?.length > 0 ? params.images_list : (params.image_url ? [params.image_url] : null);
    if (imagesList) {
        if (imageField === 'images_list') payload.images_list = imagesList;
        else payload[imageField] = imagesList[0];
    }
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
    if (params.resolution) payload.resolution = params.resolution;
    if (params.quality) payload.quality = params.quality;
    return { endpoint, payload };
}

export function buildVideoRequest(params) {
    const modelInfo = getVideoModelById(params.model);
    const endpoint = modelInfo?.endpoint || params.model;
    const payload = {};
    if (params.prompt) payload.prompt = params.prompt;
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
    if (params.duration) payload.duration = params.duration;
    if (params.resolution) payload.resolution = params.resolution;
    if (params.quality) payload.quality = params.quality;
    if (params.mode) payload.mode = params.mode;
    if (params.image_url) payload.image_url = params.image_url;
    return { endpoint, payload };
}

export function buildI2VRequest(params) {
    const modelInfo = getI2VModelById(params.model);
    const endpoint = modelInfo?.endpoint || params.model;
    const payload = {};
    // params.prompt !== undefined (not a truthy check) — "effects" family
    // models require this key present even as an empty string; a plain
    // `if (params.prompt)` silently drops '' and breaks them.
    if (params.prompt !== undefined) payload.prompt = params.prompt;
    const imageField = modelInfo?.imageField || 'image_url';
    if (params.image_url) {
        if (imageField === 'images_list') payload.images_list = [params.image_url];
        else payload[imageField] = params.image_url;
    }
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
    if (params.duration) payload.duration = params.duration;
    if (params.resolution) payload.resolution = params.resolution;
    if (params.quality) payload.quality = params.quality;
    if (params.mode) payload.mode = params.mode;
    // "effects" family models (VFX, AI Video Effects, Video Effects) require
    // this — it's the named effect to apply (e.g. "Car Explosion", "Flying").
    if (params.name) payload.name = params.name;
    return { endpoint, payload };
}

export function buildLipSyncRequest(params) {
    const modelInfo = getLipSyncModelById(params.model);
    const endpoint = modelInfo?.endpoint || params.model;
    const payload = {};
    if (params.audio_url) payload.audio_url = params.audio_url;
    if (params.image_url) payload.image_url = params.image_url;
    if (params.video_url) payload.video_url = params.video_url;
    if (params.prompt) payload.prompt = params.prompt;
    if (params.resolution) payload.resolution = params.resolution;
    if (params.seed !== undefined && params.seed !== -1) payload.seed = params.seed;
    return { endpoint, payload };
}

// ── network: submit once, poll once ─────────────────────────────────────
// submitGeneration fires the initial request and returns right away — it
// does NOT wait for the generation to finish. If Muapi happens to answer
// synchronously (no request_id), we treat it as already done.
export async function submitGeneration(endpoint, payload, apiKey) {
    const url = `${BASE_URL}/api/v1/${endpoint}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errText.slice(0, 800)}`);
    }
    const data = await response.json();
    const requestId = data.request_id || data.id;
    if (!requestId) {
        const outputUrl = data.outputs?.[0] || data.url || data.output?.url;
        return { done: true, url: outputUrl, raw: data };
    }
    return { done: false, requestId };
}

// checkGeneration does exactly ONE status check against Muapi — no internal
// loop, no delay. The caller (our /api/generate/poll route) is what gets
// called repeatedly, from the browser, every few seconds.
export async function checkGeneration(requestId, apiKey) {
    const pollUrl = `${BASE_URL}/api/v1/predictions/${requestId}/result`;
    const response = await fetch(pollUrl, {
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }
    });
    if (!response.ok) {
        const errText = await response.text();
        // A transient 5xx from Muapi while it's still working — tell the
        // caller to just try again on the next poll, don't fail the job.
        if (response.status >= 500) return { done: false };
        throw new Error(`Poll Failed: ${response.status} - ${errText.slice(0, 800)}`);
    }
    const data = await response.json();
    const status = data.status?.toLowerCase();
    if (status === 'completed' || status === 'succeeded' || status === 'success') {
        const outputUrl = data.outputs?.[0] || data.url || data.output?.url;
        return { done: true, url: outputUrl, raw: data };
    }
    if (status === 'failed' || status === 'error') {
        throw new Error(`Generation failed: ${data.error || 'Unknown error'}`);
    }
    return { done: false };
}

export function uploadFile(apiKey, file, onProgress) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/api/v1/upload_file`;
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('x-api-key', apiKey);

        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    onProgress(percentComplete);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    const fileUrl = data.url || data.file_url || data.data?.url;
                    if (!fileUrl) {
                        reject(new Error('No URL returned from file upload'));
                    } else {
                        resolve(fileUrl);
                    }
                } catch (e) {
                    reject(new Error('Failed to parse upload response'));
                }
            } else {
                let detail = xhr.statusText;
                try {
                    const errObj = JSON.parse(xhr.responseText);
                    detail = errObj.detail || detail;
                } catch (e) {
                    // fallback to statusText
                }
                reject(new Error(`File upload failed: ${xhr.status} - ${detail}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network error during file upload'));
        xhr.send(formData);
    });
}
