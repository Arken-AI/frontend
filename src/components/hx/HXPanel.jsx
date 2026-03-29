/**
 * HXPanel — the 72% right panel showing the 16-step pipeline progress.
 *
 * Real mode: pass steps/isRunning/currentStep/design/sessionId from useHXStream hook.
 * Idle:      shows a prompt to send a heat exchanger design request via chat.
 */

import StepCard from './StepCard';
import ProgressBar from './ProgressBar';
import DesignSummary from './DesignSummary';

// The 16 step names (§6 of master plan)
export const STEP_NAMES = [
  'Parse & Validate Requirements',
  'Calculate Heat Duty',
  'Fluid Properties',
  'LMTD & Correction Factor',
  'Preliminary Sizing',
  'Tube Layout',
  'Baffle Design',
  'Shell-Side Heat Transfer',
  'Tube-Side Heat Transfer',
  'Overall Heat Transfer',
  'Pressure Drop Validation',
  'Geometry Iteration',
  'Vibration Safety Check',
  'Mechanical Design',
  'Cost Estimate',
  'Final Design Validation',
];

/**
 * Props:
 *   steps       {Array}   from useHXStream
 *   isRunning   {boolean}
 *   currentStep {number|null}
 *   design      {object|null}
 *   sessionId   {string|null}
 *   onOptimize  {fn}
 *   onRespond   {fn(sessionId, answer)} — for ESCALATED step inline response
 */
export default function HXPanel({
  steps: extSteps,
  isRunning,
  currentStep,
  design,
  sessionId,
  onOptimize,
  onRespond,
}) {
  const hasData = (extSteps && extSteps.length > 0) || isRunning || !!design;

  // Build full 16-step list: fill PENDING for steps not yet in extSteps
  const allSteps = STEP_NAMES.map((name, i) => {
    const stepNum = i + 1;
    const provided = extSteps?.find(s => s.step === stepNum);
    return provided ?? { step: stepNum, name, state: 'PENDING' };
  });

  const showProgress = isRunning && currentStep != null;
  const showSummary  = !!design;
  const showIdle     = !hasData;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Progress bar (running) */}
      {showProgress && (
        <ProgressBar
          currentStep={currentStep}
          totalSteps={16}
          stepName={STEP_NAMES[currentStep - 1]}
        />
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Idle state */}
        {showIdle && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <h2
              className="text-xs font-normal tracking-widest uppercase"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              Bell-Delaware · 16-Step Pipeline
            </h2>
            <p
              className="text-xs text-center max-w-xs"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              Send a heat exchanger design request in the chat to start the pipeline
            </p>
          </div>
        )}

        {/* Running or completed — show step cards */}
        {hasData && (
          <>
            {showSummary && (
              <DesignSummary design={design} onOptimize={onOptimize} />
            )}

            {allSteps.map(s => (
              <StepCard
                key={s.step}
                step={s.step}
                name={s.name ?? STEP_NAMES[s.step - 1]}
                state={s.state}
                elapsed={s.elapsed}
                data={
                  s.state === 'ESCALATED' && onRespond
                    ? {
                        ...s.data,
                        onRespond: (answer) => onRespond(sessionId, answer),
                      }
                    : s.data
                }
                iteration={s.iteration}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
