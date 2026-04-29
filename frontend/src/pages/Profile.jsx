import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch, fileUrl } from '../api';

export default function Profile() {
    const { id } = useParams();
    const { token } = useAuth();
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        async function load() {
            try {
                const data = await apiFetch(`/api/users/${id}`, {}, token);
                if (alive) setUser(data);
            } catch (err) {
                if (alive) setError(err.message);
            }
        }
        if (id && token) load();
        return () => { alive = false; };
    }, [id, token]);

    if (error) return <div>{error}</div>;
    if (!user) return null;

    return (
        <div>
            {user.avatar && <img src={fileUrl(user.avatar)} alt="" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />}
            <h2>{user.display_name || user.nickname}</h2>
        </div>
    );
}
