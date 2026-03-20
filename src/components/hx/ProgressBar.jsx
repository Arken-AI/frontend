/**
 * ProgressBar — slim bar visible while a design is running (§13.2).
 * Disappears when all 16 steps complete.
 *
 * Props:
 *   currentStep  {number}  1–16
 *   totalSteps   {number}  default 16
 *   stepName     {string}  current step description
 *   estSeconds   {number}  remaining seconds estimate (optional)
 */

export default function ProgressBar({ currentStep, totalSteps = 16, stepName, estSeconds }) {
  const pct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div
      className="px-4 py-2.5 border-b"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Label row */}
      <div
        className="flex justify-between text-xs mb-1.5"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}
      >
        <span>
          Step {currentStep} / {totalSteps}
          {stepName ? ` — ${stepName}` : ''}
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          {pct}%{estSeconds != null ? `  est. ~${Math.round(estSeconds)}s` : ''}
        </span>
      </div>

      {/* Bar track */}
      <div
        className="h-1 w-full rounded-sm overflow-hidden"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        {/* Filled portion */}
        <div
          className="h-full transition-all duration-500 ease-out progress-bar-active"
          style={{
            width:           `${pct}%`,
            backgroundColor: 'var(--color-running)',
          }}
        />
      </div>
    </div>
  );
}
