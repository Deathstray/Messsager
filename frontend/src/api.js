const host = window.location.hostname;
const protocol = window.location.protocol;
const port = window.location.port;
const isLocalHost = host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host);

const API_BASE = import.meta.env.VITE_API_URL?.trim()
    ? import.meta.env.VITE_API_URL.trim().replace(/\/$/, '')
    : port === '3001'
        ? ''
        : `${protocol}//${host}:3001`;

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim()
    ? import.meta.env.VITE_SOCKET_URL.trim().replace(/\/$/, '')
    : `${protocol}//${host}:3001`;

export async function apiFetch(path, options = {}, token = null) {
    const headers = { ...(options.headers || {}) };
    const isFormData = options.body instanceof FormData;
    if (!isFormData && options.body !== undefined && options.body !== null && typeof options.body !== 'string') {
        options = { ...options, body: JSON.stringify(options.body) };
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
}

export function fileUrl(filename) {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    return `${API_BASE}/uploads/${filename}`;
}

export default { apiFetch, fileUrl, SOCKET_URL };
export const api = { apiFetch, fileUrl, SOCKET_URL };
