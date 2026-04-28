import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Register() {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!nickname.trim()) { setError('Введите никнейм'); return; }
        if (nickname.trim().length < 2) { setError('Никнейм минимум 2 символа'); return; }
        if (!password.trim()) { setError('Введите пароль'); return; }
        if (password.length < 4) { setError('Пароль минимум 4 символа'); return; }

        setLoading(true);
        try {
            const data = await api.post('/api/auth/register', { nickname: nickname.trim(), password });
            login(data.token, data.user);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Регистрация</h1>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label>Никнейм</label>
                        <input
                            type="text"
                            placeholder="Придумайте никнейм"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            autoComplete="username"
                            autoFocus
                        />
                        <small>Никнейм используется для входа. От 2 до 30 символов.</small>
                    </div>
                    <div className="auth-field">
                        <label>Пароль</label>
                        <input
                            type="password"
                            placeholder="Придумайте пароль (мин. 4 символа)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
                    </button>
                </form>
                <p className="auth-switch">
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </p>
            </div>
        </div>
    );
}