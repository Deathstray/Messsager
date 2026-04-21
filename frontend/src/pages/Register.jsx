import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Register() {
    const { login }  = useAuth();
    const navigate   = useNavigate();
    const [form, setForm]     = useState({ username: '', password: '', display_name: '' });
    const [error, setError]   = useState('');
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
        <div style={s.wrap}>
            <div style={s.card}>
                <h1 style={s.title}>💬 NexusChat</h1>
                <h2 style={s.sub}>Регистрация</h2>
                {error && <div style={s.err}>{error}</div>}
                <form onSubmit={handleSubmit} autoComplete="on">
                    <input style={s.inp} name="display_name" autoComplete="name"
                        placeholder="Отображаемое имя" value={form.display_name}
                        onChange={e => setForm({...form, display_name: e.target.value})} required />
                    <input style={s.inp} name="username" autoComplete="username"
                        placeholder="Логин (@username)" value={form.username}
                        onChange={e => setForm({...form, username: e.target.value})} required />
                    <input style={s.inp} name="password" type="password" autoComplete="new-password"
                        placeholder="Пароль (минимум 6 символов)" value={form.password}
                        onChange={e => setForm({...form, password: e.target.value})} required />
                    <button style={s.btn} disabled={loading}>{loading ? 'Создаём...' : 'Зарегистрироваться'}</button>
                </form>
                <p style={s.link}>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
            </div>
        </div>
    );
}

const s = {
    wrap: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f0f2f5' },
    card: { background:'#fff', borderRadius:12, padding:40, width:360, maxWidth:'95vw', boxShadow:'0 4px 24px rgba(0,0,0,.1)' },
    title:{ margin:'0 0 4px', textAlign:'center', fontSize:28 },
    sub:  { margin:'0 0 24px', textAlign:'center', fontWeight:400, color:'#555', fontSize:18 },
    inp:  { display:'block', width:'100%', marginBottom:12, padding:'10px 14px', borderRadius:8, border:'1px solid #ddd', fontSize:15, boxSizing:'border-box' },
    btn:  { width:'100%', padding:11, background:'#2196f3', color:'#fff', border:'none', borderRadius:8, fontSize:15, cursor:'pointer', fontWeight:600 },
    err:  { background:'#fdecea', color:'#c62828', padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:14 },
    link: { textAlign:'center', marginTop:16, fontSize:14, color:'#666' },
};
