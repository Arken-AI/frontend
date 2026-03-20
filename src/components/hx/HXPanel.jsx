/**
 * HXPanel — the 72% right panel showing the 16-step pipeline progress.
 *
 * For now renders with placeholder/demo state so you can see the design.
 * Connect to real SSE events once the HX Engine is ready.
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
 *   steps       {Array}  array of step state objects — see StepCard for shape
 *   isRunning   {boolean}
 *   currentStep {number} 1–16 (when running)
 *   design      {object} populated DesignState when complete
 *   onOptimize  {fn}
 */
export default function HXPanel({ steps = [], isRunning, currentStep, design, onOptimize }) {
  // Build the full 16-step list, filling in defaults for unstarted steps
  const allSteps = STEP_NAMES.map((name, i) => {
    const stepNum  = i + 1;
    const provided = steps.find(s => s.step === stepNum);
    return provided ?? { step: stepNum, name, state: 'PENDING' };
  });

  const showProgress  = isRunning && currentStep != null;
  const showSummary   = !!design;
  const showEmptyHint = !isRunning && !design && steps.length === 0;

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Progress bar (running only) */}
      {showProgress && (
        <ProgressBar
          currentStep={currentStep}
          totalSteps={16}
          stepName={STEP_NAMES[currentStep - 1]}
        />
      )}

      {/* Scrollable step list */}
      <div className="flex-1 overflow-y-auto">
        {showEmptyHint && (
          <div className="flex items-center justify-center h-full">
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              HX Progress — 16 steps will stream here
            </p>
          </div>
        )}

        {/* Design summary (complete) */}
        {showSummary && (
          <DesignSummary design={design} onOptimize={onOptimize} />
        )}

        {/* Step cards */}
        {(isRunning || showSummary || steps.length > 0) &&
          allSteps.map(s => (
            <StepCard
              key={s.step}
              step={s.step}
              name={s.name ?? STEP_NAMES[s.step - 1]}
              state={s.state}
              elapsed={s.elapsed}
              data={s.data}
              iteration={s.iteration}
            />
          ))
        }
      </div>
    </div>
  );
}
