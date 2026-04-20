import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import { useState } from 'react';

export default function ChatList({ chats, activeId, onSelect, onNewChat, onLogout }) {
    const { user, token } = useAuth();
    const [search, setSearch]     = useState('');
    const [results, setResults]   = useState([]);
    const [showNew, setShowNew]   = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selected, setSelected]   = useState([]);
    const [mode, setMode]           = useState('dm'); // 'dm' | 'group'

    async function searchUsers(q) {
        setSearch(q);
        if (!q.trim()) { setResults([]); return; }
        try {
            const users = await apiFetch(`/api/users?q=${encodeURIComponent(q)}`, {}, token);
            setResults(users);
        } catch {}
    }

    async function startDM(userId) {
        try {
            const chat = await apiFetch('/api/chats', {
                method: 'POST',
                body: JSON.stringify({ type: 'dm', member_ids: [userId] }),
            }, token);
            onNewChat(chat);
            onSelect(chat);
            setSearch('');
            setResults([]);
        } catch {}
    }

    async function createGroup() {
        if (!groupName.trim() || !selected.length) return;
        try {
            const chat = await apiFetch('/api/chats', {
                method: 'POST',
                body: JSON.stringify({ type: 'group', name: groupName, member_ids: selected }),
            }, token);
            onNewChat(chat);
            onSelect(chat);
            setShowNew(false);
            setGroupName('');
            setSelected([]);
        } catch {}
    }

    function toggleSelect(id) {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }

    function formatTime(dt) {
        if (!dt) return '';
        const d = new Date(dt);
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    function lastMsgText(chat) {
        const lm = chat.last_message;
        if (!lm) return 'Нет сообщений';
        const who = lm.from_user?.display_name || '';
        const txt = lm.text || (lm.files?.length ? `📎 ${lm.files.length} файл(ов)` : '');
        return `${who}: ${txt}`;
    }

    return (
        <div style={s.wrap}>
            {/* Шапка */}
            <div style={s.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ ...s.avatar, background: user?.avatar_color }}>{user?.display_name?.[0]?.toUpperCase()}</div>
                    <span style={{ fontWeight: 600 }}>{user?.display_name}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button style={s.iconBtn} title="Новый чат" onClick={() => setShowNew(!showNew)}>✏️</button>
                    <button style={s.iconBtn} title="Выйти" onClick={onLogout}>🚪</button>
                </div>
            </div>

            {/* Поиск пользователей для DM */}
            <div style={{ padding: '8px 12px' }}>
                <input
                    style={s.searchInput}
                    placeholder="🔍 Найти пользователя..."
                    value={search}
                    onChange={e => searchUsers(e.target.value)}
                />
                {results.map(u => (
                    <div key={u._id} style={s.result} onClick={() => startDM(u._id)}>
                        <div style={{ ...s.avatar, background: u.avatar_color, fontSize: 13 }}>{u.display_name[0]}</div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{u.display_name}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>@{u.username}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Создание группы */}
            {showNew && (
                <div style={s.newGroup}>
                    <strong style={{ fontSize: 13 }}>Создать группу</strong>
                    <input
                        style={{ ...s.searchInput, marginTop: 8 }}
                        placeholder="Название группы"
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                    />
                    <input
                        style={s.searchInput}
                        placeholder="Найти участников..."
                        onChange={async e => {
                            const q = e.target.value;
                            if (!q.trim()) { setResults([]); return; }
                            const users = await apiFetch(`/api/users?q=${encodeURIComponent(q)}`, {}, token);
                            setResults(users);
                        }}
                    />
                    {results.map(u => (
                        <div key={u._id} style={{ ...s.result, background: selected.includes(u._id) ? '#e3f2fd' : '#fff' }}
                             onClick={() => toggleSelect(u._id)}>
                            <div style={{ ...s.avatar, background: u.avatar_color, fontSize: 13 }}>{u.display_name[0]}</div>
                            <span style={{ fontSize: 14 }}>{u.display_name}</span>
                            {selected.includes(u._id) && <span style={{ marginLeft: 'auto', color: '#2196f3' }}>✓</span>}
                        </div>
                    ))}
                    <button style={{ ...s.iconBtn, background: '#2196f3', color: '#fff', width: '100%', padding: '8px', borderRadius: 8, marginTop: 8 }}
                            onClick={createGroup}>
                        Создать группу ({selected.length} участн.)
                    </button>
                </div>
            )}

            {/* Список чатов */}
            <div style={s.list}>
                {chats.map(chat => (
                    <div key={chat._id}
                         style={{ ...s.chatItem, background: activeId === chat._id ? '#e3f2fd' : 'transparent' }}
                         onClick={() => onSelect(chat)}>
                        <div style={{ ...s.avatar, background: chat.type === 'group' ? '#8957e5' : '#2196f3' }}>
                            {chat.type === 'group' ? '👥' : chat.name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{chat.name}</span>
                                <span style={{ fontSize: 11, color: '#999' }}>{formatTime(chat.last_message?.createdAt)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lastMsgText(chat)}
                            </div>
                        </div>
                    </div>
                ))}
                {chats.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: 14 }}>
                        Нет чатов. Найдите пользователя для начала общения.
                    </div>
                )}
            </div>
        </div>
    );
}

const s = {
    wrap:        { width: 300, borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff' },
    header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #eee' },
    avatar:      { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 },
    iconBtn:     { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 6px', borderRadius: 6 },
    searchInput: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 4 },
    result:      { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer', borderRadius: 8, background: '#fff', marginBottom: 2 },
    newGroup:    { padding: '8px 12px', borderBottom: '1px solid #eee', background: '#f9f9f9' },
    list:        { flex: 1, overflowY: 'auto' },
    chatItem:    { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderRadius: 8, margin: '2px 6px' },
};
