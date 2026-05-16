/**
 * PropertyRequestCard — EPIC-XSTACK-2026-007-S1
 *
 * Rendered inside StepCard when event_subtype === "property_request".
 * Shows the AI-estimated fluid properties (or a "no estimate" notice)
 * so the engineer can make an informed approval decision before the
 * ActionableDecisionBody option buttons are shown.
 */

/** Format a number for display, or return a dash. */
function fmt(value, digits = 4) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!isFinite(n)) return "—";
  return n.toPrecision(digits);
}

/** Confidence bar: 0..1 → width % + colour. */
function ConfidenceBar({ confidence }) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const colour =
    pct >= 70
      ? "#22c55e" // green
      : pct >= 50
        ? "#f59e0b" // amber
        : "#ef4444"; // red
  return (
    <div className="mt-1">
      <div
        className="flex justify-between text-xs mb-0.5"
        style={{ color: "var(--color-text-muted, #9ca3af)" }}
      >
        <span>AI confidence</span>
        <span style={{ color: colour, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div
        style={{
          background: "var(--color-border, #374151)",
          borderRadius: 4,
          height: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            background: colour,
            height: "100%",
            borderRadius: 4,
            transition: "width 0.4s",
          }}
        />
      </div>
    </div>
  );
}

/** Table of properties for a single fluid. */
function FluidEstimateTable({ fluid }) {
  const est = fluid.ai_estimate;
  const sideLabel = fluid.side === "hot" ? "Hot side" : "Cold side";

  const rows = [
    { label: "Density ρ", unit: "kg/m³", value: est?.density_kg_m3 },
    { label: "Viscosity μ", unit: "Pa·s", value: est?.viscosity_Pa_s },
    { label: "Specific heat Cp", unit: "J/(kg·K)", value: est?.cp_J_kgK },
    { label: "Conductivity k", unit: "W/(m·K)", value: est?.k_W_mK },
    { label: "Prandtl Pr", unit: "—", value: est?.Pr },
  ];

  return (
    <div
      style={{
        background: "var(--color-card-bg, #1f2937)",
        border: "1px solid var(--color-border, #374151)",
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 12,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: fluid.side === "hot" ? "#f87171" : "#60a5fa",
          }}
        >
          {sideLabel}
        </span>
        <span
          style={{
            marginLeft: 8,
            fontWeight: 600,
            color: "var(--color-text, #f9fafb)",
            fontSize: 13,
          }}
        >
          {fluid.fluid_name}
        </span>
        <span
          style={{
            marginLeft: 8,
            fontSize: 11,
            color: "var(--color-text-muted, #9ca3af)",
          }}
        >
          @ {fluid.temperature_C?.toFixed(1)}°C
        </span>
      </div>

      {est == null ? (
        <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>
          No AI estimate available — AI unavailable or no API key configured.
          Please provide values manually.
        </p>
      ) : (
        <>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border, #374151)",
                }}
              >
                <th
                  style={{
                    textAlign: "left",
                    padding: "3px 6px",
                    color: "var(--color-text-muted, #9ca3af)",
                    fontWeight: 500,
                  }}
                >
                  Property
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "3px 6px",
                    color: "var(--color-text-muted, #9ca3af)",
                    fontWeight: 500,
                  }}
                >
                  Value
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "3px 6px",
                    color: "var(--color-text-muted, #9ca3af)",
                    fontWeight: 500,
                  }}
                >
                  Unit
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, unit, value }) => (
                <tr
                  key={label}
                  style={{
                    borderBottom:
                      "1px solid var(--color-border-subtle, #1f2937)",
                  }}
                >
                  <td
                    style={{
                      padding: "3px 6px",
                      color: "var(--color-text-muted, #9ca3af)",
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      padding: "3px 6px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "var(--color-text, #f9fafb)",
                    }}
                  >
                    {fmt(value)}
                  </td>
                  <td
                    style={{
                      padding: "3px 6px",
                      color: "var(--color-text-muted, #9ca3af)",
                    }}
                  >
                    {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ConfidenceBar confidence={est.property_confidence} />
          {est.property_source && (
            <p
              style={{
                fontSize: 11,
                color: "var(--color-text-muted, #9ca3af)",
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              Source:{" "}
              <code style={{ fontSize: 11 }}>{est.property_source}</code>
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * PropertyRequestCard
 *
 * Props:
 *   payload  — property_request_payload from the SSE event
 *              shape: { fluids: [...], required_properties: [...], threshold: 0.70 }
 */
export default function PropertyRequestCard({ payload }) {
  if (
    !payload ||
    !Array.isArray(payload.fluids) ||
    payload.fluids.length === 0
  ) {
    return null;
  }

  const threshold = payload.threshold ?? 0.7;

  return (
    <div style={{ marginBottom: 14 }}>
      <p
        style={{
          fontSize: 12,
          color: "var(--color-text-muted, #9ca3af)",
          marginBottom: 10,
          lineHeight: 1.5,
        }}
      >
        The following fluid properties were estimated by AI with confidence
        below the{" "}
        <strong style={{ color: "var(--color-text, #f9fafb)" }}>
          {Math.round(threshold * 100)}%
        </strong>{" "}
        threshold. Review the values below before approving.
      </p>

      {payload.fluids.map((fluid, i) => (
        <FluidEstimateTable key={`${fluid.side}-${i}`} fluid={fluid} />
      ))}
    </div>
  );
}
