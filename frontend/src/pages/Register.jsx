import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../api';
import { IconMoon, IconSun } from '../icons/Icons';

export default function Register() {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const { colors, theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [form, setForm] = useState({ display_name: '', password: '' });
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

        if (form.password.length < 6) {
            setError('Пароль минимум 6 символов');
            return;
        }
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
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background: colors.bgChat, position:'relative' }}>
            <button onClick={toggleTheme} title="Сменить тему"
                style={{ position:'absolute', top:16, right:16, background: colors.bgSidebar, border:`1px solid ${colors.border}`, borderRadius:'50%', width:40, height:40, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: colors.textSecondary, boxShadow: colors.shadow }}
                className="icon-btn-base">
                {theme.dark ? <IconSun size={18} color={colors.textSecondary}/> : <IconMoon size={18} color={colors.textSecondary}/>}
            </button>
            <div className="card-anim" style={{ background: colors.bgSidebar, borderRadius:16, padding:40, width:380, maxWidth:'95vw', boxShadow: colors.shadow, border:`1px solid ${colors.border}` }}>
                <h1 style={{ margin:'0 0 4px', textAlign:'center', fontSize:28, color: colors.accent }}>💬 NexusChat</h1>
                <h2 style={{ margin:'0 0 24px', textAlign:'center', fontWeight:500, color: colors.textSecondary, fontSize:17 }}>Регистрация</h2>
                {error && <div style={{ background: colors.errBg, color: colors.errText, padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:14 }}>{error}</div>}
                <form onSubmit={handleSubmit} autoComplete="on">
                    <input className="input-focus" style={{ display:'block', width:'100%', marginBottom:12, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${colors.border}`, fontSize:15, boxSizing:'border-box', background: colors.bgInput, color: colors.textPrimary }} name="display_name" autoComplete="username" placeholder="Никнейм" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} required />
                    <input className="input-focus" style={{ display:'block', width:'100%', marginBottom:20, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${colors.border}`, fontSize:15, boxSizing:'border-box', background: colors.bgInput, color: colors.textPrimary }} name="password" type="password" autoComplete="new-password" placeholder="Пароль (минимум 6 символов)" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                    <button style={{ width:'100%', padding:11, background: colors.accent, color:'#fff', border:'none', borderRadius:10, fontSize:15, cursor:'pointer', fontWeight:700, boxShadow:`0 3px 10px rgba(123,31,58,.3)` }} className="send-btn-base" disabled={loading}>{loading ? 'Создаём...' : 'Зарегистрироваться'}</button>
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
                <p style={{ textAlign:'center', marginTop:16, fontSize:14, color: colors.textSecondary }}>Уже есть аккаунт? <Link to="/login" style={{ color: colors.accent, fontWeight:600 }}>Войти</Link></p>
                <p className="auth-switch">
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </p>
            </div>
        </div>
    );
}
