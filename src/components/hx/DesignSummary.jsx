/**
 * DesignSummary — engineering data sheet shown after Step 16 completes (§13.4).
 *
 * Props:
 *   design {object} — populated DesignState from backend:
 *     confidence        {number}  0–1
 *     confidenceBreakdown {object} { thermal, convergence, geometry, validation }
 *     U_overall         {number}  W/m²K
 *     area_required     {number}  m²
 *     overdesign_pct    {number}  %
 *     dP_shell          {number}  bar
 *     dP_shell_limit    {number}  bar
 *     dP_tube           {number}  bar
 *     dP_tube_limit     {number}  bar
 *     tema_type         {string}  e.g. "BEM"
 *     cost_usd          {number}
 *     vibration_safe    {boolean}
 *   onOptimize {fn}   — triggers POST /optimize
 *   onExportPDF {fn}  — disabled (coming soon)
 */

import { useState } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function DataRow({ label, value, unit, limit, limitLabel, warn }) {
  const withinLimit = limit != null ? value < limit : null;
  return (
    <div
      className="flex items-baseline justify-between py-1 border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className="text-sm"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}
        >
          {value != null ? value : '—'}{unit ? ` ${unit}` : ''}
        </span>
        {withinLimit != null && (
          <span
            className="text-xs"
            style={{
              fontFamily: 'var(--font-mono)',
              color:      withinLimit ? 'var(--color-approved)' : 'var(--color-error)',
            }}
          >
            [{withinLimit ? '✓' : '✗'} &lt; {limit} {unit}]
          </span>
        )}
        {warn && (
          <span
            className="text-xs"
            style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}
          >
            {warn}
          </span>
        )}
      </div>
    </div>
  );
}

function ConfidenceBar({ value }) {
  const pct    = Math.round((value ?? 0) * 100);
  const color  = pct >= 75
    ? 'var(--color-approved)'
    : pct >= 55
    ? 'var(--color-warning)'
    : 'var(--color-error)';

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 h-2 rounded-sm overflow-hidden"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="text-sm font-medium w-10 text-right"
        style={{ fontFamily: 'var(--font-mono)', color }}
      >
        {pct}%
      </span>
    </div>
  );
}

function ConfidenceBreakdown({ breakdown }) {
  if (!breakdown) return null;
  return (
    <div
      className="mt-2 space-y-1 pl-2 border-l"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {Object.entries(breakdown).map(([k, v]) => (
        <div key={k} className="flex justify-between text-xs">
          <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {k}
          </span>
          <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {Math.round(v * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function DesignSummary({ design, onOptimize, onExportPDF }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!design) return null;

  const {
    confidence,
    confidenceBreakdown,
    U_overall,
    area_required,
    overdesign_pct,
    dP_shell,
    dP_shell_limit,
    dP_tube,
    dP_tube_limit,
    tema_type,
    cost_usd,
    vibration_safe,
  } = design;

  return (
    <div
      className="border animate-step-in"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor:     'var(--color-approved)',
        borderRadius:    '2px',
        margin:          '12px',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: 'var(--color-approved)', fontFamily: 'var(--font-mono)' }}
        >
          ✓ Design Complete
        </span>
      </div>

      <div className="px-3 py-2">
        {/* Confidence */}
        <div
          className="pb-2 mb-2 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Confidence
            </span>
            <button
              onClick={() => setShowBreakdown(o => !o)}
              className="text-xs transition-colors"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-running)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              {showBreakdown ? '▾ hide breakdown' : '→ view breakdown'}
            </button>
          </div>
          <ConfidenceBar value={confidence} />
          {showBreakdown && <ConfidenceBreakdown breakdown={confidenceBreakdown} />}
        </div>

        {/* Engineering values */}
        <div className="space-y-0">
          {U_overall     != null && <DataRow label="U overall"     value={U_overall.toFixed(0)} unit="W/m²K" />}
          {area_required != null && (
            <DataRow
              label="Area required"
              value={area_required.toFixed(1)}
              unit="m²"
              warn={overdesign_pct != null ? `(+${overdesign_pct.toFixed(1)}% overdesign)` : null}
            />
          )}
          {dP_shell != null && (
            <DataRow label="ΔP shell" value={dP_shell.toFixed(2)} unit="bar" limit={dP_shell_limit} />
          )}
          {dP_tube != null && (
            <DataRow label="ΔP tube"  value={dP_tube.toFixed(2)} unit="bar" limit={dP_tube_limit} />
          )}
          {tema_type && <DataRow label="TEMA type"   value={tema_type} />}
          {cost_usd  != null && (
            <DataRow label="Cost estimate" value={`$${cost_usd.toLocaleString()}`} />
          )}
          {vibration_safe != null && (
            <DataRow
              label="Vibration"
              value={vibration_safe ? '✓ Safe' : '✗ Risk'}
              warn={!vibration_safe ? '⚠ review required' : null}
            />
          )}
        </div>
      </div>

      {/* Action row */}
      <div
        className="px-3 py-2 flex items-center justify-between border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Export PDF — deferred */}
        <button
          disabled
          title="Coming soon"
          className="text-xs px-2.5 py-1 border opacity-30 cursor-not-allowed"
          style={{
            fontFamily:      'var(--font-mono)',
            color:           'var(--color-text-muted)',
            borderColor:     'var(--color-border)',
            backgroundColor: 'transparent',
            borderRadius:    '2px',
          }}
        >
          ↓ Export PDF
        </button>

        {/* Optimize */}
        {onOptimize && (
          <button
            onClick={onOptimize}
            className="text-xs px-2.5 py-1 border transition-colors"
            style={{
              fontFamily:      'var(--font-mono)',
              color:           'var(--color-running)',
              borderColor:     'var(--color-running)',
              backgroundColor: 'transparent',
              borderRadius:    '2px',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Optimize for cost →
          </button>
        )}
      </div>
    </div>
  );
}
