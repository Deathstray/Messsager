import { useState, useEffect, useRef, useMemo } from 'react';
import { IconAttach, IconSend, IconBack, IconReply, IconForward, IconCopy, IconStar, IconTrash, IconChat, IconUser, IconGlobe, IconLock, IconCamera, IconGroupAvatar } from '../icons/Icons';
import EmojiPicker from './EmojiPicker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch, fileUrl } from '../api';
import MessageBubble from './MessageBubble';
import { getChatDisplayName } from './ChatList';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎'];

function groupByDate(msgs) {
    const groups = [];
    let lastDate = '';
    for (const msg of msgs) {
        const date = new Date(msg.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        if (date !== lastDate) { groups.push({ date, msgs: [] }); lastDate = date; }
        groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
}

function copyPlainText(text) {
    const value = String(text || '');
    if (!value) return Promise.resolve();
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    return new Promise((resolve, reject) => {
        const ta = document.createElement('textarea');
        ta.value = value; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.focus(); ta.select();
        try { const ok = document.execCommand('copy'); document.body.removeChild(ta); ok ? resolve() : reject(); }
        catch (err) { document.body.removeChild(ta); reject(err); }
    });
}

function MsgContextMenu({ x, y, msg, isMe, onClose, onReply, onForward, onSave, onReact, onDelete, onCopy }) {
    const { colors } = useTheme();
    const ref = useRef(null);
    useEffect(() => {
        const close = e => { if (!ref.current?.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', close);
        document.addEventListener('scroll', close, true);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('scroll', close, true); };
    }, [onClose]);
    return (
        <div ref={ref} className="card-anim" style={{ position: 'fixed', left: x, top: y, zIndex: 1000, background: colors.bgContextMenu, borderRadius: 14, boxShadow: colors.shadow, minWidth: 210, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
                {REACTIONS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => { onReact(emoji); onClose(); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, padding: 2 }}>{emoji}</button>
                ))}
            </div>
            <MenuItem icon={<IconReply size={15} color={colors.textContextItem} />} label="Ответить" colors={colors} onClick={() => { onReply(); onClose(); }} />
            <MenuItem icon={<IconForward size={15} color={colors.textContextItem} />} label="Переслать" colors={colors} onClick={() => { onForward(); onClose(); }} />
            <MenuItem icon={<IconCopy size={15} color={colors.textContextItem} />} label="Копировать" colors={colors} onClick={() => { onCopy(); onClose(); }} />
            <MenuItem icon={<IconStar size={15} color={colors.textContextItem} />} label="В избранное" colors={colors} onClick={() => { onSave(); onClose(); }} />
            {isMe && <MenuItem icon={<IconTrash size={15} color={colors.textContextRed} />} label="Удалить" colors={colors} red onClick={() => { onDelete(); onClose(); }} />}
        </div>
    );
}

function MenuItem({ icon, label, onClick, red, colors }) {
    const [hover, setHover] = useState(false);
    return (
        <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
             style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: red ? colors.textContextRed : colors.textContextItem, background: hover ? colors.bgContextItem : 'transparent' }}>
            {icon}<span>{label}</span>
        </div>
    );
}

function ForwardModal({ onClose, onForward, allChats, myId }) {
    const { colors } = useTheme();
    const [q, setQ] = useState('');
    const filtered = useMemo(() => allChats.filter(c => getChatDisplayName(c, myId).toLowerCase().includes(q.toLowerCase())), [allChats, myId, q]);
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="card-anim" style={{ width: 360, maxWidth: '100%', maxHeight: '80vh', overflow: 'auto', background: colors.bgModal, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: colors.textPrimary, marginBottom: 12 }}>Переслать в чат</div>
                <input className="input-focus" value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск" style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${colors.border}`, background: colors.bgInput, color: colors.textPrimary, marginBottom: 12, outline: 'none' }} />
                <div style={{ display: 'grid', gap: 8 }}>
                    {filtered.map(chat => (
                        <button key={chat._id} type="button" onClick={() => { onForward(chat._id); onClose(); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%', padding: 10, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bgSidebar, cursor: 'pointer', color: colors.textPrimary }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: colors.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                                {getChatDisplayName(chat, myId)[0]?.toUpperCase() || 'Ч'}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getChatDisplayName(chat, myId)}</div>
                                <div style={{ fontSize: 12, color: colors.textMuted }}>{chat.type === 'group' ? 'Группа' : chat.type === 'saved' ? 'Избранное' : 'Личный чат'}</div>
                            </div>
                        </button>
                    ))}
                </div>
                <button type="button" onClick={onClose} style={{ width: '100%', marginTop: 12, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bgPill, color: colors.textSecondary, cursor: 'pointer' }}>Отмена</button>
            </div>
        </div>
    );
}

function UserProfileModal({ userId, onClose, onBlockToggle }) {
    const { token } = useAuth();
    const { colors } = useTheme();
    const [profile, setProfile] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        let alive = true;
        apiFetch(`/api/users/${userId}`, {}, token).then(data => { if (alive) setProfile(data); }).catch(() => {});
        return () => { alive = false; };
    }, [token, userId]);
    async function toggleBlock() {
        setBusy(true);
        try { const data = await onBlockToggle(userId); setProfile(prev => prev ? { ...prev, blocked_by_me: data.blocked } : prev); }
        finally { setBusy(false); }
    }
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 450, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="card-anim" style={{ width: 360, maxWidth: '100%', background: colors.bgModal, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary }}>Профиль</div>
                    <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: colors.textMuted, fontSize: 20 }}>×</button>
                </div>
                {profile ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                            {profile.avatar ? <img src={fileUrl(profile.avatar)} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} /> :
                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: profile.avatar_color || colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30, fontWeight: 800 }}>{profile.display_name?.[0]?.toUpperCase() || '?'}</div>}
                            <div><div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary }}>{profile.display_name}</div><div style={{ fontSize: 13, color: colors.textMuted }}>{profile.blocked_by_me ? 'Заблокирован' : 'Пользователь'}</div></div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={toggleBlock} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}`, background: profile.blocked_by_me ? colors.bgPill : colors.accent, color: profile.blocked_by_me ? colors.textSecondary : '#fff', cursor: 'pointer', fontWeight: 700 }}>{profile.blocked_by_me ? 'Разблокировать' : 'Заблокировать'}</button>
                            <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bgPill, color: colors.textSecondary, cursor: 'pointer' }}>Закрыть</button>
                        </div>
                    </>
                ) : <div style={{ color: colors.textMuted }}>Загрузка...</div>}
            </div>
        </div>
    );
}

function GroupPanel({ chat, myId, online, onClose, isCreator, token, onAction }) {
    const { colors } = useTheme();
    const members = chat.members || [];
    const isPublic = chat.is_public;
    const [inviteQuery, setInviteQuery] = useState('');
    const [inviteUsers, setInviteUsers] = useState([]);
    const [showInvite, setShowInvite] = useState(false);

    useEffect(() => {
        if (!showInvite) return;
        apiFetch(`/api/users?q=${encodeURIComponent(inviteQuery)}`, {}, token).then(users => {
            const memberIds = members.map(m => String(m._id || m));
            setInviteUsers(users.filter(u => !memberIds.includes(String(u._id))));
        }).catch(() => {});
    }, [inviteQuery, showInvite]);

    async function inviteUser(userId) {
        try {
            await apiFetch(`/api/chats/${chat._id}/members`, { method: 'PUT', body: JSON.stringify({ user_id: userId }) }, token);
            setShowInvite(false);
        } catch (e) { alert(e.message); }
    }

    const canInvite = isPublic || isCreator;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 450, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="card-anim" style={{ width: 440, maxWidth: '100%', maxHeight: '85vh', overflow: 'auto', background: colors.bgModal, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary }}>Управление группой</div>
                    <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: colors.textMuted, fontSize: 20 }}>×</button>
                </div>
                <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
                    {isPublic ? '🌐 Публичная группа — любой участник может приглашать' : '🔒 Приватная группа — только создатель может приглашать'}
                </div>

                {canInvite && (
                    <div style={{ marginBottom: 14 }}>
                        {!showInvite ? (
                            <button type="button" onClick={() => setShowInvite(true)}
                                    style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.accentLight, color: colors.accent, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                                + Пригласить участника
                            </button>
                        ) : (
                            <div>
                                <input className="input-focus" autoFocus value={inviteQuery} onChange={e => setInviteQuery(e.target.value)} placeholder="Найти пользователя..."
                                       style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${colors.border}`, background: colors.bgInput, color: colors.textPrimary, outline: 'none', marginBottom: 8 }} />
                                <div style={{ maxHeight: 160, overflowY: 'auto', display: 'grid', gap: 6 }}>
                                    {inviteUsers.map(u => (
                                        <div key={u._id} onClick={() => inviteUser(u._id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', background: colors.bgSidebar, border: `1px solid ${colors.border}` }}>
                                            {u.avatar ? <img src={fileUrl(u.avatar)} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> :
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.avatar_color || colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{u.display_name?.[0]?.toUpperCase()}</div>}
                                            <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{u.display_name}</span>
                                        </div>
                                    ))}
                                    {inviteUsers.length === 0 && <div style={{ color: colors.textMuted, padding: 8, textAlign: 'center', fontSize: 13 }}>Нет пользователей</div>}
                                </div>
                                <button type="button" onClick={() => setShowInvite(false)} style={{ marginTop: 8, width: '100%', padding: 8, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bgPill, color: colors.textSecondary, cursor: 'pointer' }}>Отмена</button>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'grid', gap: 10 }}>
                    {members.map(member => {
                        const id = String(member._id || member);
                        const isMe = id === String(myId);
                        const isOwner = String(chat.created_by?._id || chat.created_by) === id;
                        const isOnline = online?.has(id);
                        return (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.bgSidebar }}>
                                {member.avatar ? <img src={fileUrl(member.avatar)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} /> :
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: member.avatar_color || colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{member.display_name?.[0]?.toUpperCase() || '?'}</div>}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 700, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.display_name}</span>
                                        {isOwner && <span style={{ fontSize: 11, color: colors.accent, fontWeight: 700 }}>создатель</span>}
                                        {isOnline && !isOwner && <span style={{ fontSize: 12, color: colors.textOnlineStatus }}>● online</span>}
                                        {isMe && <span style={{ fontSize: 12, color: colors.textMuted }}>(вы)</span>}
                                    </div>
                                </div>
                                {isCreator && !isMe && !isOwner && (
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button type="button" onClick={() => onAction('kick', id)} style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bgPill, color: colors.textSecondary, cursor: 'pointer', fontSize: 12 }}>Кик</button>
                                        <button type="button" onClick={() => onAction('mute', id)} style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bgPill, color: colors.textSecondary, cursor: 'pointer', fontSize: 12 }}>Мут</button>
                                        <button type="button" onClick={() => onAction('ban', id)} style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bgPill, color: colors.textContextRed, cursor: 'pointer', fontSize: 12 }}>Бан</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function ScreenShareModal({ session, colors, localVideoRef, remoteVideoRef, onClose, onStop, onLeave }) {
    const isHost = session.role === 'host';
    const videoStyle = { width: '100%', flex: 1, minHeight: 0, background: '#000', borderRadius: 14, objectFit: 'contain' };
    const viewerName = session.viewerName || 'Никто';
    const viewerAvatar = session.viewerAvatar || null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 470, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && (isHost ? onStop() : onLeave())}>
            <div className="card-anim" style={{ width: 'min(92vw, 980px)', height: 'min(82vh, 760px)', minWidth: 460, minHeight: 360, background: colors.bgModal, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18, resize: 'both', overflow: 'auto', display: 'flex', flexDirection: 'column', boxShadow: colors.shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary }}>{isHost ? 'Демонстрация экрана' : 'Просмотр демонстрации'}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{session.status === 'live' ? 'Подключение активно' : 'Ожидание подключения'}</div>
                    </div>
                    <button type="button" onClick={() => isHost ? onStop() : onLeave()} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: colors.textMuted, fontSize: 22 }}>×</button>
                </div>
                <div style={{ display: 'grid', gap: 12, flex: 1, minHeight: 0, gridTemplateColumns: isHost ? 'minmax(0,1fr) 280px' : 'minmax(0,1fr) 220px' }}>
                    {isHost ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                                <div style={{ fontSize: 13, color: colors.textSecondary }}>Ваш экран</div>
                                <video ref={localVideoRef} autoPlay muted playsInline style={videoStyle} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                                <div style={{ fontSize: 13, color: colors.textSecondary }}>Смотрят сейчас</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.bgSidebar }}>
                                    {viewerAvatar ? <img src={fileUrl(viewerAvatar)} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> :
                                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: colors.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{viewerName[0]?.toUpperCase() || '?'}</div>}
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: colors.textPrimary }}>{viewerName}</div>
                                        <div style={{ fontSize: 12, color: colors.textMuted }}>{session.viewerId ? 'Зритель подключён' : 'Никто не смотрит'}</div>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }} />
                                <button type="button" onClick={onStop} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: colors.accent, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Завершить</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                                <div style={{ fontSize: 13, color: colors.textSecondary }}>Трансляция</div>
                                <video ref={remoteVideoRef} autoPlay playsInline style={videoStyle} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ flex: 1 }} />
                                <button type="button" onClick={onLeave} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: colors.bgPill, color: colors.textSecondary, fontWeight: 800, cursor: 'pointer' }}>Выйти</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChatWindow({ chat, socket, online, incomingMsg, incomingReaction, clearedChatId, allChats, onNewChat, onBack, onRemoveChat }) {
    const { user, token } = useAuth();
    const { colors } = useTheme();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [typing, setTyping] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dateGroups, setDateGroups] = useState([]);
    const [replyTo, setReplyTo] = useState(null);
    const [ctxMenu, setCtxMenu] = useState(null);
    const [fwdMsg, setFwdMsg] = useState(null);
    const [sendAnim, setSendAnim] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [profileId, setProfileId] = useState(null);
    const [showGroupPanel, setShowGroupPanel] = useState(false);
    const [screenSession, setScreenSession] = useState(null);
    const fileRef = useRef(null);
    const bottomRef = useRef(null);
    const typingTimer = useRef(null);
    const screenSessionRef = useRef(null);
    const screenPcRef = useRef(null);
    const screenLocalStreamRef = useRef(null);
    const screenRemoteStreamRef = useRef(null);
    const screenLocalVideoRef = useRef(null);
    const screenRemoteVideoRef = useRef(null);
    const screenPendingViewerRef = useRef(null);
    const myId = String(user?.id || user?._id || '');

    useEffect(() => { screenSessionRef.current = screenSession; }, [screenSession]);

    const isGroup = chat?.type === 'group';
    const isSaved = chat?.type === 'saved';
    const chatName = chat ? getChatDisplayName(chat, myId) : '';
    const other = chat && !isGroup && !isSaved ? chat.members?.find(m => String(m._id || m) !== myId) : null;
    const otherId = other ? String(other._id || other) : null;
    const isOnline = otherId ? online?.has(otherId) : false;
    const isCreator = !!(chat && isGroup && String(chat.created_by?._id || chat.created_by) === myId);
    const isMember = !!(chat && isGroup && chat.members?.some(m => String(m._id || m) === myId));
    const canOpenGroupPanel = isGroup && (isCreator || isMember);

    function rebuild(list) { setDateGroups(groupByDate(list)); }
    function upsert(list, msg) {
        const idx = list.findIndex(x => x._id === msg._id);
        if (idx >= 0) { const next = [...list]; next[idx] = msg; return next; }
        return [...list, msg];
    }

    useEffect(() => {
        if (!chat) return;
        setLoading(true);
        apiFetch(`/api/chats/${chat._id}/messages`, {}, token)
            .then(data => { setMessages(data); rebuild(data); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); })
            .catch(() => {})
            .finally(() => setLoading(false));
        return () => { setMessages([]); setDateGroups([]); setReplyTo(null); setCtxMenu(null); setFwdMsg(null); setTyping(null); cleanupScreenShare(false); };
    }, [chat?._id, token]);

    useEffect(() => {
        if (!incomingMsg || incomingMsg.chatId !== chat?._id) return;
        setMessages(prev => { const next = upsert(prev, incomingMsg.message); rebuild(next); return next; });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, [incomingMsg, chat?._id]);

    useEffect(() => {
        if (!incomingReaction || incomingReaction.chatId !== chat?._id) return;
        setMessages(prev => { const next = prev.map(m => m._id === incomingReaction.messageId ? { ...m, reactions: incomingReaction.reactions } : m); rebuild(next); return next; });
    }, [incomingReaction, chat?._id]);

    useEffect(() => {
        if (!clearedChatId || clearedChatId.chatId !== chat?._id) return;
        setMessages([]); setDateGroups([]);
    }, [clearedChatId, chat?._id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dateGroups]);

    useEffect(() => {
        if (!socket || !chat) return;
        const onDel = ({ chatId, messageId }) => {
            if (chatId !== chat._id) return;
            setMessages(prev => { const next = prev.filter(m => m._id !== messageId); rebuild(next); return next; });
        };
        const onTypingStart = ({ userId, chatId, displayName }) => { if (chatId === chat._id && userId !== myId) setTyping(displayName || 'Кто-то'); };
        const onTypingStop = ({ userId, chatId }) => { if (chatId === chat._id && userId !== myId) setTyping(null); };
        const onScreenJoined = async ({ sessionId, viewerId, viewerName, viewerAvatar, hostId }) => {
            const sess = screenSessionRef.current;
            if (!sess || String(sessionId) !== String(sess.sessionId)) return;
            if (sess.role === 'host') {
                setScreenSession(prev => prev ? { ...prev, viewerId, viewerName, viewerAvatar } : prev);
                screenPendingViewerRef.current = { viewerId };
                if (screenPcRef.current && screenLocalStreamRef.current) {
                    try {
                        const offer = await screenPcRef.current.createOffer();
                        await screenPcRef.current.setLocalDescription(offer);
                        socket.emit('screen:signal', { sessionId, data: { type: 'offer', sdp: offer.sdp } });
                    } catch {}
                }
            }
        };
        const onScreenSignal = async ({ sessionId, data }) => {
            const sess = screenSessionRef.current;
            if (!sess || String(sessionId) !== String(sess.sessionId) || !screenPcRef.current) return;
            try {
                if (data.type === 'offer') {
                    await screenPcRef.current.setRemoteDescription({ type: 'offer', sdp: data.sdp });
                    const answer = await screenPcRef.current.createAnswer();
                    await screenPcRef.current.setLocalDescription(answer);
                    socket.emit('screen:signal', { sessionId, data: { type: 'answer', sdp: answer.sdp } });
                } else if (data.type === 'answer') {
                    await screenPcRef.current.setRemoteDescription({ type: 'answer', sdp: data.sdp });
                } else if (data.type === 'ice' && data.candidate) {
                    await screenPcRef.current.addIceCandidate(data.candidate);
                }
            } catch {}
        };
        const onScreenEnded = ({ sessionId }) => {
            if (String(sessionId) === String(screenSessionRef.current?.sessionId)) cleanupScreenShare(false);
        };
        const onScreenViewerLeft = ({ sessionId }) => {
            if (String(sessionId) === String(screenSessionRef.current?.sessionId))
                setScreenSession(prev => prev ? { ...prev, viewerId: null, viewerName: '', viewerAvatar: null } : prev);
        };
        socket.on('message:deleted', onDel);
        socket.on('typing:start', onTypingStart);
        socket.on('typing:stop', onTypingStop);
        socket.on('screen:joined', onScreenJoined);
        socket.on('screen:signal', onScreenSignal);
        socket.on('screen:ended', onScreenEnded);
        socket.on('screen:viewer_left', onScreenViewerLeft);
        return () => {
            socket.off('message:deleted', onDel);
            socket.off('typing:start', onTypingStart);
            socket.off('typing:stop', onTypingStop);
            socket.off('screen:joined', onScreenJoined);
            socket.off('screen:signal', onScreenSignal);
            socket.off('screen:ended', onScreenEnded);
            socket.off('screen:viewer_left', onScreenViewerLeft);
        };
    }, [socket, chat?._id, myId]);

    function handleInput(value) {
        setText(value);
        if (!socket || !chat) return;
        socket.emit('typing:start', { chatId: chat._id });
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => socket.emit('typing:stop', { chatId: chat._id }), 1500);
    }

    async function handleSend(e) {
        e?.preventDefault();
        if (!text.trim() && !files.length) return;
        const fd = new FormData();
        if (text.trim()) fd.append('text', text.trim());
        if (replyTo) fd.append('reply_to', replyTo._id);
        for (const file of files) fd.append('files', file);
        setText(''); setFiles([]); setReplyTo(null);
        socket?.emit('typing:stop', { chatId: chat._id });
        setSendAnim(true); setTimeout(() => setSendAnim(false), 250);
        try {
            await apiFetch(`/api/chats/${chat._id}/messages`, { method: 'POST', body: fd }, token);
        } catch (err) { alert(err.message); }
    }

    async function handleDelete(msgId) {
        if (!confirm('Удалить сообщение?')) return;
        try { await apiFetch(`/api/messages/${msgId}`, { method: 'DELETE' }, token); }
        catch (err) { alert(err.message); }
    }

    async function handleReact(msgId, emoji) {
        try {
            const updated = await apiFetch(`/api/messages/${msgId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }, token);
            setMessages(prev => { const next = prev.map(m => m._id === msgId ? { ...m, reactions: updated.reactions } : m); rebuild(next); return next; });
        } catch {}
    }

    async function handleForward(msgId, targetChatId) {
        try { await apiFetch(`/api/messages/${msgId}/forward`, { method: 'POST', body: JSON.stringify({ chat_id: targetChatId }) }, token); }
        catch (err) { alert(err.message); }
    }

    async function handleSave(msgId) {
        try { await apiFetch(`/api/messages/${msgId}/save`, { method: 'POST' }, token); }
        catch (err) { alert(err.message); }
    }

    function handleCtxMenu(e, msg) {
        e.preventDefault();
        setCtxMenu({ x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - 360), msg });
    }

    async function handleBlockToggle(userId) {
        const data = await apiFetch(`/api/users/${userId}/block`, { method: 'POST' }, token);
        return data;
    }

    function createScreenPeer(role) {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.onicecandidate = e => {
            if (e.candidate && screenSessionRef.current?.sessionId)
                socket?.emit('screen:signal', { sessionId: screenSessionRef.current.sessionId, data: { type: 'ice', candidate: e.candidate } });
        };
        if (role === 'viewer') {
            pc.ontrack = e => {
                const stream = e.streams?.[0];
                if (!stream) return;
                screenRemoteStreamRef.current = stream;
                if (screenRemoteVideoRef.current) screenRemoteVideoRef.current.srcObject = stream;
                setScreenSession(prev => prev ? { ...prev, status: 'live' } : prev);
            };
        }
        screenPcRef.current = pc;
        return pc;
    }

    async function cleanupScreenShare(notify = true) {
        const session = screenSessionRef.current;
        const sessionId = session?.sessionId;
        if (notify && sessionId) {
            if (session?.role === 'viewer') socket?.emit('screen:leave', { sessionId });
            else socket?.emit('screen:end', { sessionId });
        }
        try { screenPcRef.current?.close(); } catch {}
        screenPcRef.current = null;
        try { screenLocalStreamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
        screenLocalStreamRef.current = null;
        screenRemoteStreamRef.current = null;
        screenPendingViewerRef.current = null;
        if (screenLocalVideoRef.current) screenLocalVideoRef.current.srcObject = null;
        if (screenRemoteVideoRef.current) screenRemoteVideoRef.current.srcObject = null;
        setScreenSession(null);
    }

    async function startScreenShare() {
        if (!chat || !socket) return;
        try {
            const sessionId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `screen-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const fd = new FormData();
            fd.append('text', '📺 Демонстрация экрана'); fd.append('kind', 'screen_invite');
            fd.append('screen_session', JSON.stringify({ session_id: sessionId, status: 'waiting' }));
            const msg = await apiFetch(`/api/chats/${chat._id}/messages`, { method: 'POST', body: fd }, token);
            setMessages(prev => { const next = upsert(prev, msg); rebuild(next); return next; });
            socket.emit('screen:register', { sessionId, chatId: chat._id, messageId: msg._id });
            setScreenSession({ sessionId, role: 'host', status: 'waiting', messageId: msg._id, viewerId: null, viewerName: '', viewerAvatar: null });
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            screenLocalStreamRef.current = stream;
            if (screenLocalVideoRef.current) screenLocalVideoRef.current.srcObject = stream;
            const pc = createScreenPeer('host');
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            stream.getVideoTracks()[0].onended = () => cleanupScreenShare(true);
            if (screenPendingViewerRef.current) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('screen:signal', { sessionId, data: { type: 'offer', sdp: offer.sdp } });
            }
        } catch (err) { alert(err.message || 'Не удалось начать демонстрацию'); await cleanupScreenShare(false); }
    }

    async function joinScreenShare(sessionId) {
        if (!chat || !socket || !sessionId) return;
        try {
            if (screenSessionRef.current?.role === 'viewer') await cleanupScreenShare(false);
            setScreenSession({ sessionId, role: 'viewer', status: 'joining', messageId: null, viewerId: myId, viewerName: user?.display_name || '', viewerAvatar: user?.avatar || null });
            createScreenPeer('viewer');
            socket.emit('screen:join', { sessionId, chatId: chat._id });
        } catch (err) { alert(err.message || 'Не удалось подключиться'); }
    }

    async function handleModeration(action, memberId) {
        if (!isGroup || !isCreator) return;
        let minutes = 0;
        if (action === 'mute' || action === 'ban') {
            const value = prompt('На сколько минут? (0 = навсегда)', action === 'mute' ? '60' : '0');
            if (value === null) return;
            minutes = Number(value || 0);
            if (Number.isNaN(minutes) || minutes < 0) minutes = 0;
        }
        try {
            await apiFetch(`/api/chats/${chat._id}/moderate`, { method: 'POST', body: JSON.stringify({ action, user_id: memberId, minutes }) }, token);
        } catch (err) { alert(err.message); }
    }

    const IconStar = ({ size = 18, color = 'currentColor' }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
    );

    if (!chat) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: colors.bgEmpty }}>
                <IconChat size={68} color={colors.accentLight} />
                <div style={{ fontSize: 18, color: colors.textMuted, fontWeight: 500 }}>Выберите чат</div>
                <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, opacity: 0.7 }}>Выберите диалог из списка слева</div>
            </div>
        );
    }

    const headerAvatar = isSaved ? (
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconStar size={18} color="#fff" />
        </div>
    ) : isGroup ? (
        chat.avatar ? <img src={fileUrl(chat.avatar)} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} /> :
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#7b1f3a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconGroupAvatar size={22} color="#fff" /></div>
    ) : other?.avatar ? (
        <img src={fileUrl(other.avatar)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    ) : (
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: other?.avatar_color || colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, flexShrink: 0 }}>{chatName?.[0]?.toUpperCase() || '?'}</div>
    );

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0, position: 'relative' }} onClick={() => setCtxMenu(null)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: `1px solid ${colors.border}`, background: colors.bgHeader, flexShrink: 0, boxShadow: colors.shadowHeader }}>
                <button type="button" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: colors.textSecondary, display: typeof window !== 'undefined' && window.innerWidth <= 640 ? 'flex' : 'none', alignItems: 'center' }} className="icon-btn-base" onClick={onBack}>
                    <IconBack size={22} color={colors.textSecondary} />
                </button>
                <button type="button" onClick={() => !isGroup && !isSaved && otherId && setProfileId(otherId)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: isGroup || isSaved ? 'default' : 'pointer' }}>
                    {headerAvatar}
                </button>
                <div style={{ flex: 1, minWidth: 0, cursor: !isGroup && !isSaved ? 'pointer' : 'default' }} onClick={() => !isGroup && !isSaved && otherId && setProfileId(otherId)}>
                    <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: colors.textPrimary }}>{chatName}</div>
                    <div style={{ fontSize: 12, color: isOnline ? colors.textOnlineStatus : colors.textMuted }}>
                        {isSaved ? 'Сохранённые сообщения' : isGroup ? `${chat.members?.length || 0} участников` : isOnline ? '● В сети' : '○ Не в сети'}
                    </div>
                </div>
                {!isSaved && !isGroup && otherId && (
                    <button type="button" className="icon-btn-base" onClick={() => setProfileId(otherId)} style={{ border: 'none', background: colors.bgPill, borderRadius: 10, width: 36, height: 36, cursor: 'pointer' }}>
                        <IconUser size={18} color={colors.textSecondary} />
                    </button>
                )}
                {isGroup && canOpenGroupPanel && (
                    <button type="button" className="icon-btn-base" onClick={() => setShowGroupPanel(true)} style={{ border: 'none', background: colors.bgPill, borderRadius: 10, width: 36, height: 36, cursor: 'pointer' }} title="Участники">
                        <IconGroupAvatar size={18} color={colors.textSecondary} />
                    </button>
                )}
                {!isGroup && !isSaved && otherId && (
                    <button type="button" className="icon-btn-base" onClick={async () => { await handleBlockToggle(otherId); setProfileId(otherId); }} style={{ border: 'none', background: colors.bgPill, borderRadius: 10, width: 36, height: 36, cursor: 'pointer' }} title="Блокировать">
                        <IconLock size={16} color={colors.textSecondary} />
                    </button>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2, background: colors.bgChat }}>
                {loading && <div style={{ textAlign: 'center', color: colors.textMuted, padding: 20 }}>Загрузка...</div>}
                {dateGroups.map(group => (
                    <div key={group.date}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px 0' }}>
                            <span style={{ background: colors.bgDateLabel, color: colors.textDateLabel, fontSize: 11, padding: '3px 12px', borderRadius: 10, userSelect: 'none', pointerEvents: 'none' }}>{group.date}</span>
                        </div>
                        {group.msgs.map(msg => (
                            <MessageBubble key={msg._id} msg={msg} isGroup={isGroup} myId={myId} onDelete={handleDelete} onReact={handleReact} onContextMenu={handleCtxMenu} onJoinScreen={joinScreenShare} />
                        ))}
                    </div>
                ))}
                {messages.length === 0 && !loading && <div style={{ textAlign: 'center', color: colors.textMuted, padding: 20 }}>Нет сообщений. Напишите первым!</div>}
                {typing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', marginTop: 4 }}>
                        <div style={{ display: 'flex', gap: 4, background: colors.bgMsgIn, padding: '10px 14px', borderRadius: 16, borderBottomLeftRadius: 4 }}>
                            <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: colors.accent }} />
                            <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: colors.accent }} />
                            <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: colors.accent }} />
                        </div>
                        <span style={{ fontSize: 12, color: colors.textMuted }}>{typing} печатает...</span>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {replyTo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: colors.bgReplyBar, borderTop: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.accent}`, flexShrink: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: colors.textAccent }}>↩️ {replyTo.from_user?.display_name}</div>
                        <div style={{ fontSize: 12, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text || '📎 Файл'}</div>
                    </div>
                    <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: colors.textMuted, padding: 0 }} onClick={() => setReplyTo(null)}>✕</button>
                </div>
            )}

            {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '7px 14px', background: colors.bgForm, borderTop: `1px solid ${colors.border}`, flexShrink: 0 }}>
                    {files.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: colors.bgFileChip, borderRadius: 12, padding: '3px 8px', fontSize: 12, color: colors.textPrimary }}>
                            <span>{f.type?.startsWith('image/') ? '🖼' : f.type?.startsWith('video/') ? '🎬' : '📎'}</span>
                            <span style={{ fontSize: 11, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                            <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: colors.textMuted, padding: 0 }}>✕</button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: colors.bgForm, borderTop: `1px solid ${colors.border}`, flexShrink: 0, position: 'relative' }}>
                {showEmoji && <EmojiPicker onSelect={emoji => { setText(t => t + emoji); setShowEmoji(false); }} onClose={() => setShowEmoji(false)} />}
                <button type="button" onClick={() => setShowEmoji(p => !p)} className="icon-btn-base" style={{ background: showEmoji ? colors.accentLight : 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18 }}>😊</span>
                </button>
                <label style={{ background: 'none', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', cursor: 'pointer', color: colors.textSecondary, padding: '4px' }} className="icon-btn-base">
                    <IconAttach size={20} color={colors.textSecondary} />
                    <input ref={fileRef} type="file" multiple accept="*/*" style={{ display: 'none' }} onChange={e => setFiles(p => [...p, ...Array.from(e.target.files || [])])} />
                </label>
                <button type="button" onClick={screenSession?.role === 'host' ? () => cleanupScreenShare(true) : startScreenShare} className="icon-btn-base"
                        style={{ background: screenSession?.role === 'host' ? colors.accentLight : 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        title={screenSession?.role === 'host' ? 'Завершить демонстрацию' : 'Демонстрация экрана'}>
                    <IconCamera size={18} color={screenSession?.role === 'host' ? colors.accent : colors.textSecondary} />
                </button>
                <input className="input-focus"
                       style={{ flex: 1, padding: '10px 14px', borderRadius: 22, border: `1.5px solid ${colors.border}`, fontSize: 15, outline: 'none', minWidth: 0, background: colors.bgInput, color: colors.textPrimary }}
                       placeholder="Написать сообщение..." value={text}
                       onChange={e => handleInput(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }} />
                <button type="submit" className={`send-btn-base${sendAnim ? ' send-btn-anim' : ''}`}
                        style={{ background: colors.sendBtn, color: colors.sendBtnText, border: 'none', borderRadius: '50%', width: 42, height: 42, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!text.trim() && !files.length) ? 0.45 : 1 }}
                        disabled={!text.trim() && !files.length}>
                    <IconSend size={17} color="#fff" />
                </button>
            </form>

            {ctxMenu && <MsgContextMenu x={ctxMenu.x} y={ctxMenu.y} msg={ctxMenu.msg}
                                        isMe={String(ctxMenu.msg.from_user?._id || ctxMenu.msg.from_user) === myId}
                                        onClose={() => setCtxMenu(null)}
                                        onReply={() => setReplyTo(ctxMenu.msg)}
                                        onForward={() => setFwdMsg(ctxMenu.msg)}
                                        onSave={() => handleSave(ctxMenu.msg._id)}
                                        onReact={emoji => handleReact(ctxMenu.msg._id, emoji)}
                                        onDelete={() => handleDelete(ctxMenu.msg._id)}
                                        onCopy={() => copyPlainText([ctxMenu.msg.text, ...(ctxMenu.msg.files || []).map(f => f.original_name)].filter(Boolean).join('\n'))} />}
            {fwdMsg && <ForwardModal allChats={allChats} myId={myId} onClose={() => setFwdMsg(null)} onForward={chatId => handleForward(fwdMsg._id, chatId)} />}
            {profileId && <UserProfileModal userId={profileId} onClose={() => setProfileId(null)} onBlockToggle={handleBlockToggle} />}
            {screenSession && <ScreenShareModal session={screenSession} colors={colors} localVideoRef={screenLocalVideoRef} remoteVideoRef={screenRemoteVideoRef} onClose={cleanupScreenShare} onStop={() => cleanupScreenShare(true)} onLeave={() => cleanupScreenShare(true)} />}
            {showGroupPanel && <GroupPanel chat={chat} myId={myId} online={online} onClose={() => setShowGroupPanel(false)} isCreator={isCreator} token={token} onAction={handleModeration} />}
        </div>
    );
}
