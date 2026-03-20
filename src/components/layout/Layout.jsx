/**
 * Layout — ARKEN app shell.
 *
 * Structure:
 *   Header (full width, h-11)
 *   └── [HistorySidebar 240px?] | [ChatPanel 28%] | [4px handle] | [HXPanel 72%]
 *
 * The history sidebar slides in from the left (toggled by Header's ≡ button).
 * The 28/72 split is draggable.
 *
 * Children must be exactly two elements: [ChatPanel, HXPanel]
 */

import { useRef, useState, useCallback } from 'react';
import Header from './Header';
import HistorySidebar from './HistorySidebar';

const MIN_CHAT_PCT  = 20;
const MAX_CHAT_PCT  = 50;
const DEFAULT_PCT   = 28;

export default function Layout({ children }) {
  const [chatPct,        setChatPct]        = useState(DEFAULT_PCT);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const containerRef = useRef(null);
  const dragging     = useRef(false);

  const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), []);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct  = ((e.clientX - rect.left) / rect.width) * 100;
      setChatPct(Math.min(MAX_CHAT_PCT, Math.max(MIN_CHAT_PCT, pct)));
    };

    const onUp = () => {
      dragging.current               = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, []);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft')  setChatPct(p => Math.max(MIN_CHAT_PCT, p - 1));
    if (e.key === 'ArrowRight') setChatPct(p => Math.min(MAX_CHAT_PCT, p + 1));
  }, []);

  const [chatPanel, hxPanel] = Array.isArray(children) ? children : [children, null];

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <Header onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 min-h-0">
        {/* ── History sidebar (240px, collapsible) ─────────── */}
        <HistorySidebar isOpen={sidebarOpen} />

        {/* ── Split panels ─────────────────────────────────── */}
        <div ref={containerRef} className="flex flex-1 min-h-0 min-w-0">

          {/* Chat panel */}
          <div
            className="flex flex-col min-h-0 border-r"
            style={{
              width:       `${chatPct}%`,
              borderColor: 'var(--color-border)',
            }}
          >
            {chatPanel}
          </div>

          {/* Resize handle */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
            aria-valuenow={Math.round(chatPct)}
            aria-valuemin={MIN_CHAT_PCT}
            aria-valuemax={MAX_CHAT_PCT}
            tabIndex={0}
            className="resize-handle w-1 shrink-0 focus:outline-none"
            onMouseDown={onMouseDown}
            onKeyDown={onKeyDown}
          />

          {/* HX progress panel */}
          <div className="flex flex-col min-h-0 flex-1">
            {hxPanel}
          </div>
        </div>
      </div>
    </div>
  );
}
