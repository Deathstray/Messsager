import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, fileUrl } from '../api';
import MessageBubble from './MessageBubble';
import { getChatDisplayName } from './ChatList';

function groupByDate(msgs) {
    const groups = []; let lastDate = null;
    msgs.forEach(msg => {
        const d = new Date(msg.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        if (d !== lastDate) { groups.push({ date: d, msgs: [] }); lastDate = d; }
        groups[groups.length - 1].msgs.push(msg);
    });
    return groups;
}

// Контекстное меню сообщения
const REACTIONS = ['👍','❤️','😂','😮','😢','🔥','👎'];

function MsgContextMenu({ x, y, msg, isMe, onClose, onReply, onForward, onSave, onReact, onDelete, onCopy }) {
    const ref = useRef(null);
    useEffect(() => {
        const fn = e => { if (!ref.current?.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    return (
        <div ref={ref} style={{ position: 'fixed', left: x, top: y, zIndex: 1000, background: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,.16)', minWidth: 190, border: '1px solid #eee', overflow: 'hidden' }}>
            {/* Реакции */}
            <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
                {REACTIONS.map(e => (
                    <span key={e} style={{ fontSize: 22, cursor: 'pointer', transition: 'transform .1s' }}
                        onClick={() => { onReact(e); onClose(); }}
                        onMouseEnter={ev => ev.target.style.transform = 'scale(1.3)'}
                        onMouseLeave={ev => ev.target.style.transform = 'scale(1)'}
                    >{e}</span>
                ))}
            </div>
            <CMenuItem icon="↩️" label="Ответить"    onClick={() => { onReply();   onClose(); }} />
            <CMenuItem icon="↪️" label="Переслать"   onClick={() => { onForward(); onClose(); }} />
            <CMenuItem icon="📋" label="Копировать"  onClick={() => { onCopy();    onClose(); }} />
            <CMenuItem icon="⭐" label="В избранное" onClick={() => { onSave();    onClose(); }} />
            {isMe && <CMenuItem icon="🗑" label="Удалить" onClick={() => { onDelete(); onClose(); }} red />}
        </div>
    );
}

function CMenuItem({ icon, label, onClick, red }) {
    const [hov, setHov] = useState(false);
    return (
        <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', fontSize: 14, color: red ? '#e53935' : '#222', background: hov ? '#f5f5f5' : 'transparent' }}>
            <span style={{ fontSize: 16 }}>{icon}</span>{label}
        </div>
    );
}

// Модальное окно пересылки
function ForwardModal({ onClose, onForward, allChats, myId }) {
    const [q, setQ] = useState('');
    const filtered = allChats.filter(c => getChatDisplayName(c, myId).toLowerCase().includes(q.toLowerCase()));
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, width: 340, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Переслать в...</div>
                <input style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 10 }} placeholder="Поиск чата..." value={q} onChange={e => setQ(e.target.value)} />
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filtered.map(c => (
                        <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', cursor: 'pointer', borderRadius: 8 }}
                            onClick={() => { onForward(c._id); onClose(); }}
                            onMouseEnter={ev => ev.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2196f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                                {getChatDisplayName(c, myId)[0]?.toUpperCase()}
                            </div>
                            <span style={{ fontSize: 14 }}>{getChatDisplayName(c, myId)}</span>
                        </div>
                    ))}
                </div>
                <button style={{ marginTop: 12, padding: 9, background: '#f0f0f0', border: 'none', borderRadius: 8, cursor: 'pointer' }} onClick={onClose}>Отмена</button>
            </div>
        </div>
    );
}

export default function ChatWindow({ chat, socket, online, incomingMsg, incomingReaction, clearedChatId, allChats, onNewChat, onBack, onRemoveChat }) {
    const { user, token } = useAuth();
    const [messages,   setMessages]   = useState([]);
    const [text,       setText]       = useState('');
    const [files,      setFiles]      = useState([]);
    const [typing,     setTyping]     = useState(null);
    const [loading,    setLoading]    = useState(false);
    const [dateGroups, setDateGroups] = useState([]);
    const [replyTo,    setReplyTo]    = useState(null);
    const [ctxMenu,    setCtxMenu]    = useState(null);
    const [fwdMsg,     setFwdMsg]     = useState(null);
    const bottomRef   = useRef(null);
    const typingTimer = useRef(null);
    const fileRef     = useRef(null);
    const myId = String(user?.id || user?._id || '');

    const rebuild = msgs => setDateGroups(groupByDate(msgs));

    const upsert = useCallback((prev, msg) => {
        const i = prev.findIndex(m => m._id === msg._id);
        if (i >= 0) { const a = [...prev]; a[i] = msg; return a; }
        return [...prev, msg];
    }, []);

    // Загрузка сообщений
    const loadMessages = useCallback(async () => {
        if (!chat) return;
        setLoading(true);
        try {
            const data = await apiFetch(`/api/chats/${chat._id}/messages`, {}, token);
            setMessages(data); rebuild(data);
        } catch {}
        finally { setLoading(false); }
    }, [chat, token]);

    useEffect(() => { loadMessages(); setTyping(null); setReplyTo(null); setText(''); setFiles([]); }, [chat?._id]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // Входящее сообщение
    useEffect(() => {
        if (!incomingMsg || !chat) return;
        const { chatId, message } = incomingMsg;
        if (chatId !== chat._id) return;
        setMessages(prev => { const u = upsert(prev, message); rebuild(u); return u; });
    }, [incomingMsg]);

    // Реакции
    useEffect(() => {
        if (!incomingReaction || !chat) return;
        const { chatId, messageId, reactions } = incomingReaction;
        if (chatId !== chat._id) return;
        setMessages(prev => { const u = prev.map(m => m._id === messageId ? { ...m, reactions } : m); rebuild(u); return u; });
    }, [incomingReaction]);

    // Очистка чата
    useEffect(() => {
        if (!clearedChatId || !chat) return;
        if (clearedChatId.chatId !== chat._id) return;
        setMessages([]); rebuild([]);
    }, [clearedChatId]);

    // Socket: удаление + типинг
    useEffect(() => {
        if (!socket || !chat) return;
        function onDel({ chatId, messageId }) {
            if (chatId !== chat._id) return;
            setMessages(prev => { const u = prev.filter(m => m._id !== messageId); rebuild(u); return u; });
        }
        function onTypStart({ userId, name }) { if (userId !== myId) setTyping(name); }
        function onTypStop() { setTyping(null); }
        socket.on('message:deleted', onDel);
        socket.on('typing:start',    onTypStart);
        socket.on('typing:stop',     onTypStop);
        return () => {
            socket.off('message:deleted', onDel);
            socket.off('typing:start',    onTypStart);
            socket.off('typing:stop',     onTypStop);
        };
    }, [socket, chat?._id, myId]);

    function handleInput(val) {
        setText(val);
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
        if (replyTo)     fd.append('reply_to', replyTo._id);
        files.forEach(f => fd.append('files', f));
        setText(''); setFiles([]); setReplyTo(null);
        socket?.emit('typing:stop', { chatId: chat._id });
        try {
            const msg = await apiFetch(`/api/chats/${chat._id}/messages`, { method: 'POST', body: fd }, token);
            setMessages(prev => { const u = upsert(prev, msg); rebuild(u); return u; });
        } catch (e) { alert('Ошибка: ' + e.message); }
    }

    async function handleDelete(msgId) {
        if (!confirm('Удалить сообщение?')) return;
        try { await apiFetch(`/api/messages/${msgId}`, { method: 'DELETE' }, token); }
        catch (e) { alert(e.message); }
    }

    async function handleReact(msgId, emoji) {
        try {
            const updated = await apiFetch(`/api/messages/${msgId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }, token);
            setMessages(prev => { const u = prev.map(m => m._id === msgId ? { ...m, reactions: updated.reactions } : m); rebuild(u); return u; });
        } catch {}
    }

    async function handleForward(msgId, chatId) {
        try { await apiFetch(`/api/messages/${msgId}/forward`, { method: 'POST', body: JSON.stringify({ chat_id: chatId }) }, token); }
        catch (e) { alert(e.message); }
    }

    async function handleSave(msgId) {
        try { await apiFetch(`/api/messages/${msgId}/save`, { method: 'POST' }, token); }
        catch (e) { alert(e.message); }
    }

    function handleCtx(e, msg) {
        e.preventDefault();
        const x = Math.min(e.clientX, window.innerWidth - 210);
        const y = Math.min(e.clientY, window.innerHeight - 310);
        setCtxMenu({ x, y, msg });
    }

    if (!chat) return (
        <div style={s.empty}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 18, color: '#888' }}>Выберите чат</div>
        </div>
    );

    const isGroup = chat.type === 'group';
    const isSaved = chat.type === 'saved';
    const chatName = getChatDisplayName(chat, myId);
    const other    = !isGroup && !isSaved ? chat.members?.find(m => String(m._id || m) !== myId) : null;
    const isOnline = other && online?.has(String(other._id || other));

    // Аватар для шапки
    function HeaderAvatar() {
        const avatarFile = isGroup ? chat.avatar : other?.avatar;
        const bg = isSaved ? '#f97316' : isGroup ? '#8957e5' : (other?.avatar_color || '#2196f3');
        const radius = isGroup ? 10 : '50%';
        const letter = isSaved ? '⭐' : chatName[0]?.toUpperCase();
        if (avatarFile) return <img src={fileUrl(avatarFile)} alt="" style={{ width: 40, height: 40, borderRadius: radius, objectFit: 'cover', flexShrink: 0 }} />;
        return <div style={{ width: 40, height: 40, borderRadius: radius, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{letter}</div>;
    }

    return (
        <div style={s.wrap} onClick={() => setCtxMenu(null)}>
            {/* Шапка */}
            <div style={s.header}>
                {/* Кнопка назад (мобильный) */}
                <button style={{ ...s.iconBtn, display: window.innerWidth <= 640 ? 'flex' : 'none' }} onClick={onBack}>‹</button>
                <HeaderAvatar />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatName}</div>
                    <div style={{ fontSize: 12, color: isOnline ? '#26a641' : '#888' }}>
                        {isSaved ? 'Сохранённые сообщения'
                            : isGroup ? `${chat.members?.length || 0} участников`
                            : isOnline ? '● В сети' : '○ Не в сети'}
                    </div>
                </div>
            </div>

            {/* Сообщения */}
            <div style={s.messages}>
                {loading && <div style={s.center}>Загрузка...</div>}
                {dateGroups.map(g => (
                    <div key={g.date}>
                        <div style={s.dateDivider}><span style={s.dateLabel}>{g.date}</span></div>
                        {g.msgs.map(msg => (
                            <MessageBubble key={msg._id} msg={msg} isGroup={isGroup} myId={myId}
                                onDelete={handleDelete} onReact={handleReact}
                                onContextMenu={handleCtx} />
                        ))}
                    </div>
                ))}
                {messages.length === 0 && !loading && <div style={s.center}>Нет сообщений. Напишите первым!</div>}
                {typing && <div style={{ fontSize: 13, color: '#888', padding: '2px 8px' }}>✍️ {typing} печатает...</div>}
                <div ref={bottomRef} />
            </div>

            {/* Панель ответа */}
            {replyTo && (
                <div style={s.replyBar}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#2196f3' }}>↩️ {replyTo.from_user?.display_name}</div>
                        <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text || '📎 Файл'}</div>
                    </div>
                    <button style={s.replyX} onClick={() => setReplyTo(null)}>✕</button>
                </div>
            )}

            {/* Превью файлов */}
            {files.length > 0 && (
                <div style={s.filePrev}>
                    {files.map((f, i) => (
                        <div key={i} style={s.fileChip}>
                            <span>{f.type.startsWith('image/') ? '🖼' : f.type.startsWith('video/') ? '🎬' : '📎'}</span>
                            <span style={{ fontSize: 11, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                            <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={s.removeFile}>✕</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Поле ввода */}
            <form onSubmit={handleSend} style={s.form}>
                <label style={{ ...s.attachBtn, cursor: 'pointer' }}>
                    📎
                    <input ref={fileRef} type="file" multiple accept="*/*" style={{ display: 'none' }} onChange={e => setFiles(p => [...p, ...Array.from(e.target.files)])} />
                </label>
                <input style={s.textInput} placeholder="Написать сообщение..." value={text}
                    onChange={e => handleInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }} />
                <button type="submit" style={{ ...s.sendBtn, opacity: (!text.trim() && !files.length) ? 0.45 : 1 }} disabled={!text.trim() && !files.length}>➤</button>
            </form>

            {/* Контекст-меню сообщения */}
            {ctxMenu && (
                <MsgContextMenu
                    x={ctxMenu.x} y={ctxMenu.y} msg={ctxMenu.msg}
                    isMe={String(ctxMenu.msg.from_user?._id || ctxMenu.msg.from_user) === myId}
                    onClose={() => setCtxMenu(null)}
                    onReply={() => setReplyTo(ctxMenu.msg)}
                    onForward={() => setFwdMsg(ctxMenu.msg)}
                    onSave={() => handleSave(ctxMenu.msg._id)}
                    onReact={emoji => handleReact(ctxMenu.msg._id, emoji)}
                    onDelete={() => handleDelete(ctxMenu.msg._id)}
                    onCopy={() => navigator.clipboard?.writeText(ctxMenu.msg.text || '')}
                />
            )}

            {/* Модальное окно пересылки */}
            {fwdMsg && (
                <ForwardModal
                    allChats={allChats} myId={myId}
                    onClose={() => setFwdMsg(null)}
                    onForward={chatId => handleForward(fwdMsg._id, chatId)}
                />
            )}
        </div>
    );
}

const s = {
    wrap:       { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 },
    empty:      { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
    header:     { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid #eee', background: '#fff', flexShrink: 0 },
    iconBtn:    { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    messages:   { flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2, background: '#f5f5f5' },
    center:     { textAlign: 'center', color: '#999', padding: 20 },
    dateDivider:{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px 0' },
    dateLabel:  { background: '#e0e0e0', color: '#666', fontSize: 11, padding: '3px 12px', borderRadius: 10, userSelect: 'none', pointerEvents: 'none' },
    replyBar:   { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#fff', borderTop: '1px solid #eee', borderLeft: '3px solid #2196f3', flexShrink: 0 },
    replyX:     { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#aaa', padding: 0 },
    filePrev:   { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '7px 14px', background: '#fff', borderTop: '1px solid #eee', flexShrink: 0 },
    fileChip:   { display: 'flex', alignItems: 'center', gap: 4, background: '#e3f2fd', borderRadius: 12, padding: '3px 8px', fontSize: 12 },
    removeFile: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#888', padding: 0 },
    form:       { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: '#fff', borderTop: '1px solid #eee', flexShrink: 0 },
    attachBtn:  { background: 'none', border: 'none', fontSize: 22, borderRadius: 8, display: 'flex', alignItems: 'center' },
    textInput:  { flex: 1, padding: '10px 14px', borderRadius: 22, border: '1px solid #ddd', fontSize: 15, outline: 'none', minWidth: 0 },
    sendBtn:    { background: '#2196f3', color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};
