/**
 * HXPanel — the 72% right panel showing the 16-step pipeline progress.
 *
 * Real mode:  pass steps/isRunning/currentStep/design from useHXStream hook.
 * Demo mode:  when no real data, shows animated walkthrough via "▶ Run Demo".
 */

import { useState, useEffect, useRef } from 'react';
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

// ── Demo sequence ─────────────────────────────────────────────────────────────
// Each entry drives one step: how long it shows as RUNNING, then its final state + data.

const DEMO_SEQUENCE = [
  {
    step: 1, delayMs: 900, state: 'APPROVED', elapsed: 0.9,
    data: { reasoning: 'Hot-side: steam 180 °C / 12 bar. Cold-side: cooling water 25 → 45 °C. Target duty Q = 2.4 MW confirmed. All required inputs present.' },
  },
  {
    step: 2, delayMs: 700, state: 'APPROVED', elapsed: 0.7,
    data: { reasoning: 'Q = ṁ·Cp·ΔT = 12.3 kg/s × 4.18 kJ/kg·K × 20 K = 2.41 MW. ✓ Matches design target.' },
  },
  {
    step: 3, delayMs: 1100, state: 'CORRECTED', elapsed: 1.1,
    data: {
      from: 'μ_shell = 0.35 mPa·s (inlet)',
      to:   'μ_shell = 0.28 mPa·s (mean bulk 85 °C)',
      why:  'Viscosity must be evaluated at mean bulk temperature, not inlet. Affects shell-side Re and Nu.',
      reasoning: 'HEDH Table B.5: water viscosity at 85 °C = 0.336 mPa·s. Applying wall correction factor 0.84 → 0.28 mPa·s effective.',
    },
  },
  {
    step: 4, delayMs: 800, state: 'APPROVED', elapsed: 0.8,
    data: { reasoning: 'LMTD = 87.3 K (counterflow). Ft correction factor = 0.94 for 1-2 shell/tube passes. Effective LMTD = 82.1 K.' },
  },
  {
    step: 5, delayMs: 1300, state: 'APPROVED', elapsed: 1.3,
    data: { reasoning: 'Assumed U = 1200 W/m²K → A_prelim = 24.4 m². Shell ID = 610 mm (24"). Tube count ≈ 280 × 19.05 mm OD tubes.' },
  },
  {
    step: 6, delayMs: 900, state: 'APPROVED', elapsed: 0.9,
    data: { reasoning: 'Triangular pitch PT = 1.25 × 19.05 = 23.8 mm. 284 tubes fit in 610 mm shell. Bundle diameter = 588 mm.' },
  },
  {
    step: 7, delayMs: 1400, state: 'WARNING', elapsed: 1.4,
    data: {
      message: 'Baffle cut 25% — shell-side ΔP near limit. Consider 30% cut to reduce pressure drop by ~15%.',
      reasoning: 'B = 150 mm (0.246 × D_s). Optimal range 0.2–0.35. Shell-side ΔP calculated at 65 kPa; limit 70 kPa. Proceeding with current geometry.',
    },
  },
  {
    step: 8, delayMs: 1800, state: 'APPROVED', elapsed: 1.8,
    data: { reasoning: 'Bell-Delaware: j_s = 0.195. h_s = 3,420 W/m²K. Bypass correction F_b = 0.92, leakage F_l = 0.88. h_s_eff = 2,768 W/m²K.' },
  },
  {
    step: 9, delayMs: 1500, state: 'APPROVED', elapsed: 1.5,
    data: { reasoning: 'Dittus-Boelter: Re = 18,400 (turbulent). Nu = 142. h_t = 4,850 W/m²K. Wall resistance negligible (carbon steel, t = 2 mm).' },
  },
  {
    step: 10, delayMs: 1000, state: 'CORRECTED', elapsed: 2.8,
    data: {
      from: 'D_s = 603 mm (calculated)',
      to:   'D_s = 610 mm (TEMA standard)',
      why:  'Nearest standard shell size selected. Adds 1.2% area margin with negligible cost impact.',
      reasoning: 'TEMA standard shell diameters: 590, 610, 635 mm. 610 mm is the closest standard to the calculated 603 mm.',
    },
  },
  {
    step: 11, delayMs: 1200, state: 'WARNING', elapsed: 1.2,
    data: {
      message: 'ΔP_shell = 0.65 bar (limit 0.70 bar). 7% margin — acceptable but monitor in fabrication.',
      reasoning: 'Kern method: ΔP_shell = 0.65 bar. Bell-Delaware correction gives ΔP_tube = 0.28 bar (limit 0.35 bar). Both within limits.',
    },
  },
  {
    step: 12, delayMs: 2200, state: 'APPROVED', elapsed: 2.2,
    data: { reasoning: 'U converged at 1,187 W/m²K after 4 iterations (ΔU < 1%).' },
    iteration: { current: 4, total: 10, deltaU: 0.6, converged: true },
  },
  {
    step: 13, delayMs: 700, state: 'APPROVED', elapsed: 0.7,
    data: { reasoning: 'Strouhal number check: f_v = 18.3 Hz vs f_n = 42.1 Hz. Safety ratio = 2.3 > 2.0. ✓ No vortex-induced vibration risk.' },
  },
  {
    step: 14, delayMs: 900, state: 'APPROVED', elapsed: 0.9,
    data: { reasoning: 'TEMA Class C. Shell: SA-516 Gr.70. Tubes: SA-179. Flanges: 150 lb ANSI. Tube-sheet thickness = 52 mm (ASME Section VIII).' },
  },
  {
    step: 15, delayMs: 600, state: 'APPROVED', elapsed: 0.6,
    data: { reasoning: 'Carbon steel shell + U-bundle. Material cost: $18,400. Fabrication: $6,200. Total FOB: $24,600.' },
  },
  {
    step: 16, delayMs: 1100, state: 'APPROVED', elapsed: 1.1,
    data: { reasoning: 'All 16 checks passed. Overdesign = 3.8%. Performance margin adequate for 10% fouling allowance (TEMA RF = 0.0002 m²K/W each side).' },
  },
];

const DEMO_DESIGN = {
  confidence:          0.91,
  confidenceBreakdown: { thermal: 0.94, convergence: 0.96, geometry: 0.88, validation: 0.87 },
  U_overall:           1187,
  area_required:       25.3,
  overdesign_pct:      3.8,
  dP_shell:            0.65,
  dP_shell_limit:      0.70,
  dP_tube:             0.28,
  dP_tube_limit:       0.35,
  tema_type:           'BEM',
  cost_usd:            24600,
  vibration_safe:      true,
};

// ── Demo controller hook ──────────────────────────────────────────────────────

function useDemoHX() {
  const [running, setRunning]       = useState(false);
  const [stepIndex, setStepIndex]   = useState(-1);   // which DEMO_SEQUENCE entry is active
  const [completedSteps, setCompleted] = useState([]); // array of finished step objects
  const [design, setDesign]         = useState(null);
  const timerRef                    = useRef(null);

  // Advance to next step
  const advance = (idx) => {
    if (idx >= DEMO_SEQUENCE.length) {
      // All done — show summary
      setStepIndex(-1);
      setRunning(false);
      setDesign(DEMO_DESIGN);
      return;
    }
    setStepIndex(idx);
    const seq = DEMO_SEQUENCE[idx];
    timerRef.current = setTimeout(() => {
      // Complete this step
      setCompleted(prev => [
        ...prev.filter(s => s.step !== seq.step),
        { step: seq.step, name: STEP_NAMES[seq.step - 1], state: seq.state, elapsed: seq.elapsed, data: seq.data, iteration: seq.iteration },
      ]);
      advance(idx + 1);
    }, seq.delayMs);
  };

  const start = () => {
    setCompleted([]);
    setDesign(null);
    setRunning(true);
    setStepIndex(0);
    const seq = DEMO_SEQUENCE[0];
    timerRef.current = setTimeout(() => {
      setCompleted([{ step: seq.step, name: STEP_NAMES[seq.step - 1], state: seq.state, elapsed: seq.elapsed, data: seq.data, iteration: seq.iteration }]);
      advance(1);
    }, seq.delayMs);
  };

  const reset = () => {
    clearTimeout(timerRef.current);
    setRunning(false);
    setStepIndex(-1);
    setCompleted([]);
    setDesign(null);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Build the current running step object (for StepCard RUNNING state)
  const runningStep = stepIndex >= 0 ? DEMO_SEQUENCE[stepIndex] : null;

  // Build full 16-step list
  const steps = STEP_NAMES.map((name, i) => {
    const stepNum   = i + 1;
    const completed = completedSteps.find(s => s.step === stepNum);
    if (completed) return completed;
    if (runningStep && runningStep.step === stepNum) {
      return { step: stepNum, name, state: 'RUNNING' };
    }
    return { step: stepNum, name, state: 'PENDING' };
  });

  const currentStep = runningStep?.step ?? null;

  return { running, steps, currentStep, design, start, reset };
}

// ── HXPanel ───────────────────────────────────────────────────────────────────

/**
 * Props (real mode — connect to useHXStream):
 *   steps       {Array}
 *   isRunning   {boolean}
 *   currentStep {number}
 *   design      {object}
 *   onOptimize  {fn}
 */
export default function HXPanel({ steps: extSteps, isRunning: extRunning, currentStep: extCurrentStep, design: extDesign, onOptimize }) {
  const demo = useDemoHX();

  // Use real props when provided, otherwise fall back to demo
  const isRealMode = extSteps && extSteps.length > 0;
  const steps      = isRealMode ? extSteps : demo.steps;
  const isRunning  = isRealMode ? extRunning  : demo.running;
  const currentStep = isRealMode ? extCurrentStep : demo.currentStep;
  const design     = isRealMode ? extDesign : demo.design;

  // Build the full 16-step list for real mode (fill PENDING for unstarted)
  const allSteps = isRealMode
    ? STEP_NAMES.map((name, i) => {
        const stepNum  = i + 1;
        const provided = extSteps.find(s => s.step === stepNum);
        return provided ?? { step: stepNum, name, state: 'PENDING' };
      })
    : steps;

  const showProgress  = isRunning && currentStep != null;
  const showSummary   = !!design;
  const showIdle      = !isRunning && !design && !isRealMode;

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
        {/* Idle state — demo launcher */}
        {showIdle && (
          <div className="flex flex-col items-center justify-center h-full gap-5">
            <div className="text-center space-y-1">
              <h2
                className="text-xs font-normal tracking-widest uppercase"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                Bell-Delaware · 16-Step Pipeline
              </h2>
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                HX progress will stream here during a live design run
              </p>
            </div>
            <button
              onClick={demo.start}
              className="flex items-center gap-2 px-5 py-3 border text-xs transition-colors"
              style={{
                fontFamily:      'var(--font-mono)',
                color:           'var(--color-running)',
                borderColor:     'var(--color-running)',
                backgroundColor: 'transparent',
                borderRadius:    '4px',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ▶ Run Demo
            </button>
          </div>
        )}

        {/* Running or completed — show step cards */}
        {(isRunning || showSummary || isRealMode) && (
          <>
            {/* Design summary (complete) */}
            {showSummary && (
              <DesignSummary design={design} onOptimize={isRealMode ? onOptimize : null} />
            )}

            {/* Step cards */}
            {allSteps.map(s => (
              <StepCard
                key={s.step}
                step={s.step}
                name={s.name ?? STEP_NAMES[s.step - 1]}
                state={s.state}
                elapsed={s.elapsed}
                data={s.data}
                iteration={s.iteration}
              />
            ))}
          </>
        )}
      </div>

      {/* Demo footer — reset button while running or after complete */}
      {!isRealMode && (isRunning || showSummary) && (
        <div
          className="flex items-center justify-between px-4 py-2 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {isRunning
              ? `demo · step ${currentStep} / 16`
              : 'demo · complete'}
          </span>
          <button
            onClick={demo.reset}
            className="text-xs transition-colors"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            ↺ reset
          </button>
        </div>
      )}
    </div>
  );
}
