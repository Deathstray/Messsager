import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/api/auth/me')
                .then(data => {
                    setUser(data.user);
                    applyTheme(data.user.theme);
                })
                .catch(() => localStorage.removeItem('token'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme || 'light');
    };

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        setUser(userData);
        applyTheme(userData.theme);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        document.documentElement.setAttribute('data-theme', 'light');
    };

    const updateUser = (userData) => {
        setUser(userData);
        if (userData.theme) applyTheme(userData.theme);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);