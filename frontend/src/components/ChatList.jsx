import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch, fileUrl } from '../api';
import {
    IconNewGroup, IconBookmark, IconLogout,
    IconSearch, IconCamera, IconGlobe, IconLock, IconGroupAvatar,
    IconSaved, IconX, IconUser, IconTrash,
} from '../icons/Icons';
import ThemePanel from './ThemePanel';


function IconPalette({ size = 18, color = 'currentColor' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r="1.5" fill={color} stroke="none"/>
            <circle cx="17.5" cy="10.5" r="1.5" fill={color} stroke="none"/>
            <circle cx="8.5" cy="7.5" r="1.5" fill={color} stroke="none"/>
            <circle cx="6.5" cy="12.5" r="1.5" fill={color} stroke="none"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
    );
}

export function getChatDisplayName(chat, myId) {
    if (chat.type === 'saved') return 'Избранное';
    if (chat.type === 'dm') {
        const other = chat.members?.find(m => String(m._id || m) !== String(myId));
        return other?.display_name || chat.name || 'Чат';
    }
    return chat.name || 'Группа';
}

// ── Avatar ───────────────────────────────────────────────────────
function Avatar({ user, size = 36, radius = '50%' }) {
    const { colors } = useTheme();
    if (user?.avatar) return (
        <img src={fileUrl(user.avatar)} alt=""
            style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0 }} />
    );
    return (
        <div style={{ width: size, height: size, borderRadius: radius, background: user?.avatar_color || colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.38), flexShrink: 0 }}>
            {(user?.display_name || '?')[0].toUpperCase()}
        </div>
    );
}

// ── ChatAvatar — вместо эмодзи нормальные иконки ─────────────────
function ChatAvatar({ chat, myId, size = 40 }) {
    const { colors } = useTheme();

    if (chat.type === 'saved') return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconSaved size={Math.round(size * 0.46)} color="#fff" />
        </div>
    );

    if (chat.type === 'dm') {
        const other = chat.members?.find(m => String(m._id || m) !== String(myId));
        return <Avatar user={other} size={size} />;
    }

    // GROUP
    if (chat.avatar) return (
        <img src={fileUrl(chat.avatar)} alt=""
            style={{ width: size, height: size, borderRadius: size * 0.28, objectFit: 'cover', flexShrink: 0 }} />
    );

    // Заглушка группы — красивый градиент + иконка людей
    return (
        <div style={{
            width: size, height: size,
            borderRadius: size * 0.28,
            background: `linear-gradient(135deg, #7b1f3a 0%, #a33358 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 8px rgba(123,31,58,.3)',
        }}>
            <IconGroupAvatar size={Math.round(size * 0.52)} color="rgba(255,255,255,.92)" />
        </div>
    );
}

// ── ProfileModal ─────────────────────────────────────────────────
function ProfileModal({ onClose }) {
    const { user, token, updateUser } = useAuth();
    const { colors } = useTheme();
    const [name, setName] = useState(user?.display_name || '');
    const [busy, setBusy] = useState(false);
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

    const mo = getMo(colors);
    return (
        <div style={mo.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={mo.box} className="card-anim">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={mo.title}>Мой профиль</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex' }}>
                        <IconX size={18} color={colors.textMuted} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                        <Avatar user={user} size={80} />
                        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 26, height: 26, borderRadius: '50%', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.2)' }}>
                            <IconCamera size={13} color="#fff" />
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} />
                    <div style={{ fontSize: 13, color: colors.textMuted }}>@{user?.username}</div>
                </div>
                <label style={mo.label}>Отображаемое имя</label>
                <input className="input-focus" style={mo.input} value={name} onChange={e => setName(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button style={mo.btnSec} onClick={onClose}>Отмена</button>
                    <button style={mo.btnPri} className="send-btn-base" onClick={saveName} disabled={busy}>{busy ? '...' : 'Сохранить'}</button>
                </div>
            </div>
        </div>
    );
}

// ── CreateGroupModal ─────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated }) {
    const { token } = useAuth();
    const { colors } = useTheme();
    const [name, setName]         = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [query, setQuery]       = useState('');
    const [users, setUsers]       = useState([]);
    const [selected, setSelected] = useState([]);
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

    const mo = getMo(colors);
    return (
        <div style={mo.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={mo.box} className="card-anim">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={mo.title}>Создать группу</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex' }}>
                        <IconX size={18} color={colors.textMuted} />
                    </button>
                </div>

                {/* Аватар группы */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                        {grpAvatar
                            ? <img src={URL.createObjectURL(grpAvatar)} alt="" style={{ width: 72, height: 72, borderRadius: 20, objectFit: 'cover' }} />
                            : <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, #7b1f3a, #a33358)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(123,31,58,.3)' }}>
                                <IconGroupAvatar size={36} color="rgba(255,255,255,.9)" />
                              </div>
                        }
                        <div style={{ position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: '50%', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.2)' }}>
                            <IconCamera size={13} color="#fff" />
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && setGrpAvatar(e.target.files[0])} />
                </div>

                <input className="input-focus" style={mo.input} placeholder="Название группы" value={name} onChange={e => setName(e.target.value)} />

                {/* Тип */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button style={{ ...mo.typeBtn, ...(isPublic ? mo.typeActive : {}) }} onClick={() => setIsPublic(true)}>
                        <IconGlobe size={13} color={isPublic ? colors.accent : colors.textMuted} />
                        <span style={{ marginLeft: 5 }}>Публичная</span>
                    </button>
                    <button style={{ ...mo.typeBtn, ...(!isPublic ? mo.typeActive : {}) }} onClick={() => setIsPublic(false)}>
                        <IconLock size={13} color={!isPublic ? colors.accent : colors.textMuted} />
                        <span style={{ marginLeft: 5 }}>Приватная</span>
                    </button>
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
                    {isPublic ? 'Любой может найти и вступить через поиск' : 'Только по приглашению'}
                </div>

                <input className="input-focus" style={mo.input} placeholder="Поиск участников..." value={query} onChange={e => setQuery(e.target.value)} />
                <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
                    {users.map(u => (
                        <div key={u._id}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', cursor: 'pointer', borderRadius: 8, background: selected.includes(u._id) ? colors.accentLight : 'transparent' }}
                            onClick={() => setSelected(p => p.includes(u._id) ? p.filter(x => x !== u._id) : [...p, u._id])}>
                            <Avatar user={u} size={32} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>{u.display_name}</div>
                                <div style={{ fontSize: 11, color: colors.textMuted }}>@{u.username}</div>
                            </div>
                            {selected.includes(u._id) && (
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button style={mo.btnSec} onClick={onClose}>Отмена</button>
                    <button style={mo.btnPri} className="send-btn-base" onClick={create}>Создать ({selected.length})</button>
                </div>
            </div>
        </div>
    );
}

// ── ChatList ──────────────────────────────────────────────────────
export default function ChatList({ chats, activeId, onSelect, onNewChat, onLogout, online, onRemoveChat, unread = {} }) {
    const { user, token } = useAuth();
    const { colors } = useTheme();
    const [showPanel, setShowPanel] = useState(false);
    const [tab, setTab]             = useState('chats');
    const [query, setQuery]         = useState('');
    const [users, setUsers]         = useState([]);
    const [pubGroups, setPubGroups] = useState([]);
    const [showCreate, setShowCreate]   = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [ctxChat, setCtxChat]     = useState(null);
    const ctxRef = useRef(null);
    const myId = String(user?.id || user?._id || '');

    useEffect(() => {
        if (tab !== 'search') return;
        apiFetch(`/api/users?q=${encodeURIComponent(query)}`, {}, token).then(setUsers).catch(() => {});
    }, [tab, query]);

    useEffect(() => {
        if (tab !== 'public') return;
        apiFetch(`/api/chats/public?q=${encodeURIComponent(query)}`, {}, token).then(setPubGroups).catch(() => {});
    }, [tab, query]);

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
        try { await apiFetch(`/api/chats/${chatId}/clear`, { method: 'DELETE' }, token); setCtxChat(null); }
        catch (e) { alert(e.message); }
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

    const s = getS(colors);

    return (
        <div style={s.wrap}>
            {/* ── Шапка ── */}
            <div style={s.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', flex: 1, minWidth: 0 }} onClick={() => setShowProfile(true)}>
                    <Avatar user={user} size={36} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.display_name}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>@{user?.username}</div>
                    </div>
                </div>

                {/* Настройка визуала */}
                <IconBtn onClick={() => setShowPanel(p => !p)} title="Настройка визуала" colors={colors}>
                    <IconPalette size={17} color={colors.textSecondary} />
                </IconBtn>

                {/* Создать группу */}
                <IconBtn onClick={() => setShowCreate(true)} title="Создать группу" colors={colors}>
                    <IconNewGroup size={18} color={colors.textSecondary} />
                </IconBtn>

                {/* Избранное */}
                <IconBtn onClick={openSaved} title="Избранное" colors={colors}>
                    <IconBookmark size={17} color={colors.textSecondary} />
                </IconBtn>

                {/* Выйти */}
                <IconBtn onClick={onLogout} title="Выйти" colors={colors}>
                    <IconLogout size={17} color={colors.textSecondary} />
                </IconBtn>
            </div>

            {/* ── Поиск ── */}
            <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <IconSearch size={15} color={colors.textMuted} />
                    </div>
                    <input
                        className="input-focus"
                        style={{ ...s.searchInput, paddingLeft: 34 }}
                        placeholder="Поиск людей и групп..."
                        value={tab === 'chats' ? '' : query}
                        onFocus={() => { setTab('search'); setQuery(''); }}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
                {tab !== 'chats' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <TabPill active={tab === 'search'} onClick={() => setTab('search')} colors={colors}>
                            <IconUser size={12} color={tab === 'search' ? colors.accent : colors.textMuted} /> Люди
                        </TabPill>
                        <TabPill active={tab === 'public'} onClick={() => setTab('public')} colors={colors}>
                            <IconGlobe size={12} color={tab === 'public' ? colors.accent : colors.textMuted} /> Группы
                        </TabPill>
                        <TabPill onClick={() => { setTab('chats'); setQuery(''); }} colors={colors}>
                            <IconX size={12} color={colors.textMuted} />
                        </TabPill>
                    </div>
                )}
            </div>

            {/* ── Поиск людей ── */}
            {tab === 'search' && (
                <div style={s.list}>
                    {users.length === 0 && <div style={s.empty}>Нет пользователей</div>}
                    {users.map(u => (
                        <div key={u._id} style={s.row} className="chat-item-hover chat-item-anim" onClick={() => startDM(u._id)}>
                            <Avatar user={u} size={40} />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14, color: colors.textPrimary }}>{u.display_name}</div>
                                <div style={{ fontSize: 12, color: colors.textMuted }}>@{u.username}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Публичные группы ── */}
            {tab === 'public' && (
                <div style={s.list}>
                    <div style={{ padding: '0 12px 8px' }}>
                        <input className="input-focus" style={s.searchInput} placeholder="Поиск групп..." value={query} onChange={e => setQuery(e.target.value)} />
                    </div>
                    {pubGroups.length === 0 && <div style={s.empty}>Публичных групп нет</div>}
                    {pubGroups.map(g => {
                        const isMember = g.members?.some(m => String(m._id || m) === myId);
                        return (
                            <div key={g._id} style={{ ...s.row, justifyContent: 'space-between' }} className="chat-item-hover chat-item-anim">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <ChatAvatar chat={g} myId={myId} size={40} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: colors.textPrimary }}>{g.name}</div>
                                        <div style={{ fontSize: 12, color: colors.textMuted }}>{g.members?.length} участников</div>
                                    </div>
                                </div>
                                <button style={s.joinBtn} className="send-btn-base" onClick={() => isMember ? onSelect(g) && setTab('chats') : joinGroup(g._id)}>
                                    {isMember ? 'Открыть' : 'Вступить'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Список чатов ── */}
            {tab === 'chats' && (
                <div style={s.list}>
                    {chats.map((chat, idx) => {
                        const name  = getChatDisplayName(chat, myId);
                        const other = chat.type === 'dm' ? chat.members?.find(m => String(m._id || m) !== myId) : null;
                        const isOn  = other && online?.has(String(other._id || other));
                        const isActive = activeId === chat._id;
                        return (
                            <div key={chat._id}
                                className="chat-item-hover chat-item-anim"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '9px 14px', cursor: 'pointer',
                                    animationDelay: `${idx * 25}ms`,
                                    background: isActive ? colors.bgActive : 'transparent',
                                    borderLeft: `3px solid ${isActive ? colors.accent2 : 'transparent'}`,
                                    borderRight: '3px solid transparent',
                                }}
                                onClick={() => onSelect(chat)}
                                onContextMenu={e => onChatRightClick(e, chat)}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <ChatAvatar chat={chat} myId={myId} size={44} />
                                    {isOn && <div className="online-dot-pulse" style={s.onlineDot} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? colors.textAccent2 : colors.textPrimary }}>{name}</span>
                                        <span style={{ fontSize: 11, color: colors.textMuted, flexShrink: 0 }}>{formatTime(chat.last_message?.createdAt)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 2 }}>
                                        <div style={{ fontSize: 12, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{lastPreview(chat)}</div>
                                        {unread[chat._id] > 0 && (
                                            <div style={{ minWidth: 20, height: 20, borderRadius: 10, background: colors.accent, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0, animation: 'popIn 200ms cubic-bezier(.22,.68,0,1.4) both' }}>
                                                {unread[chat._id] > 99 ? '99+' : unread[chat._id]}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {chats.length === 0 && <div style={s.empty}>Используй поиск, чтобы найти людей</div>}
                </div>
            )}

            {/* ── Контекст-меню ── */}
            {ctxChat && (
                <div ref={ctxRef} className="card-anim" style={{ position: 'fixed', left: ctxChat.x, top: ctxChat.y, zIndex: 500, background: colors.bgContextMenu, borderRadius: 12, boxShadow: colors.shadow, minWidth: 170, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                    <CtxItem icon={<IconTrash size={15} color={colors.textContextItem} />} label="Очистить чат" colors={colors} onClick={() => clearChat(ctxChat.chat._id)} />
                    <CtxItem icon={<IconLogout size={15} color={colors.textContextRed} />} label={ctxChat.chat.type === 'group' ? 'Покинуть группу' : 'Удалить чат'} colors={colors} onClick={() => deleteChat(ctxChat.chat._id)} red />
                </div>
            )}

            {showPanel   && <ThemePanel onClose={() => setShowPanel(false)} />}
            {showCreate  && <CreateGroupModal onClose={() => setShowCreate(false)}  onCreated={onNewChat} />}
            {showProfile && <ProfileModal     onClose={() => setShowProfile(false)} />}
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────
function IconBtn({ onClick, title, children, colors }) {
    const [hov, setHov] = useState(false);
    return (
        <button onClick={onClick} title={title}
            className="icon-btn-base"
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ background: hov ? colors.bgHover : 'none', border: 'none', cursor: 'pointer', width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {children}
        </button>
    );
}

function TabPill({ children, active, onClick, colors }) {
    return (
        <button onClick={onClick}
            style={{ background: active ? colors.accentLight : colors.bgPill, border: active ? `1px solid ${colors.accentLight}` : '1px solid transparent', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: active ? colors.accent : colors.textSecondary, fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
            {children}
        </button>
    );
}

function CtxItem({ icon, label, onClick, red, colors }) {
    const [hov, setHov] = useState(false);
    return (
        <div onClick={onClick}
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: red ? colors.textContextRed : colors.textContextItem, background: hov ? colors.bgContextItem : 'transparent' }}>
            {icon}{label}
        </div>
    );
}

function getS(colors) {
    return {
        wrap:       { width: 300, minWidth: 260, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', height: '100vh', background: colors.bgSidebar, flexShrink: 0 },
        header:     { display: 'flex', alignItems: 'center', gap: 2, padding: '10px 10px 10px 14px', borderBottom: `1px solid ${colors.border}` },
        searchInput:{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${colors.border}`, fontSize: 14, boxSizing: 'border-box', background: colors.bgInput, color: colors.textPrimary, outline: 'none' },
        list:       { flex: 1, overflowY: 'auto' },
        row:        { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderRadius: 10, margin: '2px 6px' },
        empty:      { padding: 24, textAlign: 'center', color: colors.textMuted, fontSize: 14 },
        onlineDot:  { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#6dbf67', border: `2px solid ${colors.bgSidebar}` },
        joinBtn:    { background: colors.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', flexShrink: 0, fontWeight: 600 },
    };
}

function getMo(colors) {
    return {
        overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
        box:        { background: colors.bgModal, borderRadius: 18, padding: 24, width: 360, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${colors.border}`, boxShadow: '0 8px 32px rgba(0,0,0,.18)' },
        title:      { fontSize: 18, fontWeight: 700, color: colors.textPrimary },
        label:      { fontSize: 12, color: colors.textSecondary, display: 'block', marginBottom: 4 },
        input:      { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${colors.border}`, fontSize: 14, boxSizing: 'border-box', marginBottom: 10, background: colors.bgInput, color: colors.textPrimary, outline: 'none' },
        btnPri:     { flex: 1, padding: 10, background: colors.accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 700 },
        btnSec:     { flex: 1, padding: 10, background: colors.bgPill, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 10, fontSize: 14, cursor: 'pointer' },
        typeBtn:    { flex: 1, padding: '7px 10px', background: colors.bgPill, color: colors.textSecondary, border: `2px solid transparent`, borderRadius: 9, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        typeActive: { background: colors.accentLight, color: colors.textAccent, borderColor: colors.accent },
    };
}
