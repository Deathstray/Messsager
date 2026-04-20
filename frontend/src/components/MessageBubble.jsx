import { useAuth } from '../context/AuthContext';
import { fileUrl }  from '../api';

function formatSize(bytes) {
    if (bytes < 1024)            return `${bytes} Б`;
    if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

const isImage = mime => mime?.startsWith('image/');
const isVideo = mime => mime?.startsWith('video/');
const isAudio = mime => mime?.startsWith('audio/');

export default function MessageBubble({ msg, isGroup, onDelete }) {
    const { user } = useAuth();

    // Сравниваем id — from_user может быть объектом (после populate) или строкой
    const fromId = msg.from_user?._id ?? msg.from_user;
    const isMe   = String(fromId) === String(user?.id);

    const time = new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit',
    });

    return (
        <div style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    isMe ? 'flex-end' : 'flex-start',
            marginBottom:  4,
        }}>
            {/* Имя отправителя — только в группе и только для чужих сообщений */}
            {!isMe && isGroup && (
                <span style={{
                    fontSize:    11,
                    color:       msg.from_user?.avatar_color || '#888',
                    marginLeft:  8,
                    marginBottom: 2,
                    fontWeight:  600,
                }}>
                    {msg.from_user?.display_name}
                </span>
            )}

            <div style={{
                ...s.bubble,
                background: isMe ? '#2196f3' : '#f0f0f0',
                color:      isMe ? '#fff'    : '#222',
                maxWidth:   '65%',
            }}>
                {/* Текст сообщения */}
                {msg.text && (
                    <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.text}
                    </p>
                )}

                {/* Вложения */}
                {msg.files?.map((f, i) => (
                    <div key={i} style={{ marginTop: msg.text ? 8 : 0 }}>

                        {/* Изображение */}
                        {isImage(f.mimetype) && (
                            <img
                                src={fileUrl(f.filename)}
                                alt={f.original_name}
                                style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, display: 'block', cursor: 'pointer' }}
                                onClick={() => window.open(fileUrl(f.filename), '_blank')}
                            />
                        )}

                        {/* Видео */}
                        {isVideo(f.mimetype) && (
                            <video
                                src={fileUrl(f.filename)}
                                controls
                                style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, display: 'block' }}
                            />
                        )}

                        {/* Аудио */}
                        {isAudio(f.mimetype) && (
                            <audio
                                src={fileUrl(f.filename)}
                                controls
                                style={{ width: '100%', marginTop: 4 }}
                            />
                        )}

                        {/* Все остальные файлы (архивы, документы и т.д.) */}
                        {!isImage(f.mimetype) && !isVideo(f.mimetype) && !isAudio(f.mimetype) && (
                            <a
                                href={fileUrl(f.filename)}
                                download={f.original_name}
                                style={{
                                    display:        'flex',
                                    alignItems:     'center',
                                    gap:            8,
                                    color:          isMe ? '#fff' : '#2196f3',
                                    textDecoration: 'none',
                                    background:     isMe ? 'rgba(255,255,255,0.15)' : '#e3f2fd',
                                    borderRadius:   8,
                                    padding:        '8px 12px',
                                }}
                            >
                                <span style={{ fontSize: 24 }}>
                                    {f.mimetype?.includes('zip') || f.mimetype?.includes('archive') || f.original_name?.match(/\.(zip|rar|7z|tar|gz)$/i)
                                        ? '📦'
                                        : f.original_name?.match(/\.(pdf)$/i) ? '📄'
                                        : f.original_name?.match(/\.(doc|docx)$/i) ? '📝'
                                        : f.original_name?.match(/\.(xls|xlsx)$/i) ? '📊'
                                        : '📎'}
                                </span>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                        {f.original_name}
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.75 }}>
                                        {formatSize(f.size)}
                                    </div>
                                </div>
                            </a>
                        )}
                    </div>
                ))}

                {/* Подвал: время + кнопка удаления */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{time}</span>
                    {isMe && (
                        <button
                            onClick={() => onDelete(msg._id)}
                            title="Удалить сообщение"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.7, color: '#fff', padding: 0, lineHeight: 1 }}
                        >🗑</button>
                    )}
                </div>
            </div>
        </div>
    );
}

const s = {
    bubble: { padding: '8px 12px', borderRadius: 16, wordBreak: 'break-word' },
};
