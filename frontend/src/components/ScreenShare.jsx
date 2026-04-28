import React, { useEffect, useRef, useState } from 'react';

export default function ScreenShare({ socket, chatId, onClose }) {
    const videoRef = useRef(null);
    const pcRef = useRef(null);
    const [status, setStatus] = useState('Подключение...');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!socket || !chatId) return;

        let stream;
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        // Когда получаем видео от хоста
        pc.ontrack = (event) => {
            if (videoRef.current && event.streams[0]) {
                videoRef.current.srcObject = event.streams[0];
                setStatus('Просмотр демонстрации');
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('screenshare:ice', { chatId, candidate: event.candidate });
            }
        };

        // Запрашиваем демонстрацию
        socket.emit('screenshare:request', { chatId });

        // Получаем offer от хоста
        const handleOffer = async ({ offer }) => {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('screenshare:answer', { chatId, answer });
            } catch (e) {
                setError('Ошибка подключения: ' + e.message);
                setStatus('Ошибка');
            }
        };

        const handleIce = async ({ candidate }) => {
            if (candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {}
            }
        };

        const handleStop = () => {
            setStatus('Демонстрация завершена');
            setTimeout(onClose, 2000);
        };

        socket.on('screenshare:offer', handleOffer);
        socket.on('screenshare:ice', handleIce);
        socket.on('screenshare:stopped', handleStop);

        return () => {
            socket.off('screenshare:offer', handleOffer);
            socket.off('screenshare:ice', handleIce);
            socket.off('screenshare:stopped', handleStop);
            pc.close();
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [socket, chatId]);

    return (
        <div className="screenshare-modal">
            <div className="screenshare-header">
                <span>{status}</span>
                <button onClick={onClose}>✕ Закрыть</button>
            </div>
            {error && <div className="screenshare-error">{error}</div>}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="screenshare-video"
                style={{ width: '100%', maxHeight: '70vh', background: '#000' }}
            />
        </div>
    );
}