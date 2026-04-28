import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch, SOCKET_URL } from '../api';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';

export default function Messenger() {
    const { token, logout } = useAuth();
    const { colors } = useTheme();
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [socket, setSocket] = useState(null);
    const [online, setOnline] = useState(new Set());
    const [incomingMsg, setIncomingMsg] = useState(null);
    const [incomingReaction, setIncomingReaction] = useState(null);
    const [clearedChatId, setClearedChatId] = useState(null);
    const [unread, setUnread] = useState({});
    const [mobileView, setMobileView] = useState('list');

    useEffect(() => {
        const total = Object.values(unread).reduce((s, n) => s + n, 0);
        document.title = total > 0 ? `(${total}) Messsager` : 'Messsager';
    }, [unread]);

    useEffect(() => {
        if (!token) return;
        const s = io(SOCKET_URL, { auth: { token } });

        s.on('connect', () => console.log('✅ Socket'));
        s.on('connect_error', e => console.error('Socket:', e.message));

        s.on('chat:new', chat => {
            setChats(prev => prev.find(c => c._id === chat._id) ? prev : [chat, ...prev]);
        });
        s.on('chat:new', chat => setChats(prev => prev.some(c => c._id === chat._id) ? prev : [chat, ...prev]));
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
                .map(c => c._id === chatId ? { ...c, last_message: message, updatedAt: new Date().toISOString() } : c)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
            setIncomingMsg({ chatId, message, ts: Date.now() });
            setActiveChat(prev => {
                if (prev?._id !== chatId) setUnread(u => ({ ...u, [chatId]: (u[chatId] || 0) + 1 }));
                return prev;
            });
        });
        s.on('message:reaction', data => setIncomingReaction({ ...data, ts: Date.now() }));
        s.on('users:online_list', ids => setOnline(new Set(ids)));
        s.on('user:online', id => setOnline(prev => new Set([...prev, id])));
        s.on('user:offline', id => setOnline(prev => { const n = new Set(prev); n.delete(id); return n; }));
        setSocket(s);
        return () => s.disconnect();
    }, [token]);

    const loadChats = useCallback(async () => {
        try {
            setChats(await apiFetch('/api/chats', {}, token));
        } catch {}
    }, [token]);

    useEffect(() => { loadChats(); }, [loadChats]);

    function handleLogout() {
        socket?.disconnect();
        logout();
        navigate('/login');
    }

    function handleNewChat(chat) {
        setChats(prev => prev.some(c => c._id === chat._id) ? prev : [chat, ...prev]);
        setActiveChat(chat);
        setUnread(u => { const n = { ...u }; delete n[chat._id]; return n; });
        setMobileView('chat');
    }

    function handleSelectChat(chat) {
        setActiveChat(chat);
        setUnread(u => { const n = { ...u }; delete n[chat._id]; return n; });
        setMobileView('chat');
    }

    function handleBack() {
        setMobileView('list');
    }

    function handleRemoveChat(chatId) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        setUnread(u => { const n = { ...u }; delete n[chatId]; return n; });
        if (activeChat?._id === chatId) { setActiveChat(null); setMobileView('list'); }
        if (activeChat?._id === chatId) {
            setActiveChat(null);
            setMobileView('list');
        }
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: colors.bgApp }}>
            <div style={{
                display: mobileView === 'chat' && isMobile ? 'none' : 'flex',
                flexDirection: 'column',
                width: 300, minWidth: 260,
                ...(isMobile ? { width: '100%', minWidth: 'unset' } : {}),
            }} className="sidebar-panel">
                <ChatList
                    chats={chats}
                    activeId={activeChat?._id}
                    onSelect={handleSelectChat}
                    onNewChat={handleNewChat}
                    onLogout={handleLogout}
                    online={online}
                    onRemoveChat={handleRemoveChat}
                    unread={unread}
                />
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: colors.bgApp }}>
            <div style={{ display: mobileView === 'chat' && isMobile ? 'none' : 'flex', flexDirection: 'column', width: 300, minWidth: 260, ...(isMobile ? { width: '100%', minWidth: 'unset' } : {}) }} className="sidebar-panel">
                <ChatList chats={chats} activeId={activeChat?._id} onSelect={handleSelectChat} onNewChat={handleNewChat} onLogout={handleLogout} online={online} onRemoveChat={handleRemoveChat} unread={unread} />
            </div>
            <div style={{ flex: 1, display: mobileView === 'list' && isMobile ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
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