import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import ChatList   from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';

export default function Messenger() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();

    const [chats,      setChats]      = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [socket,     setSocket]     = useState(null);
    const [online,     setOnline]     = useState(new Set());

    // Передаём события вниз через пропсы — надёжнее чем socket внутри ChatWindow
    const [incomingMsg,      setIncomingMsg]      = useState(null);
    const [incomingReaction, setIncomingReaction] = useState(null);
    const [clearedChatId,    setClearedChatId]    = useState(null);

    // Мобильный режим: показываем либо список, либо чат
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

    useEffect(() => {
        if (!token) return;
        const url = import.meta.env.VITE_API_URL || window.location.origin;
        const s = io(url, { auth: { token } });

        s.on('connect',       () => console.log('✅ Socket'));
        s.on('connect_error', e  => console.error('Socket:', e.message));

        s.on('chat:new', chat => {
            setChats(prev => prev.find(c => c._id === chat._id) ? prev : [chat, ...prev]);
        });

        s.on('chat:updated', updated => {
            setChats(prev => prev.map(c => c._id === updated._id ? { ...c, ...updated } : c));
            setActiveChat(prev => prev?._id === updated._id ? { ...prev, ...updated } : prev);
        });

        s.on('chat:removed', ({ chatId }) => {
            setChats(prev => prev.filter(c => c._id !== chatId));
            setActiveChat(prev => prev?._id === chatId ? null : prev);
        });

        s.on('chat:cleared', ({ chatId }) => {
            setChats(prev => prev.map(c => c._id === chatId ? { ...c, last_message: null } : c));
            setClearedChatId({ chatId, ts: Date.now() });
        });

        s.on('message:new', ({ chatId, message }) => {
            setChats(prev => prev
                .map(c => c._id === chatId
                    ? { ...c, last_message: message, updatedAt: new Date().toISOString() }
                    : c
                )
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            );
            setIncomingMsg({ chatId, message, ts: Date.now() });
        });

        s.on('message:reaction', data => setIncomingReaction({ ...data, ts: Date.now() }));

        s.on('user:online',  id => setOnline(prev => new Set([...prev, id])));
        s.on('user:offline', id => setOnline(prev => { const n = new Set(prev); n.delete(id); return n; }));

        setSocket(s);
        return () => s.disconnect();
    }, [token]);

    const loadChats = useCallback(async () => {
        try { setChats(await apiFetch('/api/chats', {}, token)); } catch {}
    }, [token]);

    useEffect(() => { loadChats(); }, [loadChats]);

    function handleLogout() {
        socket?.disconnect(); logout(); navigate('/login');
    }

    function handleNewChat(chat) {
        setChats(prev => prev.find(c => c._id === chat._id) ? prev : [chat, ...prev]);
        setActiveChat(chat);
        setMobileView('chat');
    }

    function handleSelectChat(chat) {
        setActiveChat(chat);
        setMobileView('chat');
    }

    function handleBack() {
        setMobileView('list');
    }

    function handleRemoveChat(chatId) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        if (activeChat?._id === chatId) { setActiveChat(null); setMobileView('list'); }
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <div style={{
                display: mobileView === 'chat' ? 'none' : 'flex',
                flexDirection: 'column',
                width: 300, minWidth: 260,
                // На десктопе всегда видим
                ...(window.innerWidth > 640 ? { display: 'flex' } : {}),
            }}
            className="sidebar-panel">
                <ChatList
                    chats={chats}
                    activeId={activeChat?._id}
                    onSelect={handleSelectChat}
                    onNewChat={handleNewChat}
                    onLogout={handleLogout}
                    online={online}
                    onRemoveChat={handleRemoveChat}
                />
            </div>
            <div style={{
                flex: 1, display: mobileView === 'list' && window.innerWidth <= 640 ? 'none' : 'flex',
                flexDirection: 'column', minWidth: 0,
            }}>
                <ChatWindow
                    key={activeChat?._id}
                    chat={activeChat}
                    socket={socket}
                    online={online}
                    incomingMsg={incomingMsg}
                    incomingReaction={incomingReaction}
                    clearedChatId={clearedChatId}
                    allChats={chats}
                    onNewChat={handleNewChat}
                    onBack={handleBack}
                    onRemoveChat={handleRemoveChat}
                />
            </div>
        </div>
    );
}
