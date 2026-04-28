import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Login() {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!nickname.trim() || !password.trim()) {
            setError('Введите никнейм и пароль');
            return;
        }
        setLoading(true);
        try {
            const data = await api.post('/api/auth/login', { nickname: nickname.trim(), password });
            login(data.token, data.user);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Ошибка входа');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Вход</h1>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label>Никнейм</label>
                        <input
                            type="text"
                            placeholder="Ваш никнейм"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            autoComplete="username"
                            autoFocus
                        />
                    </div>
                    <div className="auth-field">
                        <label>Пароль</label>
                        <input
                            type="password"
                            placeholder="Ваш пароль"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                    </div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Входим...' : 'Войти'}
                    </button>
                </form>
                <p className="auth-switch">
                    Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
                </p>
            </div>
        </div>
    );
}