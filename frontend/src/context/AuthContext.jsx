import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function readStoredUser() {
    try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        return {
            token: token || null,
            user: user ? JSON.parse(user) : null,
        };
    } catch {
        return { token: null, user: null };
    }
}

export function AuthProvider({ children }) {
    const stored = readStoredUser();
    const [user, setUser] = useState(stored.user);
    const [token, setToken] = useState(stored.token);

    function login(userData, userToken) {
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
    }

    function logout() {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }

    function updateUser(data) {
        setUser(prev => {
            const next = { ...(prev || {}), ...(data || {}) };
            localStorage.setItem('user', JSON.stringify(next));
            return next;
        });
        if (data?.token) {
            setToken(data.token);
            localStorage.setItem('token', data.token);
        }
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
