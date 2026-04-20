import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user,  setUser]  = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);

    function login(userData, userToken) {
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('user',  JSON.stringify(userData));
        localStorage.setItem('token', userToken);
    }

    function logout() {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() { return useContext(AuthContext); }
