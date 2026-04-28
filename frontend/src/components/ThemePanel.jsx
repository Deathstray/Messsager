import { useState, useEffect, useRef } from 'react';
import { useTheme, THEMES } from '../context/ThemeContext';
import { IconX } from '../icons/Icons';

// Иконка палитры
function IconPalette({ size = 18, color = 'currentColor' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r="1.5" fill={color} stroke="none"/>
            <circle cx="17.5" cy="10.5" r="1.5" fill={color} stroke="none"/>
            <circle cx="8.5" cy="7.5" r="1.5" fill={color} stroke="none"/>
            <circle cx="6.5" cy="12.5" r="1.5" fill={color} stroke="none"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
    );
}

// Иконка шрифта
function IconFont({ size = 16, color = 'currentColor' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
            <text x="2" y="19" fontSize="20" fontFamily="serif" fontWeight="bold">A</text>
        </svg>
    );
}

// Иконка скруглений
function IconRadius({ size = 16, color = 'currentColor' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <path d="M3 21V9a6 6 0 0 1 6-6h12"/>
        </svg>
    );
}

const FONTS = [
    { id: 'nunito',    label: 'Nunito',   css: "'Nunito', sans-serif" },
    { id: 'inter',     label: 'Inter',    css: "'Inter', sans-serif" },
    { id: 'roboto',    label: 'Roboto',   css: "'Roboto', sans-serif" },
    { id: 'mono',      label: 'Mono',     css: "'JetBrains Mono', 'Courier New', monospace" },
];

const SIZES = [
    { id: 'compact', label: 'Компакт', value: 13 },
    { id: 'default', label: 'Стандарт', value: 15 },
    { id: 'large',   label: 'Крупный', value: 17 },
];

const RADII = [
    { id: 'sharp',  label: 'Острые',    value: 4  },
    { id: 'medium', label: 'Средние',   value: 14 },
    { id: 'round',  label: 'Круглые',   value: 24 },
];

export default function ThemePanel({ onClose }) {
    const { themeId, setTheme, colors } = useTheme();

    const [font,   setFont]   = useState(() => localStorage.getItem('msng-font')   || 'nunito');
    const [size,   setSize]   = useState(() => localStorage.getItem('msng-size')   || 'default');
    const [radius, setRadius] = useState(() => localStorage.getItem('msng-radius') || 'medium');

    // Apply CSS variables on change
    useEffect(() => {
        const f = FONTS.find(f => f.id === font);
        if (f) document.documentElement.style.setProperty('--app-font', f.css);
        localStorage.setItem('msng-font', font);
    }, [font]);

    useEffect(() => {
        const s = SIZES.find(s => s.id === size);
        if (s) document.documentElement.style.setProperty('--app-size', s.value + 'px');
        localStorage.setItem('msng-size', size);
    }, [size]);

    useEffect(() => {
        const r = RADII.find(r => r.id === radius);
        if (r) document.documentElement.style.setProperty('--app-radius', r.value + 'px');
        localStorage.setItem('msng-radius', radius);
    }, [radius]);

    const panelRef = useRef(null);
    useEffect(() => {
        const fn = e => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
        setTimeout(() => document.addEventListener('mousedown', fn), 10);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const s = {
        overlay: { position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'flex-end', justifyContent:'flex-start' },
        panel:   { position:'fixed', left:308, top:60, width:300, background:colors.panelBg, borderRadius:18, boxShadow:'0 8px 40px rgba(0,0,0,.22)', border:`1px solid ${colors.panelBorder}`, overflow:'hidden', zIndex:400 },
        head:    { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px 12px', borderBottom:`1px solid ${colors.border}` },
        title:   { fontWeight:700, fontSize:15, color:colors.textPrimary },
        section: { padding:'14px 18px 0' },
        label:   { fontSize:11, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:colors.textMuted, marginBottom:10, display:'flex', alignItems:'center', gap:6 },
        row:     { display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 },
        chip:    (active) => ({
            padding:'6px 14px', borderRadius:99, fontSize:13, cursor:'pointer', fontWeight: active ? 700 : 400,
            background: active ? colors.accent : colors.bgPill,
            color:       active ? '#fff'        : colors.textSecondary,
            border:     `1.5px solid ${active ? colors.accent : colors.border}`,
            transition: 'all 150ms ease',
        }),
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div ref={panelRef} style={s.panel} className="card-anim">
                {/* Header */}
                <div style={s.head}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <IconPalette size={18} color={colors.accent} />
                        <span style={s.title}>Настройка визуала</span>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', borderRadius:8, padding:4 }}>
                        <IconX size={16} color={colors.textMuted} />
                    </button>
                </div>

                {/* Тема */}
                <div style={s.section}>
                    <div style={s.label}>
                        <IconPalette size={12} color={colors.textMuted} /> Тема
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:18 }}>
                        {Object.values(THEMES).map(t => (
                            <button key={t.id} onClick={() => setTheme(t.id)}
                                style={{
                                    border: themeId === t.id ? `2.5px solid ${colors.accent}` : `2px solid ${colors.border}`,
                                    borderRadius:12, padding:'8px 4px 6px', cursor:'pointer',
                                    background: t.colors.bgSidebar,
                                    transition:'all 160ms ease',
                                    transform: themeId === t.id ? 'scale(1.04)' : 'scale(1)',
                                    boxShadow: themeId === t.id ? `0 0 0 3px ${colors.accentLight}` : 'none',
                                }}>
                                {/* Превью цветов */}
                                <div style={{ display:'flex', gap:3, justifyContent:'center', marginBottom:5 }}>
                                    {t.preview.map((c, i) => (
                                        <div key={i} style={{ width:16, height:16, borderRadius:'50%', background:c, boxShadow:'0 1px 3px rgba(0,0,0,.15)' }} />
                                    ))}
                                </div>
                                {/* Mini chat preview */}
                                <div style={{ background:t.colors.bgChat, borderRadius:6, padding:'4px 5px', marginBottom:3 }}>
                                    <div style={{ height:5, borderRadius:3, background:t.colors.bgMsgIn, marginBottom:3, width:'70%', boxShadow:'0 1px 2px rgba(0,0,0,.08)' }} />
                                    <div style={{ height:5, borderRadius:3, background:t.colors.bgMsgOut, width:'55%', marginLeft:'auto' }} />
                                </div>
                                <div style={{ fontSize:11, fontWeight:600, color:t.colors.accent, textAlign:'center', paddingTop:2 }}>{t.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Шрифт */}
                <div style={s.section}>
                    <div style={s.label}>
                        <span style={{ fontSize:13, fontWeight:800, color:colors.textMuted }}>A</span> Шрифт
                    </div>
                    <div style={s.row}>
                        {FONTS.map(f => (
                            <button key={f.id} onClick={() => setFont(f.id)} style={{ ...s.chip(font === f.id), fontFamily:f.css }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Размер текста */}
                <div style={s.section}>
                    <div style={s.label}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={colors.textMuted}><circle cx="12" cy="12" r="10"/></svg>
                        Размер текста
                    </div>
                    <div style={s.row}>
                        {SIZES.map(sz => (
                            <button key={sz.id} onClick={() => setSize(sz.id)} style={s.chip(size === sz.id)}>
                                {sz.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Скругления */}
                <div style={{ ...s.section, paddingBottom:18 }}>
                    <div style={s.label}>
                        <IconRadius size={12} color={colors.textMuted} /> Скругления
                    </div>
                    <div style={s.row}>
                        {RADII.map(r => (
                            <button key={r.id} onClick={() => setRadius(r.id)} style={s.chip(radius === r.id)}>
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Preview bubble */}
                    <div style={{ background:colors.bgChat, borderRadius:12, padding:'10px 12px', display:'flex', gap:10, flexDirection:'column' }}>
                        <div style={{ alignSelf:'flex-start', background:colors.bgMsgIn, borderRadius:`var(--app-radius, 14px)`, borderBottomLeftRadius:4, padding:'8px 12px', fontSize:13, color:colors.textPrimary, boxShadow:'0 1px 4px rgba(0,0,0,.08)', maxWidth:'80%', fontFamily:'var(--app-font)', wordBreak:'break-word' }}>
                            Привет! Как дела? 👋
                        </div>
                        <div style={{ alignSelf:'flex-end', background:colors.bgMsgOut, borderRadius:`var(--app-radius, 14px)`, borderBottomRightRadius:4, padding:'8px 12px', fontSize:13, color:'#fff', maxWidth:'80%', fontFamily:'var(--app-font)' }}>
                            Всё отлично, спасибо! ✦
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
