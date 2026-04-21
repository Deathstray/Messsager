import { fileUrl } from '../api';

function fmtSize(b) {
    if (b < 1024) return b + ' Б';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' КБ';
    return (b / 1048576).toFixed(1) + ' МБ';
}
const isImg   = m => m?.startsWith('image/');
const isVid   = m => m?.startsWith('video/');
const isAudio = m => m?.startsWith('audio/');

function fileIcon(name = '') {
    if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return '📦';
    if (/\.pdf$/i.test(name))                  return '📄';
    if (/\.(doc|docx)$/i.test(name))           return '📝';
    if (/\.(xls|xlsx)$/i.test(name))           return '📊';
    return '📎';
}

export default function MessageBubble({ msg, isGroup, myId, onDelete, onReact, onContextMenu }) {
    const fromId = msg.from_user?._id ?? msg.from_user;
    const isMe   = String(fromId) === String(myId);
    const time   = new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const reactions = (msg.reactions || []).filter(r => r.users?.length > 0);

    const bubbleBg    = isMe ? '#2196f3' : '#f0f0f0';
    const bubbleColor = isMe ? '#fff' : '#222';

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 4 }}
            onContextMenu={e => onContextMenu && onContextMenu(e, msg)}
        >
            {/* Имя в группе (чужие сообщения) */}
            {!isMe && isGroup && (
                <span style={{ fontSize: 11, color: msg.from_user?.avatar_color || '#888', marginLeft: 8, marginBottom: 2, fontWeight: 600 }}>
                    {msg.from_user?.display_name}
                </span>
            )}

            <div style={{ maxWidth: '68%', background: bubbleBg, color: bubbleColor, padding: '8px 12px', borderRadius: 16, wordBreak: 'break-word' }}>

                {/* Пересланное */}
                {msg.forwarded_from?.sender_name && (
                    <div style={{ borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.4)' : '#2196f3'}`, paddingLeft: 8, marginBottom: 6, opacity: 0.9 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isMe ? '#cce5ff' : '#2196f3', marginBottom: 2 }}>
                            ↪ {msg.forwarded_from.sender_name}
                            {msg.forwarded_from.chat_name ? ` · ${msg.forwarded_from.chat_name}` : ''}
                        </div>
                    </div>
                )}

                {/* Ответ на сообщение */}
                {msg.reply_to && (
                    <div style={{ borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.4)' : '#2196f3'}`, paddingLeft: 8, marginBottom: 6, background: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(33,150,243,0.07)', borderRadius: '0 6px 6px 0', padding: '4px 4px 4px 8px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isMe ? '#cce5ff' : '#2196f3' }}>
                            {msg.reply_to.from_user?.display_name}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.reply_to.text || '📎 Файл'}
                        </div>
                    </div>
                )}

                {/* Текст */}
                {msg.text && <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</p>}

                {/* Файлы */}
                {msg.files?.map((f, i) => (
                    <div key={i} style={{ marginTop: msg.text ? 6 : 0 }}>
                        {isImg(f.mimetype) && (
                            <img src={fileUrl(f.filename)} alt={f.original_name}
                                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, display: 'block', cursor: 'pointer' }}
                                onClick={() => window.open(fileUrl(f.filename), '_blank')} />
                        )}
                        {isVid(f.mimetype) && (
                            <video src={fileUrl(f.filename)} controls style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, display: 'block' }} />
                        )}
                        {isAudio(f.mimetype) && (
                            <audio src={fileUrl(f.filename)} controls style={{ width: '100%', marginTop: 4 }} />
                        )}
                        {!isImg(f.mimetype) && !isVid(f.mimetype) && !isAudio(f.mimetype) && (
                            <a href={fileUrl(f.filename)} download={f.original_name}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, color: isMe ? '#fff' : '#2196f3', textDecoration: 'none', background: isMe ? 'rgba(255,255,255,0.15)' : '#e3f2fd', borderRadius: 8, padding: '7px 10px' }}>
                                <span style={{ fontSize: 22 }}>{fileIcon(f.original_name)}</span>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{f.original_name}</div>
                                    <div style={{ fontSize: 11, opacity: 0.75 }}>{fmtSize(f.size)}</div>
                                </div>
                            </a>
                        )}
                    </div>
                ))}

                {/* Время + удалить */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 10, opacity: 0.65 }}>{time}</span>
                    {isMe && (
                        <button onClick={e => { e.stopPropagation(); onDelete && onDelete(msg._id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.6, color: '#fff', padding: 0 }}>🗑</button>
                    )}
                </div>
            </div>

            {/* Реакции */}
            {reactions.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    {reactions.map(r => (
                        <button key={r.emoji}
                            onClick={() => onReact && onReact(msg._id, r.emoji)}
                            style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '2px 7px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
                            {r.emoji}
                            <span style={{ fontSize: 11, color: '#555' }}>{r.users?.length}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
