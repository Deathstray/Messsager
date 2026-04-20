// ИСПРАВЛЕНО: убран жёстко прописанный localhost:3001
// В режиме разработки Vite проксирует /api и /uploads на localhost:3001
// В продакшене переменная VITE_API_URL должна содержать адрес сервера
// Если VITE_API_URL не задана — используются относительные пути (рекомендуется)
const BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path, options = {}, token = null) {
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res  = await fetch(`${BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
}

// URL для прямых ссылок на файлы (картинки, видео, скачивание)
export function fileUrl(filename) {
    return `${BASE}/uploads/${filename}`;
}
