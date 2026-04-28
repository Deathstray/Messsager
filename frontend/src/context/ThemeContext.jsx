import { createContext, useContext, useState, useEffect } from 'react';

// ─────────────────────────────────────────────
//  ТЕМЫ
// ─────────────────────────────────────────────
export const THEMES = {
    // Бордо-салатовая (по умолчанию)
    burgundy: {
        id: 'burgundy',
        label: 'Бордо',
        preview: ['#7b1f3a', '#f5f0f2', '#6dbf67'],
        dark: false,
        colors: {
            bgApp:'#f5f0f2', bgSidebar:'#ffffff', bgChat:'#efe6ea',
            bgMsgOut:'#7b1f3a', bgMsgIn:'#ffffff',
            bgInput:'#ffffff', bgHover:'#f5e0e7', bgActive:'#e6f7e5',
            bgEmpty:'#efe6ea', bgModal:'#ffffff', bgContextMenu:'#ffffff',
            bgContextItem:'#f5f5f5', bgPill:'#f0eaed', bgPillActive:'#f5e0e7',
            bgDateLabel:'#e0d0d8', bgReplyBar:'#ffffff', bgFileChip:'#f5e0e7',
            bgForm:'#ffffff', bgHeader:'#ffffff',
            accent:'#7b1f3a', accentLight:'#f5e0e7', accentHover:'#5a1228',
            accent2:'#4a8c43', accent2Light:'#e6f7e5', accent2Hover:'#3a6c34',
            textPrimary:'#1a0812', textSecondary:'#6b4055', textMuted:'#b09aa6',
            textMsgOut:'#ffffff', textAccent:'#7b1f3a', textAccent2:'#4a8c43',
            textOnlineStatus:'#4a8c43', textDateLabel:'#6b4055',
            textContextItem:'#222222', textContextRed:'#c62828',
            textPillActive:'#7b1f3a',
            border:'#e8dde3', shadow:'0 2px 12px rgba(74,10,31,.10)',
            shadowHeader:'0 1px 4px rgba(74,10,31,.07)',
            onlineDot:'#6dbf67', groupBg:'#7b1f3a', savedBg:'#a33358',
            sendBtn:'#7b1f3a', sendBtnText:'#ffffff',
            joinBtn:'#7b1f3a', joinBtnText:'#ffffff',
            errBg:'#fdecea', errText:'#c62828',
            replyBorder:'#7b1f3a', replyText:'#7b1f3a',
            panelBg:'#ffffff', panelBorder:'#e8dde3',
        },
    },

    // Бирюзовая (как на скриншоте)
    teal: {
        id: 'teal',
        label: 'Бирюза',
        preview: ['#3d9fa0', '#e8f5f5', '#e85d6b'],
        dark: false,
        colors: {
            bgApp:'#daf0ef', bgSidebar:'#ffffff', bgChat:'#c8e8e8',
            bgMsgOut:'#3d9fa0', bgMsgIn:'#ffffff',
            bgInput:'#ffffff', bgHover:'#d0eeee', bgActive:'#b8e4e4',
            bgEmpty:'#c8e8e8', bgModal:'#ffffff', bgContextMenu:'#ffffff',
            bgContextItem:'#f0fafa', bgPill:'#e0f2f2', bgPillActive:'#b8e4e4',
            bgDateLabel:'#c0e0e0', bgReplyBar:'#ffffff', bgFileChip:'#d0eeee',
            bgForm:'#ffffff', bgHeader:'#ffffff',
            accent:'#2b8a8b', accentLight:'#d0eeee', accentHover:'#1d6b6c',
            accent2:'#e85d6b', accent2Light:'#fde8ea', accent2Hover:'#c94455',
            textPrimary:'#0f2f30', textSecondary:'#3a7070', textMuted:'#7aadb0',
            textMsgOut:'#ffffff', textAccent:'#2b8a8b', textAccent2:'#c94455',
            textOnlineStatus:'#2b8a8b', textDateLabel:'#3a7070',
            textContextItem:'#1a3a3a', textContextRed:'#c62828',
            textPillActive:'#2b8a8b',
            border:'#b8dcdc', shadow:'0 2px 12px rgba(45,138,139,.12)',
            shadowHeader:'0 1px 4px rgba(45,138,139,.08)',
            onlineDot:'#6dbf67', groupBg:'#2b8a8b', savedBg:'#3d9fa0',
            sendBtn:'#2b8a8b', sendBtnText:'#ffffff',
            joinBtn:'#2b8a8b', joinBtnText:'#ffffff',
            errBg:'#fdecea', errText:'#c62828',
            replyBorder:'#2b8a8b', replyText:'#2b8a8b',
            panelBg:'#ffffff', panelBorder:'#b8dcdc',
        },
    },

    // Индиго-голубая
    indigo: {
        id: 'indigo',
        label: 'Индиго',
        preview: ['#4f46e5', '#eef2ff', '#06b6d4'],
        dark: false,
        colors: {
            bgApp:'#eef2ff', bgSidebar:'#ffffff', bgChat:'#e0e7ff',
            bgMsgOut:'#4f46e5', bgMsgIn:'#ffffff',
            bgInput:'#ffffff', bgHover:'#e0e7ff', bgActive:'#c7d2fe',
            bgEmpty:'#e0e7ff', bgModal:'#ffffff', bgContextMenu:'#ffffff',
            bgContextItem:'#f5f7ff', bgPill:'#eef2ff', bgPillActive:'#c7d2fe',
            bgDateLabel:'#c7d2fe', bgReplyBar:'#ffffff', bgFileChip:'#dde4ff',
            bgForm:'#ffffff', bgHeader:'#ffffff',
            accent:'#4f46e5', accentLight:'#e0e7ff', accentHover:'#3730a3',
            accent2:'#06b6d4', accent2Light:'#cffafe', accent2Hover:'#0891b2',
            textPrimary:'#1e1b4b', textSecondary:'#4338ca', textMuted:'#a5b4fc',
            textMsgOut:'#ffffff', textAccent:'#4f46e5', textAccent2:'#0891b2',
            textOnlineStatus:'#06b6d4', textDateLabel:'#4338ca',
            textContextItem:'#1e1b4b', textContextRed:'#dc2626',
            textPillActive:'#4f46e5',
            border:'#c7d2fe', shadow:'0 2px 12px rgba(79,70,229,.12)',
            shadowHeader:'0 1px 4px rgba(79,70,229,.07)',
            onlineDot:'#06b6d4', groupBg:'#4f46e5', savedBg:'#6366f1',
            sendBtn:'#4f46e5', sendBtnText:'#ffffff',
            joinBtn:'#4f46e5', joinBtnText:'#ffffff',
            errBg:'#fef2f2', errText:'#dc2626',
            replyBorder:'#4f46e5', replyText:'#4f46e5',
            panelBg:'#ffffff', panelBorder:'#c7d2fe',
        },
    },

    // Лесная зелёная
    forest: {
        id: 'forest',
        label: 'Лес',
        preview: ['#2d6a4f', '#f0faf4', '#f4a261'],
        dark: false,
        colors: {
            bgApp:'#ecf7f0', bgSidebar:'#ffffff', bgChat:'#d8eee0',
            bgMsgOut:'#2d6a4f', bgMsgIn:'#ffffff',
            bgInput:'#ffffff', bgHover:'#d0ecda', bgActive:'#b7dfc6',
            bgEmpty:'#d8eee0', bgModal:'#ffffff', bgContextMenu:'#ffffff',
            bgContextItem:'#f0faf4', bgPill:'#e4f5ec', bgPillActive:'#b7dfc6',
            bgDateLabel:'#b7dfc6', bgReplyBar:'#ffffff', bgFileChip:'#d0ecda',
            bgForm:'#ffffff', bgHeader:'#ffffff',
            accent:'#2d6a4f', accentLight:'#d0ecda', accentHover:'#1b4332',
            accent2:'#e07a2f', accent2Light:'#fdebd0', accent2Hover:'#c4621e',
            textPrimary:'#102a1e', textSecondary:'#2d6a4f', textMuted:'#74b897',
            textMsgOut:'#ffffff', textAccent:'#2d6a4f', textAccent2:'#c4621e',
            textOnlineStatus:'#40916c', textDateLabel:'#2d6a4f',
            textContextItem:'#102a1e', textContextRed:'#c62828',
            textPillActive:'#2d6a4f',
            border:'#b7dfc6', shadow:'0 2px 12px rgba(45,106,79,.12)',
            shadowHeader:'0 1px 4px rgba(45,106,79,.07)',
            onlineDot:'#52b788', groupBg:'#2d6a4f', savedBg:'#40916c',
            sendBtn:'#2d6a4f', sendBtnText:'#ffffff',
            joinBtn:'#2d6a4f', joinBtnText:'#ffffff',
            errBg:'#fdecea', errText:'#c62828',
            replyBorder:'#2d6a4f', replyText:'#2d6a4f',
            panelBg:'#ffffff', panelBorder:'#b7dfc6',
        },
    },

    // Ночная (тёмная)
    night: {
        id: 'night',
        label: 'Ночь',
        preview: ['#d48fa6', '#1a0812', '#6dbf67'],
        dark: true,
        colors: {
            bgApp:'#1a0812', bgSidebar:'#261820', bgChat:'#2a1822',
            bgMsgOut:'#7b1f3a', bgMsgIn:'#352530',
            bgInput:'#352530', bgHover:'rgba(163,51,88,.18)', bgActive:'rgba(74,140,67,.18)',
            bgEmpty:'#2a1822', bgModal:'#352530', bgContextMenu:'#352530',
            bgContextItem:'rgba(255,255,255,.06)', bgPill:'rgba(255,255,255,.08)',
            bgPillActive:'rgba(163,51,88,.25)', bgDateLabel:'rgba(255,255,255,.1)',
            bgReplyBar:'#261820', bgFileChip:'rgba(163,51,88,.2)',
            bgForm:'#261820', bgHeader:'#261820',
            accent:'#d48fa6', accentLight:'rgba(163,51,88,.2)', accentHover:'#c07090',
            accent2:'#6dbf67', accent2Light:'rgba(109,191,103,.18)', accent2Hover:'#5aab55',
            textPrimary:'#f0e0e8', textSecondary:'#c09ab0', textMuted:'#7a5870',
            textMsgOut:'#ffffff', textAccent:'#d48fa6', textAccent2:'#6dbf67',
            textOnlineStatus:'#6dbf67', textDateLabel:'#c09ab0',
            textContextItem:'#f0e0e8', textContextRed:'#ef5350',
            textPillActive:'#d48fa6',
            border:'#4a2030', shadow:'0 2px 12px rgba(0,0,0,.3)',
            shadowHeader:'0 1px 4px rgba(0,0,0,.2)',
            onlineDot:'#6dbf67', groupBg:'#7b1f3a', savedBg:'#a33358',
            sendBtn:'#7b1f3a', sendBtnText:'#ffffff',
            joinBtn:'#d48fa6', joinBtnText:'#1a0812',
            errBg:'rgba(198,40,40,.2)', errText:'#ef9a9a',
            replyBorder:'#d48fa6', replyText:'#d48fa6',
            panelBg:'#261820', panelBorder:'#4a2030',
        },
    },

    // Тёмно-бирюзовая
    nightTeal: {
        id: 'nightTeal',
        label: 'Тёмная бирюза',
        preview: ['#3d9fa0', '#0d2626', '#e85d6b'],
        dark: true,
        colors: {
            bgApp:'#0d2626', bgSidebar:'#0f3030', bgChat:'#122e2e',
            bgMsgOut:'#2b8a8b', bgMsgIn:'#1a4040',
            bgInput:'#1a4040', bgHover:'rgba(61,159,160,.18)', bgActive:'rgba(61,159,160,.22)',
            bgEmpty:'#122e2e', bgModal:'#1a4040', bgContextMenu:'#1a4040',
            bgContextItem:'rgba(255,255,255,.06)', bgPill:'rgba(255,255,255,.08)',
            bgPillActive:'rgba(61,159,160,.25)', bgDateLabel:'rgba(255,255,255,.1)',
            bgReplyBar:'#0f3030', bgFileChip:'rgba(61,159,160,.2)',
            bgForm:'#0f3030', bgHeader:'#0f3030',
            accent:'#5fc8c9', accentLight:'rgba(61,159,160,.2)', accentHover:'#3faeb0',
            accent2:'#e85d6b', accent2Light:'rgba(232,93,107,.18)', accent2Hover:'#c94455',
            textPrimary:'#d0f0f0', textSecondary:'#6ab8b8', textMuted:'#3a7070',
            textMsgOut:'#ffffff', textAccent:'#5fc8c9', textAccent2:'#e85d6b',
            textOnlineStatus:'#5fc8c9', textDateLabel:'#6ab8b8',
            textContextItem:'#d0f0f0', textContextRed:'#ef5350',
            textPillActive:'#5fc8c9',
            border:'#1e5050', shadow:'0 2px 12px rgba(0,0,0,.4)',
            shadowHeader:'0 1px 4px rgba(0,0,0,.3)',
            onlineDot:'#5fc8c9', groupBg:'#2b8a8b', savedBg:'#3d9fa0',
            sendBtn:'#2b8a8b', sendBtnText:'#ffffff',
            joinBtn:'#5fc8c9', joinBtnText:'#0d2626',
            errBg:'rgba(198,40,40,.2)', errText:'#ef9a9a',
            replyBorder:'#5fc8c9', replyText:'#5fc8c9',
            panelBg:'#0f3030', panelBorder:'#1e5050',
        },
    },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [themeId, setThemeId] = useState(() => localStorage.getItem('msng-theme') || 'burgundy');
    const theme = THEMES[themeId] || THEMES.burgundy;
    const colors = theme.colors;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme.dark ? 'dark' : 'light');
        localStorage.setItem('msng-theme', themeId);
    }, [themeId, theme.dark]);

    function setTheme(id) { setThemeId(id); }

    // Переключение между светлой и тёмной версией
    function toggleTheme() {
        setThemeId(prev => THEMES[prev]?.dark ? 'burgundy' : 'night');
    }

    return (
        <ThemeContext.Provider value={{ themeId, theme, colors, setTheme, toggleTheme, themes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() { return useContext(ThemeContext); }
