/**
 * StepCard — one of the 16 steps in the HX design pipeline.
 *
 * States (§13.5):
 *   PENDING    — not started yet
 *   RUNNING    — executing (spinner + animated bar)
 *   APPROVED   — AI reviewed, no corrections needed
 *   CORRECTED  — AI changed a parameter (shows diff)
 *   WARNING    — boundary condition, still proceeding
 *   ESCALATED  — AI cannot resolve, asks user inline
 *   ERROR      — step failed
 *
 * Props:
 *   step       {number}  1–16
 *   name       {string}  e.g. "Fluid Properties"
 *   state      {string}  one of the states above
 *   elapsed    {number}  seconds (shown when state !== PENDING)
 *   data       {object}  state-specific payload — see below
 *     RUNNING:   { progress: 0–1 }                (optional)
 *     APPROVED:  { reasoning: string }             (collapsed by default)
 *     CORRECTED: { from: string, to: string, why: string, reasoning: string }
 *     WARNING:   { message: string, reasoning: string }
 *     ESCALATED: { question: string, onRespond: fn(answer) }
 *     ERROR:     { message: string, onRetry: fn }
 *   iteration  {object}  for Step 12 only — { current, total, deltaU, converged }
 */

import { useState, useEffect } from 'react';

// ── State config ────────────────────────────────────────────────────────────

const STATE_CONFIG = {
  PENDING: {
    indicator: '○',
    indicatorColor: 'var(--color-text-muted)',
    headerColor:    'var(--color-text-muted)',
    borderColor:    'var(--color-border)',
  },
  RUNNING: {
    indicator: '⟳',
    indicatorColor: 'var(--color-running)',
    headerColor:    'var(--color-text-primary)',
    borderColor:    'var(--color-running)',
    spin:           true,
  },
  APPROVED: {
    indicator: '✓',
    indicatorColor: 'var(--color-approved)',
    headerColor:    'var(--color-text-primary)',
    borderColor:    'var(--color-approved)',
  },
  CORRECTED: {
    indicator: '↻',
    indicatorColor: 'var(--color-corrected)',
    headerColor:    'var(--color-text-primary)',
    borderColor:    'var(--color-corrected)',
  },
  WARNING: {
    indicator: '⚠',
    indicatorColor: 'var(--color-warning)',
    headerColor:    'var(--color-text-primary)',
    borderColor:    'var(--color-warning)',
  },
  ESCALATED: {
    indicator: '?',
    indicatorColor: 'var(--color-escalated)',
    headerColor:    'var(--color-text-primary)',
    borderColor:    'var(--color-escalated)',
  },
  ERROR: {
    indicator: '✗',
    indicatorColor: 'var(--color-error)',
    headerColor:    'var(--color-text-primary)',
    borderColor:    'var(--color-error)',
    strike:         true,
  },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function AnimatedBar({ color }) {
  return (
    <div
      className="h-0.5 w-full rounded-full overflow-hidden mt-2"
      style={{ backgroundColor: 'var(--color-border)' }}
    >
      <div
        className="h-full progress-bar-active"
        style={{
          width:           '40%',
          backgroundColor: color,
          animation:       'shimmer 1.2s ease-in-out infinite',
        }}
      />
    </div>
  );
}

function Elapsed({ seconds }) {
  if (seconds == null) return null;
  return (
    <span
      className="text-xs ml-auto"
      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
    >
      [{seconds.toFixed(1)}s]
    </span>
  );
}

function Reasoning({ text, forceOpen = false }) {
  const [open, setOpen] = useState(forceOpen);
  if (!text) return null;

  const lines = text.split('\n').filter(Boolean);
  const truncated = !open && lines.length > 3;
  const visible = truncated ? lines.slice(0, 3) : lines;

  return (
    <div className="mt-2">
      {!forceOpen && (
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs transition-colors mb-1"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-running)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          {open ? '▾ hide reasoning' : '▸ view reasoning'}
        </button>
      )}
      {(open || forceOpen) && (
        <div
          className="text-xs leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {visible.map((l, i) => <p key={i}>{l}</p>)}
          {truncated && (
            <button
              onClick={() => setOpen(true)}
              className="mt-1 text-xs"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              …show more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IterationProgress({ iteration }) {
  if (!iteration) return null;
  const { current, total, deltaU, converged } = iteration;
  const pct = Math.min(1, current / total);

  if (converged) {
    return (
      <div
        className="mt-2 text-xs"
        style={{ color: 'var(--color-approved)', fontFamily: 'var(--font-mono)' }}
      >
        ✓ Converged in {current} iteration{current !== 1 ? 's' : ''}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div
        className="flex justify-between text-xs mb-1"
        style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
      >
        <span>Convergence iteration  {current} / {total}</span>
        {deltaU != null && <span>ΔU = {deltaU.toFixed(1)}%  (target: &lt; 1%)</span>}
      </div>
      <div
        className="h-1 w-full rounded-sm overflow-hidden"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${pct * 100}%`, backgroundColor: 'var(--color-running)' }}
        />
      </div>
    </div>
  );
}

// ── Outputs table ────────────────────────────────────────────────────────────

function OutputsTable({ outputs }) {
  if (!outputs || typeof outputs !== 'object') return null;
  const entries = Object.entries(outputs).filter(([, v]) => v != null);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2">
      <table className="w-full text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td
                className="pr-3 py-0.5 whitespace-nowrap"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {key}
              </td>
              <td className="py-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {typeof value === 'number' ? value.toPrecision(6) : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Body by state ─────────────────────────────────────────────────────────────

function CardBody({ state, data, iteration }) {
  if (state === 'PENDING') return null;

  if (state === 'RUNNING') {
    return (
      <>
        <AnimatedBar color="var(--color-running)" />
        <IterationProgress iteration={iteration} />
      </>
    );
  }

  if (state === 'APPROVED') {
    return (
      <>
        <OutputsTable outputs={data?.outputs} />
        <Reasoning text={data?.reasoning} forceOpen={false} />
      </>
    );
  }

  if (state === 'CORRECTED') {
    const { from, to, why, reasoning } = data || {};
    return (
      <div className="mt-2 space-y-1.5">
        {from && to && (
          <div
            className="text-xs"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span style={{ color: 'var(--color-text-muted)' }}>Changed </span>
            <span style={{ color: 'var(--color-error)' }}>{from}</span>
            <span style={{ color: 'var(--color-text-muted)' }}> → </span>
            <span style={{ color: 'var(--color-approved)' }}>{to}</span>
          </div>
        )}
        {why && (
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {why}
          </p>
        )}
        <OutputsTable outputs={data?.outputs} />
        <Reasoning text={reasoning} forceOpen={false} />
      </div>
    );
  }

  if (state === 'WARNING') {
    const { message, reasoning } = data || {};
    return (
      <div className="mt-2 space-y-1">
        {message && (
          <p className="text-xs" style={{ color: 'var(--color-warning)' }}>{message}</p>
        )}
        <OutputsTable outputs={data?.outputs} />
        <Reasoning text={reasoning} forceOpen={true} />
      </div>
    );
  }

  if (state === 'ESCALATED') {
    const { question, onRespond } = data || {};
    return (
      <EscalatedBody question={question} onRespond={onRespond} />
    );
  }

  if (state === 'ERROR') {
    const { message, onRetry } = data || {};
    return (
      <div className="mt-2 space-y-2">
        {message && (
          <p className="text-xs" style={{ color: 'var(--color-error)', fontFamily: 'var(--font-mono)' }}>
            {message}
          </p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs px-2 py-1 border transition-colors"
            style={{
              fontFamily:      'var(--font-mono)',
              color:           'var(--color-error)',
              borderColor:     'var(--color-error)',
              backgroundColor: 'transparent',
              borderRadius:    '2px',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ↺ retry
          </button>
        )}
      </div>
    );
  }

  return null;
}

function EscalatedBody({ question, onRespond }) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (answer.trim() && onRespond) {
      onRespond(answer.trim());
    }
  };

  return (
    <div className="mt-2 space-y-2" role="status" aria-live="polite">
      {question && (
        <p className="text-xs" style={{ color: 'var(--color-escalated)' }}>{question}</p>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Your answer…"
          aria-label={`Respond to escalation: ${question}`}
          className="flex-1 text-xs px-2 py-1.5 border bg-transparent"
          style={{
            fontFamily:   'var(--font-mono)',
            color:        'var(--color-text-primary)',
            borderColor:  'var(--color-escalated)',
            borderRadius: '2px',
            outline:      'none',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--color-escalated)'}
        />
        <button
          type="submit"
          className="text-xs px-3 py-1.5 border transition-colors"
          style={{
            fontFamily:      'var(--font-mono)',
            color:           'var(--color-escalated)',
            borderColor:     'var(--color-escalated)',
            backgroundColor: 'transparent',
            borderRadius:    '2px',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          send
        </button>
      </form>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StepCard({ step, name, state = 'PENDING', elapsed, data, iteration }) {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.PENDING;
  const isPending = state === 'PENDING';
  const isRunning = state === 'RUNNING';
  const isEscalated = state === 'ESCALATED';
  // Expand by default for RUNNING, ESCALATED, and ERROR; collapsed for completed
  const [expanded, setExpanded] = useState(isRunning || isEscalated || state === 'ERROR');
  const canToggle = !isPending && !isRunning;

  // Auto-expand when state changes to ESCALATED/ERROR, collapse when it settles to APPROVED/CORRECTED/WARNING
  useEffect(() => {
    if (isEscalated || state === 'ERROR') {
      setExpanded(true);
    } else if (isRunning) {
      // Keep open while running — body handles animation
    } else if (!isPending) {
      setExpanded(false);
    }
  }, [state, isPending, isRunning, isEscalated]);

  return (
    <div
      className="px-3 py-2.5 border-l-2 animate-step-in"
      style={{
        borderLeftColor:  cfg.borderColor,
        backgroundColor:  isPending ? 'transparent' : 'var(--color-surface)',
        borderBottom:     `1px solid var(--color-border)`,
        opacity:          isPending ? 0.45 : 1,
      }}
      role="status"
      aria-live="polite"
    >
      {/* Header row — clickable for completed steps */}
      <div
        className="flex items-center gap-2"
        style={{ cursor: canToggle ? 'pointer' : 'default' }}
        onClick={() => canToggle && setExpanded(e => !e)}
      >
        {/* State indicator */}
        <span
          className={`text-sm w-4 flex-shrink-0 ${cfg.spin ? 'animate-spin-slow inline-block' : ''}`}
          style={{ color: cfg.indicatorColor, fontFamily: 'var(--font-mono)' }}
          aria-hidden="true"
        >
          {cfg.indicator}
        </span>

        {/* Step number + name */}
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', minWidth: '3rem' }}
        >
          Step {step}
        </span>
        <span
          className="text-sm flex-1"
          style={{
            color:          cfg.headerColor,
            fontWeight:     isPending ? 400 : 500,
            textDecoration: state === 'ERROR' ? 'line-through' : 'none',
          }}
        >
          {name}
        </span>

        {/* Elapsed time + expand chevron */}
        {!isPending && state !== 'RUNNING' && <Elapsed seconds={elapsed} />}
        {canToggle && (
          <span
            className="text-xs flex-shrink-0"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            aria-hidden="true"
          >
            {expanded ? '▾' : '▸'}
          </span>
        )}
        {state === 'RUNNING' && (
          <span
            className="text-xs ml-auto"
            style={{ color: 'var(--color-running)', fontFamily: 'var(--font-mono)' }}
          >
            live
          </span>
        )}
      </div>

      {/* Body (state-specific) — shown when expanded or always for RUNNING/ESCALATED */}
      {(expanded || isRunning) && (
        <div className="ml-6">
          <CardBody state={state} data={data} iteration={iteration} />
        </div>
      )}
    </div>
  );
}
