const BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path, options = {}, token = null) {
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res  = await fetch(`${BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
}

export function fileUrl(filename) {
    return filename ? `${BASE}/uploads/${filename}` : null;
}
