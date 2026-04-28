const API_BASE = import.meta.env.VITE_API_URL?.trim()
    ? import.meta.env.VITE_API_URL.trim().replace(/\/$/, '')
    : '';

const SOCKET_HOST = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim()
    ? import.meta.env.VITE_SOCKET_URL.trim().replace(/\/$/, '')
    : `${window.location.protocol}//${SOCKET_HOST}:3001`;
const BASE = import.meta.env.VITE_API_URL || '';
export const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export async function apiFetch(endpoint, options = {}, token = null) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const response = await fetch(BASE + endpoint, { ...options, headers });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Ошибка запроса');
    }
    if (response.status === 204) return null;
    return response.json();
}

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
export const api = {
    get: (url, token) => apiFetch(url, { method: 'GET' }, token),
    post: (url, data, token) => apiFetch(url, { method: 'POST', body: JSON.stringify(data) }, token),
    put: (url, data, token) => apiFetch(url, { method: 'PUT', body: JSON.stringify(data) }, token),
    delete: (url, token) => apiFetch(url, { method: 'DELETE' }, token),
    upload: async (url, formData, token) => {
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const response = await fetch(BASE + url, { method: 'POST', body: formData, headers });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка загрузки');
        }
        return response.json();
    }
};

export function fileUrl(filename) {
    if (!filename) return null;
    return `${API_BASE}/uploads/${filename}`;
export function fileUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return (import.meta.env.VITE_API_URL || window.location.origin) + '/uploads/' + path;
}

export const api = { apiFetch, fileUrl, SOCKET_URL };

export default api;