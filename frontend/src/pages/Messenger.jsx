import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import ChatList   from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';

export default function Messenger() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [chats,      setChats]      = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [socket,     setSocket]     = useState(null);
    const [online,     setOnline]     = useState(new Set());
    const [incomingMessage, setIncomingMessage] = useState(null);

    useEffect(() => {
        if (!token) return;
        const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const s = io(socketUrl, { auth: { token } });

        s.on('connect',       () => console.log('Socket подключён'));
        s.on('connect_error', err => console.error('Socket ошибка:', err.message));

        s.on('chat:new', chat => {
            setChats(prev => prev.find(c => c._id === chat._id) ? prev : [chat, ...prev]);
        });

        s.on('message:new', ({ chatId, message }) => {
            setChats(prev => prev
                .map(c => c._id === chatId
                    ? { ...c, last_message: message, updatedAt: new Date().toISOString() }
                    : c
                )
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            );
            setIncomingMessage({ chatId, message, ts: Date.now() });
        });

        s.on('user:online',  id => setOnline(prev => new Set([...prev, id])));
        s.on('user:offline', id => setOnline(prev => { const n = new Set(prev); n.delete(id); return n; }));

        setSocket(s);
        return () => s.disconnect();
    }, [token]);

    const loadChats = useCallback(async () => {
        try {
            const data = await apiFetch('/api/chats', {}, token);
            setChats(data);
        } catch (err) {
            console.error('Ошибка загрузки чатов:', err.message);
        }
    }, [token]);

    useEffect(() => { loadChats(); }, [loadChats]);

    function handleLogout() {
        socket?.disconnect();
        logout();
        navigate('/login');
    }

    function handleNewChat(chat) {
        setChats(prev => prev.find(c => c._id === chat._id) ? prev : [chat, ...prev]);
        setActiveChat(chat);
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <ChatList
                chats={chats}
                activeId={activeChat?._id}
                onSelect={setActiveChat}
                onNewChat={handleNewChat}
                onLogout={handleLogout}
                online={online}
            />
            <ChatWindow
                key={activeChat?._id}
                chat={activeChat}
                socket={socket}
                online={online}
                incomingMessage={incomingMessage}
            />
        </div>
    );
}