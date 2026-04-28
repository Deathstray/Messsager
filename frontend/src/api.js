// Порт бэкенда берём из .env (VITE_BACKEND_PORT) или 3001 по умолчанию
const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 3001;

// При доступе с другого ПК по LAN — hostname будет IP-адресом хоста
export const SOCKET_URL = `http://${window.location.hostname}:${BACKEND_PORT}`;

// URL для файлов, которые отдаёт бэкенд через vite-proxy
export const fileUrl = (filename) => filename ? `/uploads/${filename}` : '';

// Универсальная функция запросов к API
export async function apiFetch(path, options = {}, token = null) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Не ставим Content-Type для FormData — браузер сам добавит boundary
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(path, {
        ...options,
        headers: { ...headers, ...options.headers },
    });
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
}