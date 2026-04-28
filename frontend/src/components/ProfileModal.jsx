import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { fileUrl } from '../api';

export default function ProfileModal({ user, onClose, isOwn }) {
    const { updateUser } = useAuth();
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.nickname || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef(null);

    if (!user) return null;

    const handleSaveName = async () => {
        if (!newName.trim() || newName.length < 3 || newName.length > 20) { setError('Никнейм от 3 до 20 символов'); return; }
        setSaving(true); setError('');
        try {
            const data = await api.put('/api/auth/change-nickname', { newNickname: newName.trim() });
            updateUser(data.user); setEditingName(false);
        } catch (e) { setError(e.message || 'Ошибка'); } finally { setSaving(false); }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('avatar', file);
        try { const data = await api.upload('/api/users/upload-avatar', formData); updateUser(data.user); }
        catch (e) { alert('Ошибка загрузки аватара: ' + e.message); }
    };

    const avatarUrl = fileUrl(user.avatar) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.nickname) + '&background=' + (user.avatar_color?.replace('#','') || 'random') + '&color=fff';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal profile-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>X</button>
                <div className="profile-avatar-wrap">
                    <img className="profile-avatar-large" src={avatarUrl} alt="avatar" />
                    {isOwn && (<> <button className="avatar-change-btn" onClick={() => fileRef.current?.click()}>Изменить фото</button> <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} /> </>)}
                </div>
                <div className="profile-info">
                    <div className="profile-row">
                        {editingName ? (
                            <div className="profile-name-edit">
                                <input value={newName} onChange={e => setNewName(e.target.value)} maxLength={20} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }} />
                                {error && <small className="error-text">{error}</small>}
                                <div className="profile-name-btns"><button onClick={handleSaveName} disabled={saving}>Сохранить</button><button onClick={() => { setEditingName(false); setError(''); }}>Отмена</button></div>
                            </div>
                        ) : (
                            <div className="profile-display-name"><h2>@{user.nickname}</h2>{isOwn && <button className="btn-link" onClick={() => { setNewName(user.nickname); setEditingName(true); }}>Изменить никнейм</button>}</div>
                        )}
                    </div>
                    <div className="profile-status"><span className={'status-dot ' + (user.isOnline ? 'online' : 'offline')}></span>{user.isOnline ? 'В сети' : 'Был(а) ' + (user.lastSeen ? new Date(user.lastSeen).toLocaleString('ru') : 'давно')}</div>
                </div>
            </div>
        </div>
    );
}