import { useState, useEffect, useCallback, useRef } from 'react';
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
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 640);

    // Ref to track active chat ID without stale closures in socket callbacks
    const activeChatIdRef = useRef(null);
    useEffect(() => {
        activeChatIdRef.current = activeChat?._id || null;
    }, [activeChat]);

    useEffect(() => {
        const total = Object.values(unread).reduce((sum, n) => sum + n, 0);
        document.title = total > 0 ? `(${total}) TrinityChat` : 'TrinityChat';
    }, [unread]);

    useEffect(() => {
        function onResize() {
            setIsMobile(window.innerWidth <= 640);
        }
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (!token) return;

        const s = io(SOCKET_URL, { auth: { token } });

        s.on('connect', () => console.log('✅ Socket connected'));
        s.on('connect_error', e => console.error('Socket error:', e.message));

        s.on('chat:new', chat => {
            setChats(prev => prev.some(c => c._id === chat._id) ? prev : [chat, ...prev]);
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
            setChats(prev => {
                const next = prev.map(c =>
                    c._id === chatId
                        ? { ...c, last_message: message, updatedAt: new Date().toISOString() }
                        : c
                );
                next.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                return next;
            });

            setIncomingMsg({ chatId, message, ts: Date.now() });

            // Use ref to avoid stale closure — only count unread for non-active chats
            if (activeChatIdRef.current !== chatId) {
                setUnread(u => ({ ...u, [chatId]: (u[chatId] || 0) + 1 }));
            }
        });

        s.on('message:reaction', data => {
            setIncomingReaction({ ...data, ts: Date.now() });
        });

        s.on('users:online_list', ids => {
            setOnline(new Set(ids));
        });

        s.on('user:online', id => {
            setOnline(prev => new Set([...prev, id]));
        });

        s.on('user:offline', id => {
            setOnline(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        });

        setSocket(s);

        return () => s.disconnect();
    }, [token]);

    const loadChats = useCallback(async () => {
        try {
            const data = await apiFetch('/api/chats', {}, token);
            setChats(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
    }, [token]);

    useEffect(() => {
        loadChats();
    }, [loadChats]);

    function handleLogout() {
        socket?.disconnect();
        logout();
        navigate('/login');
    }

    function handleNewChat(chat) {
        setChats(prev => prev.some(c => c._id === chat._id) ? prev : [chat, ...prev]);
        setActiveChat(chat);
        setUnread(u => {
            const next = { ...u };
            delete next[chat._id];
            return next;
        });
        setMobileView('chat');
    }

    function handleSelectChat(chat) {
        setActiveChat(chat);
        setUnread(u => {
            const next = { ...u };
            delete next[chat._id];
            return next;
        });
        setMobileView('chat');
    }

    function handleBack() {
        setMobileView('list');
    }

    function handleRemoveChat(chatId) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        setUnread(u => {
            const next = { ...u };
            delete next[chatId];
            return next;
        });
        if (activeChat?._id === chatId) {
            setActiveChat(null);
            setMobileView('list');
        }
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: colors.bgApp }}>
            <div
                style={{
                    display: mobileView === 'chat' && isMobile ? 'none' : 'flex',
                    flexDirection: 'column',
                    width: isMobile ? '100%' : 300,
                    minWidth: isMobile ? 'unset' : 260
                }}
                className="sidebar-panel"
            >
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
            </div>

            <div
                style={{
                    flex: 1,
                    display: mobileView === 'list' && isMobile ? 'none' : 'flex',
                    flexDirection: 'column',
                    minWidth: 0
                }}
            >
                <ChatWindow
                    key={activeChat?._id || 'empty'}
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