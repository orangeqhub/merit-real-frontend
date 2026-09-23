/**
 * Fixed north arrow, part of the annotation layer. Screen-space only — it
 * intentionally does NOT sit inside the pan/zoom transform group, so it
 * never rotates or scales with the map.
 */
export default function NorthIndicator() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 76,
        right: 20,
        zIndex: 2,
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "rgba(24, 24, 27, 0.72)",
        border: "1px solid rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <svg width="22" height="32" viewBox="0 0 22 32">
        <text
          x="11"
          y="9"
          textAnchor="middle"
          fontSize="10"
          fontWeight={700}
          fill="#e5e7eb"
        >
          N
        </text>
        <path d="M11 12 L18 29 L11 25 L4 29 Z" fill="#ef4444" />
        <path d="M11 25 L18 29 L11 12 Z" fill="#f87171" fillOpacity={0.55} />
      </svg>
    </div>
  );
}
