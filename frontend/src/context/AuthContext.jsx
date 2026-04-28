import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const stored = (() => {
        try {
            const t = localStorage.getItem('token');
            const u = localStorage.getItem('user');
            return { token: t || null, user: u ? JSON.parse(u) : null };
        } catch { return { token: null, user: null }; }
    })();

    const [token, setToken] = useState(stored.token);
    const [user, setUser] = useState(stored.user);

    function login(newToken, userData) {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }

    function updateUser(data) {
        const u = { ...user, ...data };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        if (data?.token) {
            setToken(data.token);
            localStorage.setItem('token', data.token);
        }
    }

    return (
        <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() { return useContext(AuthContext); }