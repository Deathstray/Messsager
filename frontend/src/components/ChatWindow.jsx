import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch, fileUrl } from '../api';
import MessageBubble from './MessageBubble';
import EmojiPicker from './EmojiPicker';
import { IconX, IconGroupAvatar, IconSaved } from '../icons/Icons';

function IconSend({ size = 20, color = '#fff' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function IconAttach({ size = 20, color = 'currentColor' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
}
function IconEmoji({ size = 20, color = 'currentColor' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
}
function IconArrowLeft({ size = 20, color = 'currentColor' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
}
function IconForward({ size = 16, color = 'currentColor' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>;
}
function IconReply({ size = 16, color = 'currentColor' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>;
}
function IconBookmark2({ size = 16, color = 'currentColor' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
}
function IconTrash2({ size = 16, color = 'currentColor' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
}

function getChatName(chat, myId) {
    if (!chat) return '';
    if (chat.type === 'saved') return 'Избранное';
    if (chat.type === 'dm') {
        const other = chat.members?.find(m => String(m._id || m) !== String(myId));
        return other?.display_name || chat.name || 'Чат';
    }
    return chat.name || 'Группа';
}

function getChatOther(chat, myId) {
    if (chat?.type !== 'dm') return null;
    return chat.members?.find(m => String(m._id || m) !== String(myId)) || null;
}

function DateLabel({ date, colors }) {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    let label;
    if (diff === 0) label = 'Сегодня';
    else if (diff === 1) label = 'Вчера';
    else label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    return (
        <div style={{ textAlign: 'center', margin: '12px 0 6px' }}>
            <span style={{ background: colors.bgDateLabel, color: colors.textDateLabel, fontSize: 11, fontWeight: 600, borderRadius: 10, padding: '3px 12px' }}>{label}</span>
        </div>
    );
}

function CtxItem({ icon, label, onClick, red, colors }) {
    const [hov, setHov] = useState(false);
    return (
        <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: red ? colors.textContextRed : colors.textContextItem, background: hov ? colors.bgContextItem : 'transparent' }}>
            {icon}{label}
        </div>
    );
}

export default function ChatWindow({ chat, socket, online, incomingMsg, incomingReaction, clearedChatId, allChats, onNewChat, onBack, onRemoveChat }) {
    const { user, token } = useAuth();
    const { colors } = useTheme();
    const myId = String(user?.id || user?._id || '');

    const [messages, setMessages]   = useState([]);
    const [text, setText]           = useState('');
    const [files, setFiles]         = useState([]);
    const [replyTo, setReplyTo]     = useState(null);
    const [loading, setLoading]     = useState(false);
    const [hasMore, setHasMore]     = useState(true);
    const [showEmoji, setShowEmoji] = useState(false);
    const [ctxMenu, setCtxMenu]     = useState(null);
    const [fwdMsg, setFwdMsg]       = useState(null);
    const [showFwd, setShowFwd]     = useState(false);

    const listRef    = useRef(null);
    const fileRef    = useRef(null);
    const inputRef   = useRef(null);
    const ctxRef     = useRef(null);
    const bottomRef  = useRef(null);
    const prevChatId = useRef(null);

    const loadMessages = useCallback(async (before = null) => {
        if (!chat?._id || !token) return;
        setLoading(true);
        try {
            const qs = before ? `?before=${before}&limit=50` : '?limit=50';
            const msgs = await apiFetch(`/api/chats/${chat._id}/messages${qs}`, {}, token);
            if (before) {
                setMessages(prev => [...msgs, ...prev]);
            } else {
                setMessages(msgs);
                setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
            }
            setHasMore(msgs.length >= 50);
        } catch {}
        finally { setLoading(false); }
    }, [chat?._id, token]);

    useEffect(() => {
        if (!chat?._id) return;
        if (prevChatId.current !== chat._id) {
            prevChatId.current = chat._id;
            setText(''); setFiles([]); setReplyTo(null); setMessages([]); setHasMore(true);
            loadMessages();
        }
    }, [chat?._id, loadMessages]);

    useEffect(() => {
        if (!incomingMsg || incomingMsg.chatId !== chat?._id) return;
        setMessages(prev => {
            if (prev.find(m => m._id === incomingMsg.message._id)) return prev;
            return [...prev, incomingMsg.message];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    }, [incomingMsg]);

    useEffect(() => {
        if (!incomingReaction || incomingReaction.chatId !== chat?._id) return;
        setMessages(prev => prev.map(m =>
            m._id === incomingReaction.messageId ? { ...m, reactions: incomingReaction.reactions } : m
        ));
    }, [incomingReaction]);

    useEffect(() => {
        if (!clearedChatId || clearedChatId.chatId !== chat?._id) return;
        setMessages([]);
    }, [clearedChatId]);

    useEffect(() => {
        function close(e) { if (!ctxRef.current?.contains(e.target)) setCtxMenu(null); }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    function handleScroll() {
        if (!listRef.current || loading || !hasMore) return;
        if (listRef.current.scrollTop < 60 && messages.length > 0) loadMessages(messages[0]?.createdAt);
    }

    async function sendMessage(e) {
        e?.preventDefault();
        if (!text.trim() && files.length === 0) return;
        if (!chat?._id) return;
        const fd = new FormData();
        if (text.trim()) fd.append('text', text.trim());
        if (replyTo) fd.append('reply_to', replyTo._id);
        files.forEach(f => fd.append('files', f));
        setText(''); setFiles([]); setReplyTo(null);
        try { await apiFetch(`/api/chats/${chat._id}/messages`, { method: 'POST', body: fd }, token); }
        catch (err) { alert(err.message); }
    }

    async function handleReact(msgId, emoji) {
        try {
            const updated = await apiFetch(`/api/messages/${msgId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }, token);
            setMessages(prev => prev.map(m => m._id === msgId ? updated : m));
        } catch {}
    }

    async function handleDelete(msgId) {
        if (!confirm('Удалить сообщение?')) return;
        try {
            await apiFetch(`/api/messages/${msgId}`, { method: 'DELETE' }, token);
            setMessages(prev => prev.filter(m => m._id !== msgId));
        } catch (e) { alert(e.message); }
    }

    async function forwardTo(chatId) {
        if (!fwdMsg) return;
        try {
            await apiFetch(`/api/messages/${fwdMsg._id}/forward`, { method: 'POST', body: JSON.stringify({ chat_id: chatId }) }, token);
            setShowFwd(false); setFwdMsg(null);
        } catch (e) { alert(e.message); }
    }

    async function saveToFavorites(msgId) {
        try { await apiFetch(`/api/messages/${msgId}/save`, { method: 'POST' }, token); setCtxMenu(null); }
        catch (e) { alert(e.message); }
    }

    function handleContextMenu(e, msg) {
        e.preventDefault();
        const x = Math.min(e.clientX, window.innerWidth - 190);
        const y = Math.min(e.clientY, window.innerHeight - 170);
        setCtxMenu({ msg, x, y });
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    }

    function renderMessages() {
        const items = [];
        let lastDate = null;
        messages.forEach(m => {
            const d = new Date(m.createdAt).toDateString();
            if (d !== lastDate) { items.push(<DateLabel key={`dl-${m._id}`} date={m.createdAt} colors={colors} />); lastDate = d; }
            items.push(<MessageBubble key={m._id} msg={m} isGroup={chat?.type === 'group'} myId={myId} onDelete={handleDelete} onReact={handleReact} onContextMenu={handleContextMenu} />);
        });
        return items;
    }

    const other    = getChatOther(chat, myId);
    const isOnline = other && online?.has(String(other._id || other));
    const chatName = getChatName(chat, myId);
    const isGroup  = chat?.type === 'group';
    const isSaved  = chat?.type === 'saved';

    if (!chat) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: colors.bgChat }}>
                <div style={{ fontSize: 48 }}>💬</div>
                <div style={{ color: colors.textSecondary, fontSize: 16, fontWeight: 500 }}>Выбери чат для начала</div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: colors.bgChat }}>

            {/* Шапка */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 56, borderBottom: `1px solid ${colors.border}`, background: colors.bgHeader, boxShadow: colors.shadowHeader, flexShrink: 0 }}>
                <button onClick={onBack} className="icon-btn-base" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, color: colors.textSecondary }}>
                    <IconArrowLeft size={20} color={colors.textSecondary} />
                </button>
                {isSaved ? (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconSaved size={18} color="#fff" />
                    </div>
                ) : isGroup ? (
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #7b1f3a, #a33358)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconGroupAvatar size={20} color="rgba(255,255,255,.9)" />
                    </div>
                ) : other?.avatar ? (
                    <img src={fileUrl(other.avatar)} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: other?.avatar_color || colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                        {(other?.display_name || chatName || '?')[0].toUpperCase()}
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatName}</div>
                    <div style={{ fontSize: 12, color: isOnline ? colors.textOnlineStatus : colors.textMuted }}>
                        {isSaved ? 'Мои заметки' : isGroup ? `${chat.members?.length || 0} участников` : isOnline ? 'онлайн' : 'не в сети'}
                    </div>
                </div>
            </div>

            {/* Сообщения */}
            <div ref={listRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column' }}>
                {loading && messages.length === 0 && <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, padding: 20 }}>Загрузка...</div>}
                {hasMore && messages.length > 0 && (
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <button onClick={() => loadMessages(messages[0]?.createdAt)} style={{ background: colors.bgPill, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '4px 16px', fontSize: 12, color: colors.textSecondary, cursor: 'pointer' }}>Загрузить ещё</button>
                    </div>
                )}
                {renderMessages()}
                <div ref={bottomRef} />
            </div>

            {/* Полоса ответа */}
            {replyTo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', background: colors.bgReplyBar, borderTop: `1px solid ${colors.border}` }}>
                    <div style={{ borderLeft: `3px solid ${colors.accent}`, paddingLeft: 8, flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent }}>{replyTo.from_user?.display_name}</div>
                        <div style={{ fontSize: 12, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text || '📎 Файл'}</div>
                    </div>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        <IconX size={16} color={colors.textMuted} />
                    </button>
                </div>
            )}

            {/* Файлы */}
            {files.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 16px', background: colors.bgReplyBar, borderTop: `1px solid ${colors.border}` }}>
                    {files.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: colors.bgFileChip, borderRadius: 8, padding: '3px 8px', fontSize: 12, color: colors.textSecondary }}>
                            📎 {f.name.length > 20 ? f.name.slice(0, 20) + '…' : f.name}
                            <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                <IconX size={12} color={colors.textMuted} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Поле ввода */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '8px 12px', borderTop: `1px solid ${colors.border}`, background: colors.bgHeader, flexShrink: 0, position: 'relative' }}>
                {showEmoji && (
                    <div style={{ position: 'absolute', bottom: 60, left: 12, zIndex: 100 }}>
                        <EmojiPicker onSelect={emoji => { setText(p => p + emoji); setShowEmoji(false); inputRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />
                    </div>
                )}
                <button onClick={() => setShowEmoji(p => !p)} className="icon-btn-base" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 9, display: 'flex', flexShrink: 0 }}>
                    <IconEmoji size={20} color={colors.textMuted} />
                </button>
                <button onClick={() => fileRef.current?.click()} className="icon-btn-base" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 9, display: 'flex', flexShrink: 0 }}>
                    <IconAttach size={20} color={colors.textMuted} />
                </button>
                <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => setFiles(p => [...p, ...Array.from(e.target.files)])} />
                <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Сообщение..." rows={1}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 14, border: `1.5px solid ${colors.border}`, background: colors.bgInput, color: colors.textPrimary, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }} />
                <button onClick={sendMessage} className="send-btn-base" disabled={!text.trim() && files.length === 0}
                    style={{ width: 40, height: 40, borderRadius: 13, background: colors.sendBtn, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!text.trim() && files.length === 0) ? 0.5 : 1 }}>
                    <IconSend size={18} color={colors.sendBtnText} />
                </button>
            </div>

            {/* Контекст-меню */}
            {ctxMenu && (
                <div ref={ctxRef} className="card-anim" style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 500, background: colors.bgContextMenu, borderRadius: 12, boxShadow: colors.shadow, minWidth: 180, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                    <CtxItem icon={<IconReply size={15} color={colors.textContextItem}/>} label="Ответить" colors={colors} onClick={() => { setReplyTo(ctxMenu.msg); setCtxMenu(null); inputRef.current?.focus(); }} />
                    <CtxItem icon={<IconForward size={15} color={colors.textContextItem}/>} label="Переслать" colors={colors} onClick={() => { setFwdMsg(ctxMenu.msg); setShowFwd(true); setCtxMenu(null); }} />
                    <CtxItem icon={<IconBookmark2 size={15} color={colors.textContextItem}/>} label="В избранное" colors={colors} onClick={() => saveToFavorites(ctxMenu.msg._id)} />
                    {String(ctxMenu.msg.from_user?._id || ctxMenu.msg.from_user) === myId && (
                        <CtxItem icon={<IconTrash2 size={15} color={colors.textContextRed}/>} label="Удалить" colors={colors} red onClick={() => { handleDelete(ctxMenu.msg._id); setCtxMenu(null); }} />
                    )}
                </div>
            )}

            {/* Модал пересылки */}
            {showFwd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={e => e.target === e.currentTarget && setShowFwd(false)}>
                    <div className="card-anim" style={{ background: colors.bgModal, borderRadius: 18, padding: 24, width: 340, maxWidth: '100%', border: `1px solid ${colors.border}`, boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: colors.textPrimary }}>Переслать в...</div>
                            <button onClick={() => setShowFwd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><IconX size={18} color={colors.textMuted} /></button>
                        </div>
                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                            {allChats?.filter(c => c._id !== chat._id).map(c => {
                                const name = c.type === 'saved' ? 'Избранное' : c.type === 'dm'
                                    ? (c.members?.find(m => String(m._id || m) !== myId)?.display_name || c.name)
                                    : c.name;
                                return (
                                    <div key={c._id} onClick={() => forwardTo(c._id)} style={{ padding: '9px 12px', borderRadius: 10, cursor: 'pointer', color: colors.textPrimary, fontSize: 14, fontWeight: 500 }} className="chat-item-hover">
                                        {name}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
