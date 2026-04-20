import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import MessageBubble from './MessageBubble';

function groupByDate(msgs) {
    const groups = [];
    let lastDate = null;
    msgs.forEach(msg => {
        const d = new Date(msg.createdAt).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric',
        });
        if (d !== lastDate) {
            groups.push({ date: d, msgs: [] });
            lastDate = d;
        }
        groups[groups.length - 1].msgs.push(msg);
    });
    return groups;
}

export default function ChatWindow({ chat, socket, online, incomingMessage }) {
    const { user, token } = useAuth();
    const [messages,   setMessages]   = useState([]);
    const [text,       setText]       = useState('');
    const [files,      setFiles]      = useState([]);
    const [typing,     setTyping]     = useState(null);
    const [loading,    setLoading]    = useState(false);
    const [dateGroups, setDateGroups] = useState([]);
    const bottomRef   = useRef(null);
    const typingTimer = useRef(null);
    const fileRef     = useRef(null);

    const loadMessages = useCallback(async () => {
        if (!chat) return;
        setLoading(true);
        try {
            const data = await apiFetch(`/api/chats/${chat._id}/messages`, {}, token);
            setMessages(data);
            setDateGroups(groupByDate(data));
        } catch (err) {
            console.error('Ошибка загрузки сообщений:', err.message);
        } finally {
            setLoading(false);
        }
    }, [chat, token]);

    useEffect(() => {
        loadMessages();
        setTyping(null);
    }, [chat?._id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ИСПРАВЛЕНО: входящие сообщения получаем через пропс от Messenger.jsx
    // Это надёжно — Messenger.jsx уже точно получает socket события (сайдбар работал)
    useEffect(() => {
        if (!incomingMessage || !chat) return;
        const { chatId, message } = incomingMessage;
        if (chatId !== chat._id) return;
        setMessages(prev => {
            if (prev.find(m => m._id === message._id)) return prev;
            const updated = [...prev, message];
            setDateGroups(groupByDate(updated));
            return updated;
        });
    }, [incomingMessage]);

    // Socket: только удаление и индикатор печати
    useEffect(() => {
        if (!socket || !chat) return;

        function onDeleteMessage({ chatId, messageId }) {
            if (chatId !== chat._id) return;
            setMessages(prev => {
                const updated = prev.filter(m => m._id !== messageId);
                setDateGroups(groupByDate(updated));
                return updated;
            });
        }

        function onTypingStart({ userId, name }) {
            if (userId !== user?.id) setTyping(name);
        }
        function onTypingStop() { setTyping(null); }

        socket.on('message:deleted', onDeleteMessage);
        socket.on('typing:start',    onTypingStart);
        socket.on('typing:stop',     onTypingStop);

        return () => {
            socket.off('message:deleted', onDeleteMessage);
            socket.off('typing:start',    onTypingStart);
            socket.off('typing:stop',     onTypingStop);
        };
    }, [socket, chat?._id, user?.id]);

    function handleInput(val) {
        setText(val);
        if (!socket || !chat) return;
        socket.emit('typing:start', { chatId: chat._id });
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(
            () => socket.emit('typing:stop', { chatId: chat._id }),
            1500
        );
    }

    async function handleSend(e) {
        e?.preventDefault();
        if (!text.trim() && !files.length) return;

        const formData = new FormData();
        if (text.trim()) formData.append('text', text.trim());
        files.forEach(f => formData.append('files', f));

        setText('');
        setFiles([]);
        socket?.emit('typing:stop', { chatId: chat._id });

        try {
            const newMsg = await apiFetch(`/api/chats/${chat._id}/messages`, {
                method: 'POST',
                body:   formData,
            }, token);

            setMessages(prev => {
                if (prev.find(m => m._id === newMsg._id)) return prev;
                const updated = [...prev, newMsg];
                setDateGroups(groupByDate(updated));
                return updated;
            });
        } catch (err) {
            alert('Ошибка отправки: ' + err.message);
        }
    }

    async function handleDelete(msgId) {
        if (!confirm('Удалить сообщение?')) return;
        try {
            await apiFetch(`/api/messages/${msgId}`, { method: 'DELETE' }, token);
        } catch (err) {
            alert('Ошибка удаления: ' + err.message);
        }
    }

    if (!chat) return (
        <div style={s.empty}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 20, color: '#888' }}>Выберите чат для начала общения</div>
        </div>
    );

    const isGroup = chat.type === 'group';
    const otherMember = !isGroup ? chat.members?.find(m => String(m._id) !== user?.id) : null;
    const isOnline = otherMember && online?.has(String(otherMember._id));

    return (
        <div style={s.wrap}>
            <div style={s.header}>
                <div style={{ ...s.avatar, background: isGroup ? '#8957e5' : (otherMember?.avatar_color || '#2196f3') }}>
                    {isGroup ? '👥' : chat.name?.[0]?.toUpperCase()}
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{chat.name}</div>
                    <div style={{ fontSize: 12, color: isOnline ? '#26a641' : '#888' }}>
                        {isGroup ? `${chat.members?.length || 0} участников` : isOnline ? '● В сети' : '○ Не в сети'}
                    </div>
                </div>
            </div>

            <div style={s.messages}>
                {loading && <div style={s.center}>Загрузка...</div>}
                {dateGroups.map(group => (
                    <div key={group.date}>
                        <div style={s.dateDivider}><span style={s.dateLabel}>{group.date}</span></div>
                        {group.msgs.map(msg => (
                            <MessageBubble key={msg._id} msg={msg} isGroup={isGroup} onDelete={handleDelete} />
                        ))}
                    </div>
                ))}
                {messages.length === 0 && !loading && <div style={s.center}>Нет сообщений. Напишите первым!</div>}
                {typing && <div style={{ fontSize: 13, color: '#888', padding: '4px 8px' }}>✍️ {typing} печатает...</div>}
                <div ref={bottomRef} />
            </div>

            {files.length > 0 && (
                <div style={s.filePreview}>
                    {files.map((f, i) => {
                        const icon = f.type.startsWith('image/') ? '🖼' : f.type.startsWith('video/') ? '🎬' : f.type.startsWith('audio/') ? '🎵' : '📎';
                        return (
                            <div key={i} style={s.fileChip}>
                                <span style={{ fontSize: 14 }}>{icon}</span>
                                <span style={s.fileChipName}>{f.name}</span>
                                <span style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap' }}>{(f.size / 1024).toFixed(0)} КБ</span>
                                <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={s.removeFile}>✕</button>
                            </div>
                        );
                    })}
                </div>
            )}

            <form onSubmit={handleSend} style={s.form}>
                <button type="button" style={s.attachBtn} onClick={() => fileRef.current?.click()} title="Прикрепить файл">📎</button>
                <input ref={fileRef} type="file" multiple accept="*/*" style={{ display: 'none' }} onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                <input
                    style={s.textInput}
                    placeholder="Написать сообщение..."
                    value={text}
                    onChange={e => handleInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                />
                <button type="submit" style={{ ...s.sendBtn, opacity: (!text.trim() && !files.length) ? 0.5 : 1 }} disabled={!text.trim() && !files.length}>➤</button>
            </form>
        </div>
    );
}

const s = {
    wrap:         { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' },
    empty:        { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
    header:       { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #eee', background: '#fff', flexShrink: 0 },
    avatar:       { width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 },
    messages:     { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2, background: '#f5f5f5' },
    center:       { textAlign: 'center', color: '#999', padding: 20 },
    dateDivider:  { display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px 0' },
    dateLabel:    { background: '#e0e0e0', color: '#666', fontSize: 12, padding: '3px 12px', borderRadius: 12 },
    filePreview:  { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 16px', background: '#fff', borderTop: '1px solid #eee', flexShrink: 0 },
    fileChip:     { display: 'flex', alignItems: 'center', gap: 6, background: '#e3f2fd', borderRadius: 16, padding: '4px 10px', maxWidth: 260 },
    fileChipName: { fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
    removeFile:   { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#666', padding: 0, flexShrink: 0 },
    form:         { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderTop: '1px solid #eee', flexShrink: 0 },
    attachBtn:    { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 8px', borderRadius: 8 },
    textInput:    { flex: 1, padding: '10px 14px', borderRadius: 24, border: '1px solid #ddd', fontSize: 15, outline: 'none' },
    sendBtn:      { background: '#2196f3', color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};