import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, fileUrl } from '../api';

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getChatDisplayName(chat, myId) {
    if (chat.type === 'saved') return '⭐ Избранное';
    if (chat.type === 'dm') {
        const other = chat.members?.find(m => String(m._id || m) !== String(myId));
        return other?.display_name || chat.name || 'Чат';
    }
    return chat.name || 'Группа';
}

function Avatar({ user, size = 36, radius = '50%' }) {
    if (user?.avatar) return (
        <img src={fileUrl(user.avatar)} alt=""
            style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0 }} />
    );
    return (
        <div style={{ width: size, height: size, borderRadius: radius, background: user?.avatar_color || '#2196f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
            {(user?.display_name || '?')[0].toUpperCase()}
        </div>
    );
}

function ChatAvatar({ chat, myId, size = 40 }) {
    if (chat.type === 'saved') return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, flexShrink: 0 }}>⭐</div>
    );
    if (chat.type === 'dm') {
        const other = chat.members?.find(m => String(m._id || m) !== String(myId));
        return <Avatar user={other} size={size} />;
    }
    // Group
    if (chat.avatar) return (
        <img src={fileUrl(chat.avatar)} alt=""
            style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
    );
    return (
        <div style={{ width: size, height: size, borderRadius: 10, background: '#8957e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
            {(chat.name || 'G')[0].toUpperCase()}
        </div>
    );
}

// ── Модальное окно профиля ────────────────────────────────────────────────────
function ProfileModal({ onClose }) {
    const { user, token, updateUser } = useAuth();
    const [name, setName]     = useState(user?.display_name || '');
    const [busy, setBusy]     = useState(false);
    const fileRef = useRef(null);

    async function saveName() {
        if (!name.trim()) return;
        setBusy(true);
        try {
            const u = await apiFetch('/api/users/profile', { method: 'PUT', body: JSON.stringify({ display_name: name }) }, token);
            updateUser({ display_name: u.display_name });
            onClose();
        } catch (e) { alert(e.message); }
        finally { setBusy(false); }
    }

    async function uploadAvatar(file) {
        const fd = new FormData(); fd.append('avatar', file);
        try {
            const u = await apiFetch('/api/users/avatar', { method: 'POST', body: fd }, token);
            updateUser({ avatar: u.avatar });
        } catch (e) { alert(e.message); }
    }

    return (
        <div style={mo.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={mo.box}>
                <div style={mo.title}>Мой профиль</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                        <Avatar user={user} size={80} />
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#2196f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📷</div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} />
                    <div style={{ fontSize: 13, color: '#888' }}>@{user?.username}</div>
                </div>
                <label style={mo.label}>Отображаемое имя</label>
                <input style={mo.input} value={name} onChange={e => setName(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button style={mo.btnSec} onClick={onClose}>Отмена</button>
                    <button style={mo.btnPri} onClick={saveName} disabled={busy}>{busy ? '...' : 'Сохранить'}</button>
                </div>
            </div>
        </div>
    );
}

// ── Модальное окно создания группы ────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated }) {
    const { token } = useAuth();
    const [name,      setName]      = useState('');
    const [isPublic,  setIsPublic]  = useState(false);
    const [query,     setQuery]     = useState('');
    const [users,     setUsers]     = useState([]);
    const [selected,  setSelected]  = useState([]);
    const [grpAvatar, setGrpAvatar] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        apiFetch(`/api/users?q=${encodeURIComponent(query)}`, {}, token).then(setUsers).catch(() => {});
    }, [query]);

    async function create() {
        if (!name.trim() || !selected.length) return alert('Введите название и выберите участников');
        try {
            const chat = await apiFetch('/api/chats', {
                method: 'POST',
                body: JSON.stringify({ type: 'group', name, member_ids: selected, is_public: isPublic }),
            }, token);
            if (grpAvatar) {
                const fd = new FormData(); fd.append('avatar', grpAvatar);
                await apiFetch(`/api/chats/${chat._id}/avatar`, { method: 'POST', body: fd }, token);
            }
            onCreated(chat); onClose();
        } catch (e) { alert(e.message); }
    }

    return (
        <div style={mo.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={mo.box}>
                <div style={mo.title}>Создать группу</div>

                {/* Аватарка группы */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                        {grpAvatar
                            ? <img src={URL.createObjectURL(grpAvatar)} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} />
                            : <div style={{ width: 64, height: 64, borderRadius: 10, background: '#8957e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff' }}>👥</div>
                        }
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: '#2196f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>📷</div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && setGrpAvatar(e.target.files[0])} />
                </div>

                <input style={mo.input} placeholder="Название группы" value={name} onChange={e => setName(e.target.value)} />

                {/* Тип группы */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button style={{ ...mo.typeBtn, ...(isPublic ? mo.typeActive : {}) }} onClick={() => setIsPublic(true)}>🌐 Публичная</button>
                    <button style={{ ...mo.typeBtn, ...(!isPublic ? mo.typeActive : {}) }} onClick={() => setIsPublic(false)}>🔒 Приватная</button>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
                    {isPublic ? 'Любой может найти и вступить через поиск' : 'Только по приглашению'}
                </div>

                <input style={mo.input} placeholder="Поиск участников..." value={query} onChange={e => setQuery(e.target.value)} />
                <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
                    {users.map(u => (
                        <div key={u._id}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', cursor: 'pointer', borderRadius: 8, background: selected.includes(u._id) ? '#e3f2fd' : 'transparent' }}
                            onClick={() => setSelected(p => p.includes(u._id) ? p.filter(x => x !== u._id) : [...p, u._id])}>
                            <Avatar user={u} size={32} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{u.display_name}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>@{u.username}</div>
                            </div>
                            {selected.includes(u._id) && <span style={{ color: '#2196f3', fontWeight: 700 }}>✓</span>}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button style={mo.btnSec} onClick={onClose}>Отмена</button>
                    <button style={mo.btnPri} onClick={create}>Создать ({selected.length})</button>
                </div>
            </div>
        </div>
    );
}

// ── ChatList ──────────────────────────────────────────────────────────────────
export default function ChatList({ chats, activeId, onSelect, onNewChat, onLogout, online, onRemoveChat }) {
    const { user, token } = useAuth();
    const [tab,      setTab]     = useState('chats');    // 'chats' | 'search' | 'public'
    const [query,    setQuery]   = useState('');
    const [users,    setUsers]   = useState([]);
    const [pubGroups, setPubGroups] = useState([]);
    const [showCreate,  setShowCreate]  = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [ctxChat,  setCtxChat] = useState(null);      // { chat, x, y } — контекст-меню чата
    const ctxRef = useRef(null);
    const myId = String(user?.id || user?._id || '');

    // Загружаем пользователей когда открыт поиск
    useEffect(() => {
        if (tab !== 'search') return;
        apiFetch(`/api/users?q=${encodeURIComponent(query)}`, {}, token).then(setUsers).catch(() => {});
    }, [tab, query]);

    // Загружаем публичные группы
    useEffect(() => {
        if (tab !== 'public') return;
        apiFetch(`/api/chats/public?q=${encodeURIComponent(query)}`, {}, token).then(setPubGroups).catch(() => {});
    }, [tab, query]);

    // Закрыть контекст-меню при клике снаружи
    useEffect(() => {
        function close(e) { if (!ctxRef.current?.contains(e.target)) setCtxChat(null); }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    async function startDM(userId) {
        try {
            const chat = await apiFetch('/api/chats', { method: 'POST', body: JSON.stringify({ type: 'dm', member_ids: [userId] }) }, token);
            onNewChat(chat); setTab('chats'); setQuery('');
        } catch {}
    }

    async function openSaved() {
        try {
            const chat = await apiFetch('/api/chats', { method: 'POST', body: JSON.stringify({ type: 'saved' }) }, token);
            onNewChat(chat);
        } catch {}
    }

    async function joinGroup(groupId) {
        try {
            const chat = await apiFetch(`/api/chats/${groupId}/join`, { method: 'POST' }, token);
            onNewChat(chat); setTab('chats');
        } catch (e) { alert(e.message); }
    }

    async function clearChat(chatId) {
        if (!confirm('Очистить историю сообщений?')) return;
        try {
            await apiFetch(`/api/chats/${chatId}/clear`, { method: 'DELETE' }, token);
            setCtxChat(null);
        } catch (e) { alert(e.message); }
    }

    async function deleteChat(chatId) {
        const chat = chats.find(c => c._id === chatId);
        const label = chat?.type === 'group' ? 'Покинуть группу?' : 'Удалить чат?';
        if (!confirm(label)) return;
        try {
            await apiFetch(`/api/chats/${chatId}`, { method: 'DELETE' }, token);
            onRemoveChat(chatId); setCtxChat(null);
        } catch (e) { alert(e.message); }
    }

    function onChatRightClick(e, chat) {
        e.preventDefault();
        const x = Math.min(e.clientX, window.innerWidth - 180);
        const y = Math.min(e.clientY, window.innerHeight - 120);
        setCtxChat({ chat, x, y });
    }

    function formatTime(dt) {
        if (!dt) return '';
        const d = new Date(dt), now = new Date();
        const diff = Math.floor((now - d) / 86400000);
        if (diff === 0) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        if (diff === 1) return 'Вчера';
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }

    function lastPreview(chat) {
        const lm = chat.last_message;
        if (!lm) return 'Нет сообщений';
        const txt = lm.text || (lm.files?.length ? '📎 Файл' : lm.forwarded_from ? '↪ Пересланное' : '');
        if (chat.type === 'dm' || chat.type === 'saved') return txt;
        return `${lm.from_user?.display_name?.split(' ')[0] || ''}: ${txt}`;
    }

    return (
        <div style={s.wrap}>
            {/* Шапка */}
            <div style={s.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }} onClick={() => setShowProfile(true)}>
                    <Avatar user={user} size={36} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{user?.display_name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>@{user?.username}</div>
                    </div>
                </div>
                <button style={s.iconBtn} title="Создать группу" onClick={() => setShowCreate(true)}>👥</button>
                <button style={s.iconBtn} title="Избранное"       onClick={openSaved}>⭐</button>
                <button style={s.iconBtn} title="Выйти"           onClick={onLogout}>🚪</button>
            </div>

            {/* Поиск */}
            <div style={{ padding: '8px 12px 4px' }}>
                <input
                    style={s.searchInput}
                    placeholder="🔍 Поиск людей и групп..."
                    value={tab === 'chats' ? '' : query}
                    onFocus={() => { setTab('search'); setQuery(''); }}
                    onChange={e => { setQuery(e.target.value); }}
                />
                {tab !== 'chats' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button style={{ ...s.pill, ...(tab === 'search' ? s.pillActive : {}) }} onClick={() => setTab('search')}>👤 Люди</button>
                        <button style={{ ...s.pill, ...(tab === 'public' ? s.pillActive : {}) }} onClick={() => setTab('public')}>🌐 Группы</button>
                        <button style={s.pill} onClick={() => { setTab('chats'); setQuery(''); }}>✕</button>
                    </div>
                )}
            </div>

            {/* Поиск людей */}
            {tab === 'search' && (
                <div style={s.list}>
                    {users.length === 0 && <div style={s.empty}>Нет пользователей</div>}
                    {users.map(u => (
                        <div key={u._id} style={s.row} onClick={() => startDM(u._id)}>
                            <Avatar user={u} size={40} />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.display_name}</div>
                                <div style={{ fontSize: 12, color: '#888' }}>@{u.username}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Публичные группы */}
            {tab === 'public' && (
                <div style={s.list}>
                    <input style={{ ...s.searchInput, margin: '0 12px 8px', width: 'calc(100% - 24px)' }}
                        placeholder="Поиск групп..." value={query} onChange={e => setQuery(e.target.value)} />
                    {pubGroups.length === 0 && <div style={s.empty}>Публичных групп нет</div>}
                    {pubGroups.map(g => {
                        const isMember = g.members?.some(m => String(m._id || m) === myId);
                        return (
                            <div key={g._id} style={{ ...s.row, justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <ChatAvatar chat={g} myId={myId} size={40} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                                        <div style={{ fontSize: 12, color: '#888' }}>{g.members?.length} участников</div>
                                    </div>
                                </div>
                                {isMember
                                    ? <button style={s.joinBtn} onClick={() => { onSelect(g); setTab('chats'); }}>Открыть</button>
                                    : <button style={s.joinBtn} onClick={() => joinGroup(g._id)}>Вступить</button>
                                }
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Список чатов */}
            {tab === 'chats' && (
                <div style={s.list}>
                    {chats.map(chat => {
                        const name   = getChatDisplayName(chat, myId);
                        const other  = chat.type === 'dm' ? chat.members?.find(m => String(m._id || m) !== myId) : null;
                        const isOn   = other && online?.has(String(other._id || other));
                        return (
                            <div key={chat._id}
                                style={{ ...s.chatItem, background: activeId === chat._id ? '#e3f2fd' : 'transparent' }}
                                onClick={() => onSelect(chat)}
                                onContextMenu={e => onChatRightClick(e, chat)}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <ChatAvatar chat={chat} myId={myId} size={42} />
                                    {isOn && <div style={s.onlineDot} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                        <span style={{ fontSize: 11, color: '#999', flexShrink: 0, marginLeft: 4 }}>{formatTime(chat.last_message?.createdAt)}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastPreview(chat)}</div>
                                </div>
                            </div>
                        );
                    })}
                    {chats.length === 0 && <div style={s.empty}>Нажми 🔍 чтобы найти людей</div>}
                </div>
            )}

            {/* Контекст-меню чата (правая кнопка) */}
            {ctxChat && (
                <div ref={ctxRef} style={{ position: 'fixed', left: ctxChat.x, top: ctxChat.y, zIndex: 500, background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.15)', minWidth: 160, border: '1px solid #eee', overflow: 'hidden' }}>
                    <CtxItem icon="🗑" label="Очистить чат" onClick={() => clearChat(ctxChat.chat._id)} />
                    <CtxItem icon="❌" label={ctxChat.chat.type === 'group' ? 'Покинуть группу' : 'Удалить чат'} onClick={() => deleteChat(ctxChat.chat._id)} red />
                </div>
            )}

            {showCreate  && <CreateGroupModal onClose={() => setShowCreate(false)}  onCreated={onNewChat} />}
            {showProfile && <ProfileModal     onClose={() => setShowProfile(false)} />}
        </div>
    );
}

function CtxItem({ icon, label, onClick, red }) {
    const [hov, setHov] = useState(false);
    return (
        <div onClick={onClick}
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: red ? '#e53935' : '#222', background: hov ? '#f5f5f5' : 'transparent' }}>
            <span style={{ fontSize: 15 }}>{icon}</span>{label}
        </div>
    );
}

const s = {
    wrap:       { width: 300, minWidth: 260, borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff', flexShrink: 0 },
    header:     { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderBottom: '1px solid #eee' },
    iconBtn:    { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 5px', borderRadius: 6 },
    searchInput:{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' },
    pill:       { background: '#f0f2f5', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#555' },
    pillActive: { background: '#e3f2fd', color: '#2196f3' },
    list:       { flex: 1, overflowY: 'auto' },
    chatItem:   { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', transition: 'background .1s' },
    row:        { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderRadius: 8 },
    empty:      { padding: 20, textAlign: 'center', color: '#999', fontSize: 14 },
    onlineDot:  { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#26a641', border: '2px solid #fff' },
    joinBtn:    { background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', flexShrink: 0 },
};

const mo = {
    overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    box:       { background: '#fff', borderRadius: 16, padding: 24, width: 360, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' },
    title:     { fontSize: 18, fontWeight: 700, marginBottom: 16 },
    label:     { fontSize: 12, color: '#666', display: 'block', marginBottom: 4 },
    input:     { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 10 },
    btnPri:    { flex: 1, padding: 9, background: '#2196f3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
    btnSec:    { flex: 1, padding: 9, background: '#f0f2f5', color: '#333', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
    typeBtn:   { flex: 1, padding: 7, background: '#f0f2f5', color: '#555', border: '2px solid transparent', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
    typeActive:{ background: '#e3f2fd', color: '#2196f3', borderColor: '#2196f3' },
};
