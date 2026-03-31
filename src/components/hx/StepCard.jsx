/**
 * StepCard — one of the 16 steps in the HX design pipeline.
 *
 * States:
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
 *   name       {string}
 *   state      {string}
 *   elapsed    {number}  seconds
 *   data       {object}  state-specific payload
 *   iteration  {object}  Step 12 only — { current, total, deltaU, converged }
 */

import { useState, useEffect } from 'react';

// ── State config ─────────────────────────────────────────────────────────────

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
    indicator: '△',
    indicatorColor: 'var(--color-escalated)',
    headerColor:    'var(--color-escalated)',
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

// ── Field metadata ────────────────────────────────────────────────────────────
// Maps raw field names → { label?, unit } for display in the KV table.

const FIELD_META = {
  // Step outputs
  Q_W:               { unit: 'W' },
  T_hot_in_C:        { unit: '°C' },
  T_hot_out_C:       { unit: '°C' },
  T_cold_in_C:       { unit: '°C' },
  T_cold_out_C:      { unit: '°C' },
  m_dot_hot_kg_s:    { unit: 'kg/s' },
  m_dot_cold_kg_s:   { unit: 'kg/s' },
  T_mean_hot_C:      { unit: '°C' },
  T_mean_cold_C:     { unit: '°C' },
  LMTD_K:           { unit: 'K' },
  F_factor:          { unit: '' },
  U_W_m2K:          { unit: 'W/m²K' },
  A_m2:             { unit: 'm²' },
  P_hot_Pa:         { unit: 'Pa' },
  P_cold_Pa:        { unit: 'Pa' },
  R_f_hot_m2KW:     { unit: 'm²K/W' },
  R_f_cold_m2KW:    { unit: 'm²K/W' },
  tema_type:        { unit: '' },
  tema_class:       { unit: '' },
  tema_preference:  { unit: '' },
  shell_side_fluid: { unit: '' },
  // Fluid props (nested)
  density_kg_m3:        { label: 'density',     unit: 'kg/m³' },
  viscosity_Pa_s:       { label: 'viscosity',   unit: 'Pa·s' },
  cp_J_kgK:            { label: 'cp',           unit: 'J/kg·K' },
  k_W_mK:              { label: 'k',            unit: 'W/m·K' },
  Pr:                  { label: 'Pr',           unit: '' },
  property_source:     { label: 'source',       unit: '' },
  property_confidence: { label: 'confidence',   unit: '' },
  // Geometry (nested)
  baffle_spacing_m:    { label: 'baffle_spacing',  unit: 'm' },
  pitch_ratio:         { label: 'pitch_ratio',     unit: '' },
  shell_diameter_m:    { label: 'shell_diameter',  unit: 'm' },
  tube_od_m:           { label: 'tube_OD',         unit: 'm' },
  tube_id_m:           { label: 'tube_ID',         unit: 'm' },
  tube_length_m:       { label: 'tube_length',     unit: 'm' },
  baffle_cut:          { label: 'baffle_cut',      unit: '' },
  n_tubes:             { label: 'n_tubes',         unit: '' },
  n_passes:            { label: 'n_passes',        unit: '' },
  pitch_layout:        { label: 'pitch_layout',    unit: '' },
  shell_passes:        { label: 'shell_passes',    unit: '' },
};

function formatNum(v) {
  if (Number.isInteger(v)) return v.toLocaleString('en-US');
  if (Math.abs(v) < 1e-5 && v !== 0) return v.toExponential(3);
  return parseFloat(v.toPrecision(6)).toString();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AnimatedBar({ color }) {
  return (
    <div
      className="h-0.5 w-full rounded-full overflow-hidden mt-2"
      style={{ backgroundColor: 'var(--color-border)' }}
    >
      <div
        className="h-full"
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
      <div className="mt-2 text-xs" style={{ color: 'var(--color-approved)', fontFamily: 'var(--font-mono)' }}>
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
        <span>Convergence iteration {current} / {total}</span>
        {deltaU != null && <span>ΔU = {deltaU.toFixed(1)}%  (target: &lt; 1%)</span>}
      </div>
      <div className="h-1 w-full rounded-sm overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${pct * 100}%`, backgroundColor: 'var(--color-running)' }}
        />
      </div>
    </div>
  );
}

// ── KV table (replaces raw OutputsTable) ─────────────────────────────────────

function KVRow({ fieldKey, value }) {
  const meta   = FIELD_META[fieldKey] || {};
  const label  = meta.label ?? fieldKey;
  const unit   = meta.unit ?? '';
  const isNum  = typeof value === 'number';

  return (
    <tr>
      <td
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      '11px',
          color:         'var(--color-text-muted)',
          paddingRight:  '16px',
          paddingTop:    '2px',
          paddingBottom: '2px',
          whiteSpace:    'nowrap',
          width:         '200px',
          verticalAlign: 'top',
        }}
      >
        {label}
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', paddingTop: '2px', paddingBottom: '2px' }}>
        {isNum ? (
          <span style={{ color: 'var(--color-corrected)' }}>
            {formatNum(value)}
            {unit && <span style={{ color: 'var(--color-text-muted)' }}> {unit}</span>}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {String(value)}
            {unit && <span style={{ color: 'var(--color-text-muted)' }}> {unit}</span>}
          </span>
        )}
      </td>
    </tr>
  );
}

function FluidSection({ label, props }) {
  if (!props || typeof props !== 'object') return null;
  const entries = Object.entries(props).filter(([, v]) => v != null);
  if (entries.length === 0) return null;

  return (
    <>
      <tr>
        <td
          colSpan={2}
          style={{
            fontFamily:     'var(--font-mono)',
            fontSize:       '10px',
            color:          'var(--color-running)',
            textTransform:  'uppercase',
            letterSpacing:  '0.07em',
            paddingTop:     '8px',
            paddingBottom:  '3px',
            borderTop:      '1px solid rgba(59,130,246,0.12)',
          }}
        >
          {label}
        </td>
      </tr>
      {entries.map(([k, v]) => <KVRow key={k} fieldKey={k} value={v} />)}
    </>
  );
}

function KVTable({ outputs }) {
  if (!outputs || typeof outputs !== 'object') return null;

  const hotName  = outputs.hot_fluid_name;
  const coldName = outputs.cold_fluid_name;
  const rows     = [];

  for (const [key, value] of Object.entries(outputs)) {
    if (value == null) continue;
    // Skip fluid name fields — they appear in section headers
    if (key === 'hot_fluid_name' || key === 'cold_fluid_name') continue;

    if (key === 'hot_fluid_props' && typeof value === 'object') {
      const sectionLabel = hotName
        ? `HOT FLUID — ${hotName.replace(/_/g, ' ').toUpperCase()}`
        : 'HOT FLUID';
      rows.push(<FluidSection key={key} label={sectionLabel} props={value} />);
    } else if (key === 'cold_fluid_props' && typeof value === 'object') {
      const sectionLabel = coldName
        ? `COLD FLUID — ${coldName.replace(/_/g, ' ').toUpperCase()}`
        : 'COLD FLUID';
      rows.push(<FluidSection key={key} label={sectionLabel} props={value} />);
    } else if (key === 'geometry' && typeof value === 'object') {
      rows.push(<FluidSection key={key} label="GEOMETRY" props={value} />);
    } else if (typeof value !== 'object') {
      rows.push(<KVRow key={key} fieldKey={key} value={value} />);
    }
    // Skip unknown nested objects
  }

  if (rows.length === 0) return null;

  return (
    <div className="mt-2">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

// ── Escalated body ────────────────────────────────────────────────────────────

function EscalatedBody({ question, onRespond }) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (answer.trim() && onRespond) onRespond(answer.trim());
  };

  // Split text into paragraphs; highlight the last sentence that ends with '?'
  const raw = question || '';
  const paragraphs = raw.split(/\n\n|\n/).filter(Boolean);
  const lastPara   = paragraphs[paragraphs.length - 1] ?? '';
  const isQuestion = lastPara.trim().endsWith('?');
  const bodyParas  = isQuestion ? paragraphs.slice(0, -1) : paragraphs;
  const questionPara = isQuestion ? lastPara : null;

  return (
    <div
      style={{
        margin:       '4px 0 8px',
        border:       '1px solid var(--color-escalated)',
        borderRadius: '3px',
        background:   'var(--color-surface)',
        boxShadow:    '0 0 0 1px rgba(249,115,22,0.08), 0 4px 20px rgba(249,115,22,0.1)',
        overflow:     'hidden',
      }}
      role="status"
      aria-live="polite"
    >
      {/* Header */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--color-escalated)', fontSize: '14px' }}>△</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-escalated)' }}>
          Engineering Decision Required
        </span>
      </div>
      <div style={{ height: '1px', background: 'rgba(249,115,22,0.2)', margin: '0 14px' }} />

      {/* Body */}
      <div style={{ padding: '12px 14px 14px' }}>
        {bodyParas.map((p, i) => (
          <p
            key={i}
            style={{
              fontSize:     '13px',
              color:        'var(--color-text-primary)',
              lineHeight:   1.65,
              marginBottom: i < bodyParas.length - 1 ? '10px' : 0,
            }}
          >
            {p}
          </p>
        ))}

        {questionPara && (
          <p
            style={{
              fontSize:   '13px',
              fontWeight: 600,
              color:      'var(--color-escalated)',
              lineHeight: 1.55,
              marginTop:  bodyParas.length > 0 ? '12px' : 0,
              marginBottom: '12px',
            }}
          >
            {questionPara}
          </p>
        )}

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--color-border)', marginBottom: '12px' }} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="e.g. proceed with AES floating head type"
            aria-label={`Respond to escalation: ${question}`}
            style={{
              flex:         1,
              background:   'var(--color-bg)',
              border:       '1px solid var(--color-escalated)',
              color:        'var(--color-text-primary)',
              fontFamily:   'var(--font-mono)',
              fontSize:     '12px',
              padding:      '9px 12px',
              borderRadius: '2px',
              outline:      'none',
            }}
            onFocus={e  => e.currentTarget.style.boxShadow = '0 0 0 2px rgba(249,115,22,0.2)'}
            onBlur={e   => e.currentTarget.style.boxShadow = 'none'}
          />
          <button
            type="submit"
            style={{
              background:   'transparent',
              border:       '1px solid var(--color-escalated)',
              color:        'var(--color-escalated)',
              fontFamily:   'var(--font-mono)',
              fontSize:     '12px',
              padding:      '9px 18px',
              borderRadius: '2px',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
              transition:   'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Submit Answer
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Card body by state ────────────────────────────────────────────────────────

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
        <KVTable outputs={data?.outputs} />
        <Reasoning text={data?.reasoning} forceOpen={false} />
      </>
    );
  }

  if (state === 'CORRECTED') {
    const { from, to, why, reasoning } = data || {};
    return (
      <div className="mt-2 space-y-1.5">
        {from && to && (
          <div className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Changed </span>
            <span style={{ color: 'var(--color-error)' }}>{from}</span>
            <span style={{ color: 'var(--color-text-muted)' }}> → </span>
            <span style={{ color: 'var(--color-approved)' }}>{to}</span>
          </div>
        )}
        {why && (
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{why}</p>
        )}
        <KVTable outputs={data?.outputs} />
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
        <KVTable outputs={data?.outputs} />
        <Reasoning text={reasoning} forceOpen={true} />
      </div>
    );
  }

  if (state === 'ESCALATED') {
    const { question, onRespond } = data || {};
    return <EscalatedBody question={question} onRespond={onRespond} />;
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

// ── Main component ────────────────────────────────────────────────────────────

export default function StepCard({ step, name, state = 'PENDING', elapsed, data, iteration }) {
  const cfg        = STATE_CONFIG[state] ?? STATE_CONFIG.PENDING;
  const isPending  = state === 'PENDING';
  const isRunning  = state === 'RUNNING';
  const isEscalated = state === 'ESCALATED';
  const canToggle  = !isPending && !isRunning;

  const [expanded, setExpanded] = useState(isRunning || isEscalated || state === 'ERROR');

  useEffect(() => {
    if (isEscalated || state === 'ERROR') {
      setExpanded(true);
    } else if (!isPending && !isRunning) {
      setExpanded(false);
    }
  }, [state, isPending, isRunning, isEscalated]);

  return (
    <div
      className="border-l-2 animate-step-in"
      style={{
        borderLeftColor:  cfg.borderColor,
        backgroundColor:  isPending ? 'transparent' : 'var(--color-surface)',
        borderBottom:     '1px solid var(--color-border)',
        opacity:          isPending ? 0.38 : 1,
      }}
      role="status"
      aria-live="polite"
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
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

        {/* Step number */}
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', minWidth: '3rem' }}
        >
          Step {step}
        </span>

        {/* Step name */}
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

        {/* Right side: AWAITING INPUT badge, elapsed, or live */}
        {isEscalated && (
          <span
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--color-escalated)', fontFamily: 'var(--font-mono)' }}
          >
            △ AWAITING INPUT
          </span>
        )}
        {!isPending && !isRunning && !isEscalated && (
          <Elapsed seconds={elapsed} />
        )}
        {isRunning && (
          <span
            className="text-xs ml-auto"
            style={{ color: 'var(--color-running)', fontFamily: 'var(--font-mono)' }}
          >
            live
          </span>
        )}

        {/* Expand chevron */}
        {canToggle && (
          <span
            className="text-xs flex-shrink-0"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            aria-hidden="true"
          >
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </div>

      {/* Body */}
      {(expanded || isRunning) && (
        <div className={isEscalated ? 'px-4 pb-0' : 'ml-10 pr-4 pb-2'}>
          <CardBody state={state} data={data} iteration={iteration} />
        </div>
      )}
    </div>
  );
}
