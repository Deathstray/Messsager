import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../api';
import { IconMoon, IconSun } from '../icons/Icons';

export default function Register() {
    const { login }  = useAuth();
    const { colors, theme, toggleTheme } = useTheme();
    const navigate   = useNavigate();
    const [form, setForm]       = useState({ username: '', password: '', display_name: '' });
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) { setError('Пароль минимум 6 символов'); return; }
        setLoading(true);
        try {
            const data = await apiFetch('/api/register', { method: 'POST', body: JSON.stringify(form) });
            login(data.user, data.token);
            navigate('/');
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }

    return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background: colors.bgChat, position:'relative' }}>
            <button onClick={toggleTheme} title="Сменить тему"
                style={{ position:'absolute', top:16, right:16, background: colors.bgSidebar, border:`1px solid ${colors.border}`, borderRadius:'50%', width:40, height:40, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: colors.textSecondary, boxShadow: colors.shadow }}
                className="icon-btn-base">
                {theme === 'dark' ? <IconSun size={18} color={colors.textSecondary}/> : <IconMoon size={18} color={colors.textSecondary}/>}
            </button>
            <div className="card-anim" style={{ background: colors.bgSidebar, borderRadius:16, padding:40, width:380, maxWidth:'95vw', boxShadow: colors.shadow, border:`1px solid ${colors.border}` }}>
                <h1 style={{ margin:'0 0 4px', textAlign:'center', fontSize:28, color: colors.accent }}>💬 NexusChat</h1>
                <h2 style={{ margin:'0 0 24px', textAlign:'center', fontWeight:500, color: colors.textSecondary, fontSize:17 }}>Регистрация</h2>
                {error && <div style={{ background: colors.errBg, color: colors.errText, padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:14 }}>{error}</div>}
                <form onSubmit={handleSubmit} autoComplete="on">
                    <input className="input-focus" style={{ display:'block', width:'100%', marginBottom:12, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${colors.border}`, fontSize:15, boxSizing:'border-box', background: colors.bgInput, color: colors.textPrimary }} name="display_name" autoComplete="name" placeholder="Отображаемое имя" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} required />
                    <input className="input-focus" style={{ display:'block', width:'100%', marginBottom:12, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${colors.border}`, fontSize:15, boxSizing:'border-box', background: colors.bgInput, color: colors.textPrimary }} name="username" autoComplete="username" placeholder="Логин (@username)" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
                    <input className="input-focus" style={{ display:'block', width:'100%', marginBottom:20, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${colors.border}`, fontSize:15, boxSizing:'border-box', background: colors.bgInput, color: colors.textPrimary }} name="password" type="password" autoComplete="new-password" placeholder="Пароль (минимум 6 символов)" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                    <button style={{ width:'100%', padding:11, background: colors.accent, color:'#fff', border:'none', borderRadius:10, fontSize:15, cursor:'pointer', fontWeight:700, boxShadow:`0 3px 10px rgba(123,31,58,.3)` }} className="send-btn-base" disabled={loading}>{loading ? 'Создаём...' : 'Зарегистрироваться'}</button>
                </form>
                <p style={{ textAlign:'center', marginTop:16, fontSize:14, color: colors.textSecondary }}>Уже есть аккаунт? <Link to="/login" style={{ color: colors.accent, fontWeight:600 }}>Войти</Link></p>
            </div>
        </div>
    );
}
