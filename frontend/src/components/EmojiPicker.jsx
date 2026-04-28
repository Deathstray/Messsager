import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

// ── Категории и эмодзи ──────────────────────────────────────────
const CATEGORIES = [
    {
        id: 'smileys', label: '😊', title: 'Смайлы',
        emojis: ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠','🤬','😷','🤒','🤕','🤢','🤧','🥴','🤠','🥳','😇','🤡','🤥','🤫','🤭','🧐','🤓'],
    },
    {
        id: 'gestures', label: '👋', title: 'Жесты',
        emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','👀','👁️','👅','👄','🫦','🦷','👶','🧒','👦','👧','🧑','👱'],
    },
    {
        id: 'hearts', label: '❤️', title: 'Сердца',
        emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','💒','⚡','🔥','💫','⭐','🌟','✨','💥','❄️','🌈','☁️','⛅','🌤️','🌊','💧','💦','🌸','🌹','🌺','🌻','🌼','🌷','🍀','🌿','🌱','🍃','🍂','🍁'],
    },
    {
        id: 'animals', label: '🐶', title: 'Животные',
        emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐟','🐬','🐳','🐋','🦈','🐊','🦭'],
    },
    {
        id: 'food', label: '🍕', title: 'Еда',
        emojis: ['🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥒','🌽','🌶️','🥕','🧅','🧄','🥔','🍠','🥐','🥖','🍞','🥨','🥯','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🌮','🌯','🥙','🧆','🥚','🍜','🍝','🍛','🍱','🍤','🦐','🦞','🍣','🍙','🍚','🍘','🍥','🥮','🍡','🍧','🍨','🍦','🥧','🍰','🎂','🧁','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','☕','🍵','🧉','🍺','🍻','🥂','🍷','🥃','🍹','🧃','🥤','🧊'],
    },
    {
        id: 'travel', label: '✈️', title: 'Путешествия',
        emojis: ['🚗','🚕','🚙','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🛻','🛴','🛵','🏍️','🚲','🛺','✈️','🚀','🛸','🚁','🛶','⛵','🚢','🛳️','🚂','🚆','🚇','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏬','🏭','🏗️','🏰','🗼','🗽','🗿','⛩️','🏯','🎡','🎢','🎠','⛲','🌁','🌃','🌆','🌇','🌉','🌌','🌠','🎆','🎇','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️'],
    },
    {
        id: 'activities', label: '⚽', title: 'Активности',
        emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🥅','⛳','🪁','🎣','🤿','🎽','🎿','🛷','🥌','🎯','🪃','🏹','🎮','🕹️','🎲','🧩','🪄','♟️','🎭','🎨','🖼️','🎪','🎤','🎧','🎷','🎸','🥁','🎻','🪕','🎺','🎹','🎬','🎥','📽️','📷','📸','📱','💻','🖥️','🖨️','⌨️','🖱️'],
    },
    {
        id: 'symbols', label: '💯', title: 'Символы',
        emojis: ['💯','🔔','🔕','🎵','🎶','🎼','🏆','🥇','🥈','🥉','🎖️','🏅','🎗️','🎫','🎟️','🎪','⚡','🔥','💫','⭐','🌟','✨','💥','🌈','☀️','🌙','💤','💬','💭','🗯️','💢','♨️','💈','🚀','🎁','🎀','🎊','🎉','🎈','🪅','🎋','🎄','🎆','🎇','🧨','✅','❌','❓','❗','💲','💱','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔲','🔳'],
    },
];

export default function EmojiPicker({ onSelect, onClose }) {
    const { colors } = useTheme();
    const [cat, setCat] = useState('smileys');
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        setTimeout(() => document.addEventListener('mousedown', fn), 10);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const current = CATEGORIES.find(c => c.id === cat);
    const filtered = search.trim()
        ? CATEGORIES.flatMap(c => c.emojis).filter(() => true) // just show all when searching (emojis have no text to search)
        : current?.emojis || [];

    return (
        <div ref={ref} className="card-anim" style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
            width: 320, background: colors.bgSidebar,
            border: `1px solid ${colors.border}`, borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,.18)', overflow: 'hidden', zIndex: 100,
        }}>

            {/* Search */}
            <div style={{ padding: '10px 12px 6px' }}>
                <input
                    className="input-focus"
                    style={{ width: '100%', padding: '7px 12px', borderRadius: 10, border: `1.5px solid ${colors.border}`, fontSize: 13, background: colors.bgInput, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' }}
                    placeholder="🔍  Поиск эмодзи..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                />
            </div>

            {/* Category tabs */}

            {!search && (
                <div style={{ display: 'flex', overflowX: 'auto', padding: '0 8px 6px', gap: 2, borderBottom: `1px solid ${colors.border}` }}>
                    {CATEGORIES.map(c => (
                        <button key={c.id} onClick={() => setCat(c.id)}
                            title={c.title}
                            style={{
                                background: cat === c.id ? colors.accentLight : 'none',
                                border: 'none', borderRadius: 8, cursor: 'pointer',
                                fontSize: 18, padding: '4px 7px', flexShrink: 0,
                                opacity: cat === c.id ? 1 : 0.6,
                                transition: 'all 120ms ease',
                            }}>
                            {c.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Category title */}

            {!search && (
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, padding: '6px 14px 2px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    {current?.title}
                </div>
            )}


            {/* Emoji grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, padding: '4px 8px 10px', maxHeight: 220, overflowY: 'auto' }}>
                {(search ? CATEGORIES.flatMap(c => c.emojis) : filtered).map((em, i) => (
                    <button key={i} onClick={() => { onSelect(em); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: '5px 3px', borderRadius: 8, lineHeight: 1, transition: 'transform 100ms ease, background 100ms ease' }}
                        onMouseEnter={e => { e.currentTarget.style.background = colors.bgHover; e.currentTarget.style.transform = 'scale(1.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}>
                        {em}
                    </button>
                ))}
            </div>
        </div>
    );
}
