import React, { useState, useEffect, useRef } from 'react';
import api, { fileUrl } from '../api';
import { useAuth } from '../context/AuthContext';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏'];

export default function ChatWindow({ chat, socket }) {
    const { user: me } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [forwardModal, setForwardModal] = useState(null);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const contextMenuRef = useRef(null);
    const chatId = chat?.chatId || chat?._id;
    const isGroup = chat?.type === 'group';

    useEffect(() => {
        if (!chatId) return;
        const endpoint = isGroup ? '/api/groups/' + (chat._id || chat.groupId) + '/messages' : '/api/chats/' + chatId + '/messages';
        api.get(endpoint).then(data => { setMessages(data.messages || []); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }).catch(console.error);
    }, [chatId, isGroup]);

    useEffect(() => {
        if (!socket || !chatId) return;
        socket.emit('chat:join', chatId);
        const onNew = (msg) => { setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); };
        const onDeleted = (msgId) => setMessages(prev => prev.filter(m => m._id !== msgId));
        const onReacted = ({ messageId, reactions }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
        socket.on('message:new', onNew); socket.on('message:deleted', onDeleted); socket.on('message:reacted', onReacted);
        return () => { socket.emit('chat:leave', chatId); socket.off('message:new', onNew); socket.off('message:deleted', onDeleted); socket.off('message:reacted', onReacted); };
    }, [socket, chatId]);

    useEffect(() => {
        const handler = (e) => { if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) { setContextMenu(null); } };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const sendMessage = async () => {
        if (!text.trim()) return;
        const msgText = text.trim(); setText('');
        try {
            const endpoint = isGroup ? '/api/groups/' + (chat._id || chat.groupId) + '/messages' : '/api/chats/' + chatId + '/messages';
            const data = await api.post(endpoint, { text: msgText, replyTo: replyTo?._id || null });
            setReplyTo(null); socket?.emit('message:send', { chatId, message: data.message });
        } catch (e) { alert(e.message); }
    };

    const handleContextMenu = (e, msg) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, message: msg }); };

    const handleCopy = async (msg) => {
        try { await navigator.clipboard.writeText(msg.text || ''); } catch { const ta = document.createElement('textarea'); ta.value = msg.text || ''; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
        setContextMenu(null);
    };

    const handleDelete = async (msg) => { try { await api.delete('/api/messages/' + msg._id); setMessages(prev => prev.filter(m => m._id !== msg._id)); socket?.emit('message:delete', { chatId, messageId: msg._id }); } catch (e) { alert(e.message); } setContextMenu(null); };
    const handleSave = async (msg) => { try { await api.post('/api/messages/' + msg._id + '/save', {}); alert('Добавлено в избранное'); } catch (e) { alert(e.message); } setContextMenu(null); };
    const handleReact = async (msg, emoji) => { try { const data = await api.post('/api/messages/' + msg._id + '/react', { emoji }); setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, reactions: data.reactions } : m)); socket?.emit('message:react', { chatId, messageId: msg._id, reactions: data.reactions }); } catch (e) { alert(e.message); } setContextMenu(null); };

    const formatTime = (date) => new Date(date).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (date) => new Date(date).toLocaleDateString('ru', { day: 'numeric', month: 'long' });

    const groupedMessages = []; let lastDate = null;
    messages.forEach(msg => { const d = formatDate(msg.createdAt); if (d !== lastDate) { groupedMessages.push({ type: 'date', label: d }); lastDate = d; } groupedMessages.push({ type: 'message', data: msg }); });

    const isMine = (msg) => String(msg.sender?._id || msg.sender) === String(me._id);

    return (
        <div className="chat-window">
            <div className="chat-header"><div className="chat-header-info"><strong>{chat?.name || chat?.otherUser?.nickname}</strong></div></div>
            <div className="messages-list" onClick={() => setContextMenu(null)}>
                {groupedMessages.map((item, idx) => {
                    if (item.type === 'date') return (<div key={'date-' + idx} className="date-divider"><span style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', pointerEvents: 'none' }}>{item.label}</span></div>);
                    const msg = item.data; const mine = isMine(msg); const sender = msg.sender;
                    return (
                        <div key={msg._id} className={'message-wrap ' + (mine ? 'mine' : 'other')} onContextMenu={(e) => handleContextMenu(e, msg)}>
                            {!mine && isGroup && <img className="msg-avatar" src={fileUrl(sender?.avatar) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(sender?.nickname || '?') + '&background=random&size=32'} alt="avatar" />}
                            <div className="message-bubble">
                                {!mine && isGroup && <div className="msg-sender-name">@{sender?.nickname}</div>}
                                {msg.replyTo && <div className="reply-preview"><span className="reply-name">@{msg.replyTo.sender?.nickname}</span><span className="reply-text">{msg.replyTo.text?.slice(0, 60)}</span></div>}
                                {msg.forwardedFrom && <div className="forwarded-label">Переслано</div>}
                                <div className="msg-text">{msg.text}</div>
                                <span className="msg-time" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', pointerEvents: 'none', fontSize: '11px', color: 'var(--text-time)', marginTop: '4px', display: 'block', textAlign: 'right' }}>{formatTime(msg.createdAt)}</span>
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && <div className="reactions">{Object.entries(msg.reactions).map(([emoji, users]) => (<span key={emoji} className={'reaction ' + (users.includes(me._id) ? 'active' : '')} onClick={(e) => { e.stopPropagation(); handleReact(msg, emoji); }}>{emoji} {users.length}</span>))}</div>}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
            {contextMenu && (<div ref={contextMenuRef} className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}><button onClick={() => handleCopy(contextMenu.message)}>Копировать</button><button onClick={() => { setReplyTo(contextMenu.message); setContextMenu(null); inputRef.current?.focus(); }}>Ответить</button><button onClick={() => { setForwardModal(contextMenu.message); setContextMenu(null); }}>Переслать</button><button onClick={() => handleSave(contextMenu.message)}>В избранное</button><div className="context-emojis">{EMOJIS.map(emoji => (<span key={emoji} onClick={() => handleReact(contextMenu.message, emoji)}>{emoji}</span>))}</div>{isMine(contextMenu.message) && <button className="delete-btn" onClick={() => handleDelete(contextMenu.message)}>Удалить</button>}</div>)}
            {forwardModal && (<ForwardModal message={forwardModal} onClose={() => setForwardModal(null)} socket={socket} currentChatId={chatId} />)}
            {replyTo && (<div className="reply-bar"><div className="reply-bar-content"><span className="reply-bar-name">@{replyTo.sender?.nickname}</span><span className="reply-bar-text">{replyTo.text?.slice(0, 80)}</span></div><button onClick={() => setReplyTo(null)}>X</button></div>)}
            <div className="chat-input-row"><input ref={inputRef} type="text" className="chat-input" placeholder="Написать сообщение..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} /><button className="send-btn" onClick={sendMessage} disabled={!text.trim()}>➤</button></div>
        </div>
    );
}

function ForwardModal({ message, onClose, socket, currentChatId }) {
    const [chats, setChats] = useState([]); const [loading, setLoading] = useState(true);
    useEffect(() => { Promise.all([api.get('/api/chats'), api.get('/api/groups')]).then(([c, g]) => { const chatList = (c.chats || []).map(ch => ({ ...ch, _displayName: ch.participants?.find(p => p._id !== undefined)?.nickname || 'Чат' })); const groupList = (g.groups || []).map(gr => ({ ...gr, _displayName: gr.name, type: 'group' })); setChats([...chatList, ...groupList]); }).catch(() => {}).finally(() => setLoading(false)); }, []);
    const forward = async (targetChatId) => { try { const data = await api.post('/api/messages/' + message._id + '/forward', { chatId: targetChatId }); socket?.emit('message:send', { chatId: targetChatId, message: data.message }); onClose(); } catch (e) { alert(e.message); } };
    return (<div className="modal-overlay" onClick={onClose}><div className="modal forward-modal" onClick={e => e.stopPropagation()}><h3>Переслать сообщение</h3><button className="modal-close" onClick={onClose}>X</button>{loading ? <p>Загрузка...</p> : (<div className="forward-list">{chats.map(c => (<button key={c._id} className="forward-item" onClick={() => forward(c.chatId || c.chat || c._id)}>{c._displayName || c.name}</button>))}</div>)}</div></div>);
}