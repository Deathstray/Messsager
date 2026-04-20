import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function Register() {
    const { login } = useAuth();
    const navigate  = useNavigate();
    const [form, setForm]   = useState({ username: '', password: '', display_name: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) { setError('Пароль минимум 6 символов'); return; }
        setLoading(true);
        try {
            const data = await apiFetch('/api/register', {
                method: 'POST',
                body: JSON.stringify(form),
            });
            login(data.user, data.token);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={s.wrap}>
            <div style={s.card}>
                <h1 style={s.title}>💬 NexusChat</h1>
                <h2 style={s.sub}>Регистрация</h2>
                {error && <div style={s.error}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <input
                        style={s.input}
                        placeholder="Отображаемое имя"
                        value={form.display_name}
                        onChange={e => setForm({ ...form, display_name: e.target.value })}
                        required
                    />
                    <input
                        style={s.input}
                        placeholder="Имя пользователя (логин)"
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                        required
                    />
                    <input
                        style={s.input}
                        type="password"
                        placeholder="Пароль (минимум 6 символов)"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        required
                    />
                    <button style={s.btn} disabled={loading}>
                        {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
                    </button>
                </form>
                <p style={s.link}>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
            </div>
        </div>
    );
}

const s = {
    wrap:  { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f2f5' },
    card:  { background: '#fff', borderRadius: '12px', padding: '40px', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' },
    title: { margin: '0 0 4px', textAlign: 'center', fontSize: '28px' },
    sub:   { margin: '0 0 24px', textAlign: 'center', fontWeight: 400, color: '#555', fontSize: '18px' },
    input: { display: 'block', width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box' },
    btn:   { width: '100%', padding: '11px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', fontWeight: 600 },
    error: { background: '#fdecea', color: '#c62828', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px' },
    link:  { textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#666' },
};
