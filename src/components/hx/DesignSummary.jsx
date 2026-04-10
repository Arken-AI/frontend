/**
 * DesignSummary — DESIGN COMPLETE card shown after all 16 steps finish.
 *
 * Props:
 *   design {object}
 *     confidence           {number}  0–1
 *     confidenceBreakdown  {object}
 *     U_overall / U_W_m2K  {number}  W/m²K
 *     area_required / A_m2 {number}  m²
 *     overdesign_pct       {number}  %
 *     dP_shell / dP_tube   {number}  bar
 *     dP_shell_limit / dP_tube_limit {number}
 *     tema_type            {string}
 *     cost_usd             {number}
 *     vibration_safe       {boolean}
 *   onOptimize {fn}
 */

import { useState } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function DataRow({ label, value, unit, limit, warn }) {
  const withinLimit = limit != null ? value < limit : null;
  return (
    <div
      className="flex items-baseline justify-between py-1"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <span
        style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-primary)' }}>
          {value != null ? value : '—'}{unit ? ` ${unit}` : ''}
        </span>
        {withinLimit != null && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '10px',
              color:      withinLimit ? 'var(--color-approved)' : 'var(--color-error)',
            }}
          >
            [{withinLimit ? '✓' : '✗'} &lt; {limit} {unit}]
          </span>
        )}
        {warn && (
          <span style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
            {warn}
          </span>
        )}
      </div>
    </div>
  );
}

function ConfidenceBreakdown({ breakdown }) {
  if (!breakdown) return null;
  return (
    <div className="mt-2 space-y-1 pl-2" style={{ borderLeft: '1px solid var(--color-border)' }}>
      {Object.entries(breakdown).map(([k, v]) => (
        <div key={k} className="flex justify-between">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)' }}>
            {k}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
            {Math.round(v * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DesignSummary({ design, onOptimize }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!design) return null;

  const {
    confidence,
    confidenceBreakdown,
    U_overall,    U_W_m2K,
    area_required, A_m2,
    overdesign_pct,
    dP_shell, dP_shell_limit,
    dP_tube,  dP_tube_limit,
    tema_type,
    cost_usd,
    vibration_safe,
  } = design;

  const pct   = Math.round((confidence ?? 0) * 100);
  const color = pct >= 75
    ? 'var(--color-approved)'
    : pct >= 55
    ? 'var(--color-warning)'
    : 'var(--color-error)';

  const uVal = U_overall ?? U_W_m2K;
  const aVal = area_required ?? A_m2;

  return (
    <>
      {/* Shimmer keyframe — scoped to this component */}
      <style>{`
        @keyframes dc-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div
        className="animate-step-in"
        style={{
          margin:       '10px 16px',
          border:       '1px solid var(--color-approved)',
          borderRadius: '3px',
          background:   'rgba(34,197,94,0.04)',
          overflow:     'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3.5 py-2.5"
          style={{ borderBottom: '1px solid rgba(34,197,94,0.15)' }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-approved)' }}>
            ✓
          </span>
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '13px',
              fontWeight:    700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color:         'var(--color-approved)',
            }}
          >
            Design Complete
          </span>
        </div>

        <div style={{ padding: '10px 14px 12px' }}>
          {/* Confidence row */}
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Confidence
            </span>
            <button
              onClick={() => setShowBreakdown(o => !o)}
              style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '11px',
                color:       'var(--color-text-muted)',
                background:  'none',
                border:      'none',
                cursor:      'pointer',
                padding:     0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-running)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              {showBreakdown ? '▾ hide breakdown' : '→ view breakdown'}
            </button>
          </div>

          {/* Bar */}
          <div
            style={{
              height:       '6px',
              background:   'var(--color-border)',
              borderRadius: '3px',
              overflow:     'hidden',
              position:     'relative',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                height:     '100%',
                width:      `${pct}%`,
                background: `linear-gradient(90deg, ${color} 0%, ${color} 100%)`,
                borderRadius: '3px',
                position:   'relative',
                overflow:   'hidden',
                transition: 'width 0.7s ease-out',
              }}
            >
              <div
                style={{
                  position:   'absolute',
                  inset:      0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                  animation:  'dc-shimmer 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color, textAlign: 'right', marginBottom: '8px' }}>
            {pct}%
          </div>

          {showBreakdown && <ConfidenceBreakdown breakdown={confidenceBreakdown} />}

          {/* Engineering data rows */}
          {(uVal != null || aVal != null || dP_shell != null || dP_tube != null || tema_type || cost_usd != null || vibration_safe != null) && (
            <div style={{ marginTop: showBreakdown ? '8px' : 0 }}>
              {uVal         != null && <DataRow label="U overall"      value={uVal.toFixed(0)} unit="W/m²K" />}
              {aVal         != null && (
                <DataRow
                  label="Area required"
                  value={aVal.toFixed(1)}
                  unit="m²"
                  warn={overdesign_pct != null ? `(+${overdesign_pct.toFixed(1)}% overdesign)` : null}
                />
              )}
              {dP_shell != null && (
                <DataRow label="ΔP shell" value={dP_shell.toFixed(2)} unit="bar" limit={dP_shell_limit} />
              )}
              {dP_tube != null && (
                <DataRow label="ΔP tube"  value={dP_tube.toFixed(2)}  unit="bar" limit={dP_tube_limit} />
              )}
              {tema_type  && <DataRow label="TEMA type"     value={tema_type} />}
              {cost_usd   != null && <DataRow label="Cost estimate" value={`$${cost_usd.toLocaleString()}`} />}
              {vibration_safe != null && (
                <DataRow
                  label="Vibration"
                  value={vibration_safe ? '✓ Safe' : '✗ Risk'}
                  warn={!vibration_safe ? '⚠ review required' : null}
                />
              )}
            </div>
          )}

          {/* Footer actions */}
          <div
            className="flex items-center gap-4 pt-2 mt-2"
            style={{ borderTop: '1px solid rgba(34,197,94,0.15)' }}
          >
            <button
              disabled
              title="Coming soon"
              style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '11px',
                color:       'var(--color-text-muted)',
                background:  'none',
                border:      'none',
                cursor:      'not-allowed',
                opacity:     0.5,
                padding:     0,
                display:     'flex',
                alignItems:  'center',
                gap:         '4px',
              }}
            >
              ↓ Export PDF
            </button>

            {onOptimize && (
              <button
                onClick={onOptimize}
                style={{
                  fontFamily:  'var(--font-mono)',
                  fontSize:    '11px',
                  color:       'var(--color-running)',
                  background:  'none',
                  border:      'none',
                  cursor:      'pointer',
                  padding:     0,
                  display:     'flex',
                  alignItems:  'center',
                  gap:         '4px',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-running)'}
              >
                Optimize for cost →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
