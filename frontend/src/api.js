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

export function fileUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return (import.meta.env.VITE_API_URL || window.location.origin) + '/uploads/' + path;
}

export default api;