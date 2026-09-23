import { useEffect, useMemo, useRef, useState } from "react";
import { getPlotNumberMapping } from "../../layouts";
import auditData from "../../layouts/sri-lakshmi/plotIdentityAudit.json";
import cropManifest from "../../layouts/sri-lakshmi/plotAuditCropManifest.json";

/**
 * Dev-only plot identity review tool (?audit=identity).
 *
 * Root cause established this session: plotNumberMapping.json's plotNumber
 * field was assigned by scan/row order during the original digitization
 * pass, not by reading the printed digit. Automated OCR was tried (multiple
 * preprocessing passes, red-channel color masking, multi-scale) and proved
 * unreliable at this resolution — it disagreed with itself, and even careful
 * manual crop-reading produced wrong answers until cross-checked against
 * the polygon's *exact* stored geometry. So: this tool shows the real
 * polygon outline over the real reference photo, and treats every number
 * (current data, OCR) as a hypothesis until a human explicitly confirms it
 * against the image. Only human confirmation produces a VERIFIED record.
 *
 * Nothing here writes to plotNumberMapping.json, ever. Review state lives
 * in localStorage and is exported as a separate review artifact for a
 * human-approved migration later (see scripts/migratePlotIdentity — a
 * preview-only utility, also never auto-run).
 */

interface AuditEntry {
  plotNumber: string;
  geometryId: string;
  center: { x: number; y: number };
  ocrReading: string | null;
  verificationStatus: string;
  confidence: string;
}

interface CropManifestEntry {
  id: string;
  plotNumber: string;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  scale: number;
  polygonLocalPx: [number, number][];
  centerLocalPx: [number, number];
}

type Status = "unreviewed" | "verified" | "needs-second-review" | "conflict" | "skipped";

interface ReviewRecord {
  geometryId: string;
  plotNumber: string; // the number the reviewer entered/confirmed
  status: Status;
  verificationMethod: "manual-reference" | "skipped";
  reviewedAt: string;
  note: string;
}

const STORAGE_KEY = "plotIdentityReview.v2";

function loadReviews(): Record<string, ReviewRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveReviews(reviews: Record<string, ReviewRecord>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    /* export button is the durable path */
  }
}

const STATUS_PRIORITY: Record<string, number> = {
  conflict: 0,
  incorrect: 1,
  "likely-incorrect": 2,
  uncertain: 3,
  unverified: 4,
  correct: 5,
};

function normalizePlotNumberInput(raw: string): { value: string | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: "Enter a number" };
  if (!/^\d+$/.test(trimmed)) return { value: null, error: "Digits only" };
  const n = parseInt(trimmed, 10);
  if (n < 1 || n > 279) return { value: null, error: "Must be 1–279" };
  return { value: String(n), error: null };
}

type Filter = "all" | "unreviewed" | "conflicts" | "verified" | "skipped";

export default function PlotIdentityReview() {
  const plotNumberMapping = useMemo(() => getPlotNumberMapping(), []);
  const idToPlotNumber = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plotNumberMapping) m.set(p.id, String(p.plotNumber));
    return m;
  }, [plotNumberMapping]);

  const manifestById = useMemo(() => {
    const m = new Map<string, CropManifestEntry>();
    for (const c of cropManifest as CropManifestEntry[]) m.set(c.id, c);
    return m;
  }, []);

  // Nearest-neighbor context (by geometric distance) — display only, never
  // used to infer or auto-fill a number.
  const neighborsById = useMemo(() => {
    const m = new Map<string, { id: string; plotNumber: string; dx: number; dy: number }[]>();
    for (const p of plotNumberMapping) {
      if (!p.center) continue;
      const pc = p.center;
      const dists = plotNumberMapping
        .filter((q) => q.id !== p.id && q.center)
        .map((q) => {
          const qc = q.center!;
          return {
            id: q.id,
            plotNumber: String(q.plotNumber),
            dx: qc.x - pc.x,
            dy: qc.y - pc.y,
            d: Math.hypot(qc.x - pc.x, qc.y - pc.y),
          };
        })
        .sort((a, b) => a.d - b.d)
        .slice(0, 4);
      m.set(p.id, dists);
    }
    return m;
  }, [plotNumberMapping]);

  const queue = useMemo(() => {
    const entries = auditData as AuditEntry[];
    return [...entries].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.verificationStatus] ?? 5;
      const pb = STATUS_PRIORITY[b.verificationStatus] ?? 5;
      if (pa !== pb) return pa - pb;
      return Number(a.plotNumber) - Number(b.plotNumber);
    });
  }, []);

  const [reviews, setReviews] = useState<Record<string, ReviewRecord>>(loadReviews);
  const [index, setIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [filter, setFilter] = useState<Filter>("unreviewed");
  const [pendingConfirm, setPendingConfirm] = useState<{ plotNumber: string; conflictWith?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const noteRef = useRef<HTMLInputElement | null>(null);

  const visibleQueue = useMemo(() => {
    switch (filter) {
      case "unreviewed":
        return queue.filter((e) => !reviews[e.geometryId] || reviews[e.geometryId].status === "unreviewed");
      case "conflicts":
        return queue.filter((e) => reviews[e.geometryId]?.status === "conflict");
      case "verified":
        return queue.filter((e) => reviews[e.geometryId]?.status === "verified");
      case "skipped":
        return queue.filter((e) => reviews[e.geometryId]?.status === "skipped");
      default:
        return queue;
    }
  }, [queue, reviews, filter]);

  const current = visibleQueue[Math.min(index, Math.max(0, visibleQueue.length - 1))];
  const manifestEntry = current ? manifestById.get(current.geometryId) : undefined;
  const neighbors = current ? neighborsById.get(current.geometryId) ?? [] : [];

  const counts = useMemo(() => {
    const all = Object.values(reviews);
    return {
      total: queue.length,
      verified: all.filter((r) => r.status === "verified").length,
      conflicts: all.filter((r) => r.status === "conflict").length,
      needsSecond: all.filter((r) => r.status === "needs-second-review").length,
      skipped: all.filter((r) => r.status === "skipped").length,
      unreviewed: queue.length - all.length,
    };
  }, [reviews, queue.length]);

  useEffect(() => {
    setInputValue("");
    setNoteValue("");
    setPendingConfirm(null);
  }, [current?.geometryId]);

  const commit = (geometryId: string, record: ReviewRecord) => {
    setReviews((prev) => {
      const next = { ...prev, [geometryId]: record };
      saveReviews(next);
      return next;
    });
  };

  const goNext = () => setIndex((i) => Math.min(i + 1, Math.max(0, visibleQueue.length - 1)));
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  // Find another geometry already VERIFIED under this exact number.
  const findVerifiedConflict = (plotNumber: string, excludeId: string): string | null => {
    for (const [gid, r] of Object.entries(reviews)) {
      if (gid !== excludeId && r.status === "verified" && r.plotNumber === plotNumber) return gid;
    }
    return null;
  };

  const requestConfirm = (plotNumber: string) => {
    if (!current) return;
    const conflictWith = findVerifiedConflict(plotNumber, current.geometryId);
    setPendingConfirm({ plotNumber, conflictWith: conflictWith ?? undefined });
  };

  const finalizeVerify = (plotNumber: string, overrideConflict: boolean) => {
    if (!current) return;
    const conflictWith = findVerifiedConflict(plotNumber, current.geometryId);
    if (conflictWith && !overrideConflict) {
      commit(current.geometryId, {
        geometryId: current.geometryId,
        plotNumber,
        status: "conflict",
        verificationMethod: "manual-reference",
        reviewedAt: new Date().toISOString(),
        note: noteValue.trim() || `Conflicts with ${conflictWith}, also claiming ${plotNumber}`,
      });
      setPendingConfirm(null);
      return;
    }
    // Overriding: demote the previous holder to needs-second-review rather
    // than silently deleting its verification.
    if (conflictWith && overrideConflict) {
      const prev = reviews[conflictWith];
      commit(conflictWith, {
        ...prev,
        status: "needs-second-review",
        note: (prev.note ? prev.note + " | " : "") + `Overridden: ${current.geometryId} also verified as ${plotNumber}`,
      });
    }
    commit(current.geometryId, {
      geometryId: current.geometryId,
      plotNumber,
      status: "verified",
      verificationMethod: "manual-reference",
      reviewedAt: new Date().toISOString(),
      note: noteValue.trim(),
    });
    setPendingConfirm(null);
    goNext();
  };

  const handleConfirmCurrentNumber = () => requestConfirm(current.plotNumber);

  const handleSubmitCorrection = () => {
    const { value, error } = normalizePlotNumberInput(inputValue);
    if (error || !value) return;
    requestConfirm(value);
  };

  const handleSkip = () => {
    if (!current) return;
    commit(current.geometryId, {
      geometryId: current.geometryId,
      plotNumber: current.plotNumber,
      status: "skipped",
      verificationMethod: "skipped",
      reviewedAt: new Date().toISOString(),
      note: noteValue.trim(),
    });
    goNext();
  };

  const handleNeedsSecondReview = () => {
    if (!current) return;
    commit(current.geometryId, {
      geometryId: current.geometryId,
      plotNumber: inputValue.trim() || current.plotNumber,
      status: "needs-second-review",
      verificationMethod: "manual-reference",
      reviewedAt: new Date().toISOString(),
      note: noteValue.trim() || "Flagged for second review",
    });
    goNext();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping = active === inputRef.current || active === noteRef.current;
      if (pendingConfirm) return; // dialog has its own handlers
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); return; }
      if (isTyping) {
        if (e.key === "Enter" && active === inputRef.current) { e.preventDefault(); handleSubmitCorrection(); }
        if (e.key === "Escape") { (active as HTMLInputElement).blur(); }
        return;
      }
      if (e.key === "Enter" || e.key.toLowerCase() === "y") { e.preventDefault(); handleConfirmCurrentNumber(); }
      else if (e.key.toLowerCase() === "n") { e.preventDefault(); inputRef.current?.focus(); }
      else if (e.key.toLowerCase() === "s") { e.preventDefault(); handleSkip(); }
      else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (current) {
          setReviews((prev) => {
            const next = { ...prev };
            delete next[current.geometryId];
            saveReviews(next);
            return next;
          });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, inputValue, visibleQueue.length, pendingConfirm, reviews]);

  const handleExportVerified = () => {
    const out: Record<string, { plotNumber: string; verified: boolean; verificationMethod: string; reviewedAt: string; reviewerNote: string }> = {};
    for (const [geometryId, r] of Object.entries(reviews)) {
      if (r.status !== "verified") continue;
      out[geometryId] = {
        plotNumber: r.plotNumber,
        verified: true,
        verificationMethod: r.verificationMethod,
        reviewedAt: r.reviewedAt,
        reviewerNote: r.note,
      };
    }
    downloadJson(out, "plotNumberMapping.verified.json");
  };

  const handleExportReport = () => {
    const numbers = Object.values(reviews).filter((r) => r.status === "verified").map((r) => r.plotNumber);
    const numCounts: Record<string, number> = {};
    for (const n of numbers) numCounts[n] = (numCounts[n] || 0) + 1;
    const duplicateNumbers = Object.entries(numCounts).filter(([, c]) => c > 1).map(([n]) => n);
    const missingNumbers: string[] = [];
    for (let i = 1; i <= 279; i++) if (!numbers.includes(String(i))) missingNumbers.push(String(i));
    downloadJson({
      totalPlots: queue.length,
      verified: counts.verified,
      unreviewed: counts.unreviewed,
      conflicts: counts.conflicts,
      needsSecondReview: counts.needsSecond,
      skipped: counts.skipped,
      duplicateVerifiedNumbers: duplicateNumbers,
      missingVerifiedNumbers: missingNumbers,
      generatedAt: new Date().toISOString(),
    }, "plotIdentityVerificationReport.json");
  };

  if (!current) {
    return (
      <div style={wrapStyle}>
        <div style={{ textAlign: "center" }}>
          <h2>Queue empty for this filter</h2>
          <ProgressBlock counts={counts} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            <button style={primaryBtn} onClick={handleExportVerified}>Export verified mapping</button>
            <button style={ghostBtn} onClick={handleExportReport}>Export report</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button style={ghostBtn} onClick={() => { setFilter("all"); setIndex(0); }}>Show all plots</button>
          </div>
        </div>
      </div>
    );
  }

  const existingReview = reviews[current.geometryId];
  const inputCheck = normalizePlotNumberInput(inputValue);

  return (
    <div style={wrapStyle}>
      <div style={{ width: 980, maxWidth: "97vw" }}>
        <div style={headerRow}>
          <div>
            <strong>Plot Identity Review</strong>
            <span style={{ opacity: 0.6, marginLeft: 10 }}>
              showing {index + 1} / {visibleQueue.length} ({filter})
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["unreviewed", "conflicts", "verified", "skipped", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setIndex(0); }}
                style={{ ...filterBtn, ...(filter === f ? filterBtnActive : {}) }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <ProgressBlock counts={counts} compact />

        <div style={card}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {/* View A: close crop with polygon overlay */}
            <div>
              <div style={viewLabel}>Close crop — polygon outline</div>
              <div style={{ position: "relative", width: 340, height: 240, background: "#f5f0e6", borderRadius: 6, overflow: "hidden" }}>
                <img
                  src={`/audit-crops/${current.geometryId}.png`}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
                {manifestEntry && (
                  <svg
                    viewBox={`0 0 ${manifestEntry.cropW * manifestEntry.scale} ${manifestEntry.cropH * manifestEntry.scale}`}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                  >
                    <polygon
                      points={manifestEntry.polygonLocalPx
                        .map(([x, y]) => `${x * manifestEntry.scale},${y * manifestEntry.scale}`)
                        .join(" ")}
                      fill="rgba(34,197,94,0.18)"
                      stroke="#22c55e"
                      strokeWidth={3}
                    />
                    <circle
                      cx={manifestEntry.centerLocalPx[0] * manifestEntry.scale}
                      cy={manifestEntry.centerLocalPx[1] * manifestEntry.scale}
                      r={4}
                      fill="#00e5ff"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* View B: context crop, no overlay (avoid clutter, just orientation) */}
            <div>
              <div style={viewLabel}>Context — neighboring plots</div>
              <img
                src={`/audit-crops/${current.geometryId}-context.png`}
                alt=""
                style={{ width: 340, height: 240, objectFit: "contain", background: "#f5f0e6", borderRadius: 6 }}
              />
            </div>

            {/* View C: full-layout mini-map with this polygon highlighted */}
            <div>
              <div style={viewLabel}>Full layout — location</div>
              <MiniMap plots={plotNumberMapping as unknown as MiniMapPlot[]} highlightId={current.geometryId} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap" }}>
            <div style={{ minWidth: 220 }}>
              <div style={infoRow}><span style={infoLabel}>Geometry ID</span><span>{current.geometryId}</span></div>
              <div style={infoRow}><span style={infoLabel}>Current data number</span><span style={{ fontSize: 20, fontWeight: 700 }}>{current.plotNumber}</span></div>
              <div style={infoRow}>
                <span style={infoLabel}>OCR hint</span>
                <span>{current.ocrReading ?? "—"} <span style={untrustedTag}>UNTRUSTED HINT</span></span>
              </div>
              <div style={infoRow}><span style={infoLabel}>Audit signal</span><span>{current.verificationStatus} ({current.confidence})</span></div>
              {existingReview && (
                <div style={{ ...infoRow, color: existingReview.status === "conflict" ? "#f87171" : "#22c55e" }}>
                  <span style={infoLabel}>Review state</span>
                  <span>{existingReview.status} → {existingReview.plotNumber}</span>
                </div>
              )}
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
                Nearest plots by position — context only, not used to determine identity
              </div>
              {neighbors.map((n) => (
                <div key={n.id} style={{ fontSize: 12, opacity: 0.8 }}>
                  {n.plotNumber} ({Math.abs(n.dx) > Math.abs(n.dy) ? (n.dx < 0 ? "left" : "right") : (n.dy < 0 ? "above" : "below")})
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
            <button style={primaryBtn} onClick={handleConfirmCurrentNumber}>
              ✓ Confirm "{current.plotNumber}" is correct (Enter/Y)
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Actual printed number, 1–279 (N to focus)"
              style={textInput}
            />
            <button style={dangerBtn} onClick={handleSubmitCorrection} disabled={!!inputCheck.error}>
              ✎ Correct
            </button>
            <button style={ghostBtn} onClick={handleNeedsSecondReview}>Needs 2nd review</button>
            <button style={ghostBtn} onClick={handleSkip}>Skip (S)</button>
          </div>
          {inputValue && inputCheck.error && (
            <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{inputCheck.error}</div>
          )}
          <div style={{ marginTop: 8 }}>
            <input
              ref={noteRef}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Optional note (e.g. number partly obscured)"
              style={{ ...textInput, fontSize: 12 }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button style={ghostBtn} onClick={goPrev}>← Prev</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={ghostBtn} onClick={handleExportVerified}>Export verified</button>
              <button style={ghostBtn} onClick={handleExportReport}>Export report</button>
            </div>
            <button style={ghostBtn} onClick={goNext}>Next →</button>
          </div>
        </div>
      </div>

      {pendingConfirm && (
        <ConfirmDialog
          geometryId={current.geometryId}
          currentNumber={current.plotNumber}
          proposedNumber={pendingConfirm.plotNumber}
          conflictWith={pendingConfirm.conflictWith}
          onCancel={() => setPendingConfirm(null)}
          onConfirm={(override) => finalizeVerify(pendingConfirm.plotNumber, override)}
        />
      )}
    </div>
  );
}

function ProgressBlock({ counts, compact }: { counts: { total: number; verified: number; conflicts: number; needsSecond: number; skipped: number; unreviewed: number }; compact?: boolean }) {
  const pct = counts.total ? Math.round((counts.verified / counts.total) * 100) : 0;
  return (
    <div style={{ fontSize: 12, marginBottom: compact ? 10 : 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span>Verified {counts.verified} / {counts.total} ({pct}%)</span>
        <span style={{ opacity: 0.7 }}>
          conflicts {counts.conflicts} · needs 2nd review {counts.needsSecond} · skipped {counts.skipped} · unreviewed {counts.unreviewed}
        </span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#22c55e" }} />
      </div>
    </div>
  );
}

interface MiniMapPlot { id: string; polygon: { x: number; y: number }[] }

function MiniMap({ plots, highlightId }: { plots: MiniMapPlot[]; highlightId: string }) {
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of plots) for (const pt of p.polygon) {
      minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
    }
    return { minX, minY, maxX, maxY };
  }, [plots]);
  const W = 340, H = 240;
  const sx = W / (bounds.maxX - bounds.minX || 1);
  const sy = H / (bounds.maxY - bounds.minY || 1);
  const s = Math.min(sx, sy);
  const conv = (x: number, y: number) => [(x - bounds.minX) * s, (y - bounds.minY) * s];
  return (
    <svg width={W} height={H} style={{ background: "#0b1220", borderRadius: 6 }}>
      {plots.map((p) => {
        const isHi = p.id === highlightId;
        const pts = p.polygon.map((pt) => conv(pt.x, pt.y).join(",")).join(" ");
        return (
          <polygon
            key={p.id}
            points={pts}
            fill={isHi ? "#00e5ff" : "#2dd4bf"}
            fillOpacity={isHi ? 1 : 0.35}
            stroke={isHi ? "#00e5ff" : "none"}
            strokeWidth={isHi ? 6 : 0}
          />
        );
      })}
    </svg>
  );
}

function ConfirmDialog({
  geometryId, currentNumber, proposedNumber, conflictWith, onCancel, onConfirm,
}: {
  geometryId: string; currentNumber: string; proposedNumber: string; conflictWith?: string;
  onCancel: () => void; onConfirm: (override: boolean) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div style={dialogOverlay}>
      <div style={dialogBox}>
        <h3 style={{ marginTop: 0 }}>Confirm plot identity</h3>
        <div style={infoRow}><span style={infoLabel}>Geometry</span><span>{geometryId}</span></div>
        <div style={infoRow}><span style={infoLabel}>Current data says</span><span>{currentNumber}</span></div>
        <div style={infoRow}><span style={infoLabel}>You entered</span><span style={{ fontWeight: 700 }}>{proposedNumber}</span></div>
        {conflictWith ? (
          <div style={{ marginTop: 10, padding: 10, background: "rgba(248,113,113,0.15)", border: "1px solid #f87171", borderRadius: 6, fontSize: 13 }}>
            <strong>Warning:</strong> plot {proposedNumber} is already verified as <code>{conflictWith}</code>.
            Overriding will demote that geometry to "needs second review" rather than deleting it.
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={dangerBtn} onClick={() => onConfirm(true)}>Override existing verification</button>
              <button style={ghostBtn} onClick={onCancel}>Keep unresolved</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, marginTop: 10 }}>Are you sure this physical polygon is plot {proposedNumber}?</p>
        )}
        {!conflictWith && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={primaryBtn} onClick={() => onConfirm(false)}>Confirm</button>
            <button style={ghostBtn} onClick={onCancel}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const wrapStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "#0f172a", color: "#e5e7eb",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "Arial, Helvetica, sans-serif", zIndex: 1000, overflow: "auto", padding: 20,
};
const headerRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 14 };
const card: React.CSSProperties = { background: "#1e293b", borderRadius: 10, padding: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" };
const infoRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 13, gap: 12 };
const infoLabel: React.CSSProperties = { opacity: 0.6 };
const viewLabel: React.CSSProperties = { fontSize: 11, opacity: 0.6, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const untrustedTag: React.CSSProperties = { fontSize: 9, opacity: 0.6, marginLeft: 6, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 3, padding: "1px 4px" };
const primaryBtn: React.CSSProperties = { background: "#22c55e", color: "#052e12", border: "none", borderRadius: 6, padding: "10px 14px", fontWeight: 700, cursor: "pointer", flex: 1 };
const dangerBtn: React.CSSProperties = { background: "#f59e0b", color: "#3a2600", border: "none", borderRadius: 6, padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { background: "transparent", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, padding: "8px 12px", cursor: "pointer" };
const textInput: React.CSSProperties = { flex: 1, padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.25)", background: "#0f172a", color: "#e5e7eb" };
const filterBtn: React.CSSProperties = { background: "transparent", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 10px", fontSize: 11, cursor: "pointer" };
const filterBtnActive: React.CSSProperties = { background: "#334155", borderColor: "#64748b" };
const dialogOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 };
const dialogBox: React.CSSProperties = { background: "#1e293b", borderRadius: 10, padding: 20, width: 420, boxShadow: "0 10px 40px rgba(0,0,0,0.6)" };
