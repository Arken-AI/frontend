/**
 * HistorySidebar — Claude-style collapsible design history panel.
 *
 * Shows ALL past HX designs grouped by date, with search and infinite scroll.
 * Toggled by the ≡ button in the Header.
 *
 * Features:
 *  - Groups: Today / Yesterday / Last 7 days / Last 30 days / Older
 *  - Search by title (client-side filter on loaded items)
 *  - Infinite scroll — loads 30 at a time, fetches more as user scrolls
 *  - Active design highlighted
 *  - Delete with confirm
 *  - "+ New Design" at the top
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { getConversations } from '../../api/client';

const PAGE_SIZE = 30;

// ── Date grouping ─────────────────────────────────────────────────────────────

function getGroup(dateStr) {
  if (!dateStr) return 'Older';
  const d     = new Date(dateStr);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff  = Math.floor((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff <= 7)  return 'Last 7 days';
  if (diff <= 30) return 'Last 30 days';
  return 'Older';
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older'];

function groupConversations(convs) {
  const groups = {};
  for (const c of convs) {
    const g = getGroup(c.updated_at || c.created_at);
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  }
  return groups;
}

// ── Design item ───────────────────────────────────────────────────────────────

function DesignItem({ conv, isActive, onSelect, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const title = conv.title || 'Untitled design';

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(conv.conversation_id);
    } else {
      setConfirmDelete(true);
      // Auto-reset confirm after 3s
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      className="group relative flex items-center px-3 py-2 cursor-pointer transition-colors"
      style={{
        backgroundColor: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
        borderLeft:      isActive ? '2px solid var(--color-running)' : '2px solid transparent',
      }}
      onClick={() => onSelect(conv.conversation_id)}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {/* Title */}
      <span
        className="flex-1 text-xs truncate pr-1"
        style={{
          color:      isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontWeight: isActive ? 500 : 400,
        }}
      >
        {title}
      </span>

      {/* Delete button — visible on hover */}
      <button
        onClick={handleDelete}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          color:  confirmDelete ? 'var(--color-error)' : 'var(--color-text-muted)',
          fontSize: '11px',
        }}
        title={confirmDelete ? 'Click again to confirm' : 'Delete'}
      >
        {confirmDelete ? '✕' : '⌫'}
      </button>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export default function HistorySidebar({ isOpen }) {
  const {
    conversationId,
    setConversationId,
    createNewConversation,
    deleteConversation,
    username,
  } = useChatContext();

  const [items,      setItems]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [loadingMore,setLoadingMore]= useState(false);
  const [search,     setSearch]     = useState('');
  const scrollRef = useRef(null);
  const offsetRef = useRef(0);

  // Initial load / reload when sidebar opens
  const load = useCallback(async (reset = false) => {
    if (loading) return;
    const offset = reset ? 0 : offsetRef.current;
    if (!reset && offset > 0 && items.length >= total) return; // all loaded

    reset ? setLoading(true) : setLoadingMore(true);

    try {
      const data = await getConversations(PAGE_SIZE, offset, username);
      const convs = data.conversations || [];
      setTotal(data.total ?? convs.length);

      if (reset) {
        setItems(convs);
        offsetRef.current = convs.length;
      } else {
        setItems(prev => {
          // Deduplicate by id
          const ids = new Set(prev.map(c => c.conversation_id));
          const fresh = convs.filter(c => !ids.has(c.conversation_id));
          offsetRef.current = prev.length + fresh.length;
          return [...prev, ...fresh];
        });
      }
    } catch (err) {
      console.error('Failed to load designs:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [loading, items.length, total, username]);

  // Load on open
  useEffect(() => {
    if (isOpen) {
      offsetRef.current = 0;
      load(true);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      load(false);
    }
  }, [load, loadingMore]);

  const handleSelect = useCallback((convId) => {
    setConversationId(convId);
  }, [setConversationId]);

  const handleDelete = useCallback(async (convId) => {
    await deleteConversation(convId);
    setItems(prev => prev.filter(c => c.conversation_id !== convId));
    setTotal(t => Math.max(0, t - 1));
    offsetRef.current = Math.max(0, offsetRef.current - 1);
  }, [deleteConversation]);

  const handleNew = useCallback(() => {
    createNewConversation();
  }, [createNewConversation]);

  // Client-side search filter
  const filtered = search.trim()
    ? items.filter(c => (c.title || '').toLowerCase().includes(search.toLowerCase()))
    : items;

  const groups = groupConversations(filtered);

  if (!isOpen) return null;

  return (
    <div
      className="flex flex-col h-full border-r"
      style={{
        width:           '240px',
        minWidth:        '240px',
        backgroundColor: 'var(--color-surface)',
        borderColor:     'var(--color-border)',
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Designs
        </span>
        <button
          onClick={handleNew}
          className="text-xs px-2 py-1 border transition-colors"
          style={{
            fontFamily:      'var(--font-mono)',
            color:           'var(--color-running)',
            borderColor:     'var(--color-running)',
            backgroundColor: 'transparent',
            borderRadius:    '2px',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          title="New design"
        >
          + New
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search designs…"
          className="w-full text-xs px-2 py-1.5 bg-transparent border"
          style={{
            fontFamily:   'var(--font-mono)',
            color:        'var(--color-text-secondary)',
            borderColor:  'var(--color-border)',
            borderRadius: '2px',
            outline:      'none',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--color-border-focus)'}
          onBlur={e  => e.currentTarget.style.borderColor = 'var(--color-border)'}
        />
      </div>

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              loading…
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-8 px-4 text-center">
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {search ? 'no designs match' : 'no designs yet'}
            </span>
          </div>
        ) : (
          GROUP_ORDER.filter(g => groups[g]?.length).map(group => (
            <div key={group}>
              {/* Group label */}
              <div
                className="px-3 pt-3 pb-1"
                style={{
                  fontSize:    '10px',
                  fontFamily:  'var(--font-mono)',
                  color:       'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {group}
              </div>

              {groups[group].map(conv => (
                <DesignItem
                  key={conv.conversation_id}
                  conv={conv}
                  isActive={conv.conversation_id === conversationId}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))
        )}

        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex items-center justify-center py-3">
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              loading more…
            </span>
          </div>
        )}

        {/* End of list */}
        {!loading && !loadingMore && items.length > 0 && items.length >= total && !search && (
          <div className="flex items-center justify-center py-3">
            <span
              className="text-xs"
              style={{ color: 'var(--color-border)', fontFamily: 'var(--font-mono)' }}
            >
              — {total} design{total !== 1 ? 's' : ''} total —
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
