import { fileUrl } from '../api';
import { IconTrash } from '../icons/Icons';
import { useTheme } from '../context/ThemeContext';

function fmtSize(b) {
    if (b < 1024) return `${b} Б`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} КБ`;
    return `${(b / 1024 / 1024).toFixed(1)} МБ`;
}

const isImg = m => m?.startsWith('image/');
const isVid = m => m?.startsWith('video/');
const isAudio = m => m?.startsWith('audio/');

function fileIcon(name = '') {
    if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return '📦';
    if (/\.pdf$/i.test(name)) return '📄';
    if (/\.(doc|docx)$/i.test(name)) return '📝';
    if (/\.(xls|xlsx)$/i.test(name)) return '📊';
    return '📎';
}

export default function MessageBubble({ msg, isGroup, myId, onDelete, onReact, onContextMenu, onJoinScreen }) {
    const { colors } = useTheme();
    const fromId = msg.from_user?._id ?? msg.from_user;
    const isMe = String(fromId) === String(myId);
    const time = new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const reactions = (msg.reactions || []).filter(r => r.users?.length > 0);
    const senderName = msg.from_user?.display_name || 'Пользователь';
    const senderAvatar = msg.from_user?.avatar;
    const senderColor = msg.from_user?.avatar_color || colors.accent;
    const showSender = isGroup || !isMe;
    const isScreenInvite = msg.kind === 'screen_invite';

    const bubbleBg = isMe ? colors.bgMsgOut : colors.bgMsgIn;
    const bubbleColor = isMe ? '#ffffff' : colors.textPrimary;
    const accentColor = isMe ? 'rgba(255,255,255,.4)' : colors.accent;
    const accentText = isMe ? '#ffd0df' : colors.textAccent;

    return (
        <div className="msg-anim" style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 4 }} onContextMenu={e => onContextMenu && onContextMenu(e, msg)}>
            {showSender && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: isMe ? 0 : 8, marginRight: isMe ? 8 : 0, marginBottom: 3, alignSelf: isMe ? 'flex-end' : 'flex-start', userSelect: 'none', pointerEvents: 'none' }}>
                    {senderAvatar ? <img src={fileUrl(senderAvatar)} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', background: senderColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{senderName[0]?.toUpperCase() || '?'}</div>}
                    <span style={{ fontSize: 12, color: isMe ? colors.textMuted : senderColor, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{senderName}</span>
                </div>
            )}

            {isScreenInvite ? (
                <div style={{ maxWidth: '72%', background: bubbleBg, color: bubbleColor, padding: '11px 14px', borderRadius: 16, wordBreak: 'break-word', boxShadow: isMe ? '0 2px 8px rgba(123,31,58,.25)' : '0 1px 4px rgba(0,0,0,.08)', borderBottomLeftRadius: isMe ? 16 : 4, borderBottomRightRadius: isMe ? 4 : 16, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: isMe ? 'rgba(255,255,255,.12)' : colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            📺
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: isMe ? '#fff' : colors.textPrimary }}>Демонстрация экрана</div>
                            <div style={{ fontSize: 12, color: isMe ? 'rgba(255,255,255,.75)' : colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isMe ? 'Вы начали демонстрацию' : `${senderName} приглашает посмотреть экран`}
                            </div>
                        </div>
                    </div>
                    {!isMe && onJoinScreen && msg.screen_session?.status !== 'ended' && (
                        <button type="button" onClick={() => onJoinScreen(msg.screen_session?.session_id, msg._id)} style={{ width: '100%', marginTop: 6, background: colors.joinBtn, color: colors.joinBtnText, border: 'none', borderRadius: 10, padding: '8px 10px', fontWeight: 800, cursor: 'pointer' }}>
                            Присоединиться
                        </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8, userSelect: 'none', pointerEvents: 'none' }}>
                        <span style={{ fontSize: 10, opacity: 0.65 }}>{time}</span>
                    </div>
                </div>
            ) : (
                <div style={{ maxWidth: '68%', background: bubbleBg, color: bubbleColor, padding: '9px 13px', borderRadius: 16, wordBreak: 'break-word', boxShadow: isMe ? '0 2px 8px rgba(123,31,58,.25)' : '0 1px 4px rgba(0,0,0,.08)', borderBottomLeftRadius: isMe ? 16 : 4, borderBottomRightRadius: isMe ? 4 : 16 }}>
                    {msg.forwarded_from?.sender_name && (
                        <div style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: 8, marginBottom: 6, opacity: 0.9 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: accentText, marginBottom: 2 }}>
                                ↪ {msg.forwarded_from.sender_name}{msg.forwarded_from.chat_name ? ` · ${msg.forwarded_from.chat_name}` : ''}
                            </div>
                        </div>
                    )}
                    {msg.reply_to && (
                        <div style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: 8, marginBottom: 6, background: isMe ? 'rgba(255,255,255,0.1)' : colors.accentLight, borderRadius: '0 6px 6px 0', padding: '4px 4px 4px 8px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: accentText }}>{msg.reply_to.from_user?.display_name}</div>
                            <div style={{ fontSize: 12, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.reply_to.text || '📎 Файл'}</div>
                        </div>
                    )}

                    {msg.text && <p style={{ margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</p>}

                    {msg.files?.map((f, i) => (
                        <div key={i} style={{ marginTop: msg.text ? 6 : 0 }}>
                            {isImg(f.mimetype) && <img src={fileUrl(f.filename)} alt={f.original_name} style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 10, display: 'block', cursor: 'pointer' }} onClick={() => window.open(fileUrl(f.filename), '_blank')} />}
                            {isVid(f.mimetype) && <video src={fileUrl(f.filename)} controls style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 10, display: 'block' }} />}
                            {isAudio(f.mimetype) && <audio src={fileUrl(f.filename)} controls style={{ width: '100%', marginTop: 4 }} />}
                            {!isImg(f.mimetype) && !isVid(f.mimetype) && !isAudio(f.mimetype) && (
                                <a href={fileUrl(f.filename)} download={f.original_name} style={{ display: 'flex', alignItems: 'center', gap: 8, color: isMe ? '#fff' : colors.textAccent, textDecoration: 'none', background: isMe ? 'rgba(255,255,255,0.15)' : colors.accentLight, borderRadius: 8, padding: '7px 10px' }}>
                                    <span style={{ fontSize: 22 }}>{fileIcon(f.original_name)}</span>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{f.original_name}</div>
                                        <div style={{ fontSize: 11, opacity: 0.75 }}>{fmtSize(f.size)}</div>
                                    </div>
                                </a>
                            )}
                        </div>
                    ))}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4, userSelect: 'none', pointerEvents: 'none' }}>
                        <span style={{ fontSize: 10, opacity: 0.6 }}>{time}</span>
                    </div>
                    {isMe && onDelete && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2, pointerEvents: 'auto' }}>
                            <button type="button" onClick={e => { e.stopPropagation(); onDelete(msg._id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.55, padding: 0, display: 'flex', alignItems: 'center' }}><IconTrash size={12} color="#fff" /></button>
                        </div>
                    )}
                </div>
            )}

            {reactions.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    {reactions.map(r => (
                        <button key={r.emoji} type="button" onClick={() => onReact && onReact(msg._id, r.emoji)} style={{ background: colors.bgSidebar, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '2px 7px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
                            {r.emoji}
                            <span style={{ fontSize: 11, color: colors.textSecondary }}>{r.users?.length}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
