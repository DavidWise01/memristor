import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";

/* ── theme ─────────────────────────────────────────────────────────── */
const T = {
  bg:      "#070b08",
  panel:   "#0c120d",
  panel2:  "#0a0f0b",
  grid:    "#16241a",
  edge:    "#1d3324",
  phos:    "#5ef38c",   // logistic / numeric  (fixed)
  phosDim: "#2f7a4d",
  amber:   "#ffb547",   // analytic closed form
  red:     "#ff5a52",   // defective quadratic
  ink:     "#cfe9d6",
  faint:   "#6f8c79",
};

/* ── model (mirrors memristive_seed_v3.c exactly) ──────────────────── */
const S2 = Math.SQRT2;
const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
const fNew = (D) => { const u = clamp(D / 100, 0, 1); return 1 + 4 * u * (1 - u); };      // logistic, peaks 2.0 @ D=50
const fOld = (D) => { const u = clamp(D / 100, 0, 1); return 1 + 4 * u * u; };            // defective v1, monotone → 5.0
const debtAnalytic = (t, r) => {
  const phi = Math.atanh(-S2 / 2);
  const x = (S2 * r / 50) * t + phi;
  return 100 * clamp(0.5 + Math.tanh(x) / S2, 0, 1);
};
const tSaturate = (r) => (Math.atanh(S2 / 2) - Math.atanh(-S2 / 2)) * 50 / (S2 * r);

/* ── live integrator: dD/dt = r·F(D) via cycle accumulation ────────── */
function advance(s, r, law, dtSim) {
  let { c, D, t } = s, acc = 0, h = 0.05;
  while (acc < dtSim - 1e-9) {
    const F = law === "logistic" ? fNew(D) : fOld(D);
    c += 600 * F * h;
    D = Math.min((c * r) / 600, 100);
    t += h; acc += h;
  }
  return { c, D, t };
}

const FONT_MONO = "'IBM Plex Mono','JetBrains Mono',ui-monospace,monospace";
const FONT_DISP = "'Chakra Petch',sans-serif";

export default function MemristiveDashboard() {
  const [r, setR] = useState(0.05);
  const [speed, setSpeed] = useState(40);          // simulated seconds / real second
  const [law, setLaw] = useState("logistic");      // 'logistic' | 'quadratic'
  const [running, setRunning] = useState(true);
  const [state, setState] = useState({ c: 0, D: 0, t: 0 });
  const [hist, setHist] = useState([{ t: 0, num: 0, ana: 0 }]);
  const sRef = useRef(state);
  sRef.current = state;

  // reset trajectory when the regime changes
  useEffect(() => {
    setState({ c: 0, D: 0, t: 0 });
    setHist([{ t: 0, num: 0, ana: 0 }]);
  }, [r, law]);

  // simulation loop
  useEffect(() => {
    if (!running) return;
    const TICK = 40;
    const id = setInterval(() => {
      const ns = advance(sRef.current, r, law, (speed * TICK) / 1000);
      setState(ns);
      setHist((h) => {
        const next = [...h, { t: ns.t, num: ns.D, ana: debtAnalytic(ns.t, r) }];
        return next.length > 700 ? next.slice(next.length - 700) : next;
      });
    }, TICK);
    return () => clearInterval(id);
  }, [running, r, speed, law]);

  const curve = useMemo(
    () => Array.from({ length: 101 }, (_, i) => ({ D: i, logistic: fNew(i), quadratic: fOld(i) })),
    []
  );
  const tSat = tSaturate(r);
  const Fnow = law === "logistic" ? fNew(state.D) : fOld(state.D);
  const saturated = state.D >= 99.999;
  const reset = () => { setState({ c: 0, D: 0, t: 0 }); setHist([{ t: 0, num: 0, ana: 0 }]); };

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: FONT_MONO, minHeight: "100%", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .mz-range{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:${T.edge};outline:none;}
        .mz-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${T.phos};box-shadow:0 0 8px ${T.phos};cursor:pointer;border:2px solid ${T.bg};}
        .mz-range::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:${T.phos};box-shadow:0 0 8px ${T.phos};cursor:pointer;border:2px solid ${T.bg};}
        .mz-scan{background-image:repeating-linear-gradient(0deg,transparent 0 2px,rgba(94,243,140,.025) 2px 4px);}
      `}</style>

      {/* header */}
      <div style={{ borderBottom: `1px solid ${T.edge}`, paddingBottom: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontFamily: FONT_DISP, fontWeight: 700, fontSize: 26, letterSpacing: 2, color: T.phos, textShadow: `0 0 12px ${T.phosDim}` }}>
              MEMRISTIVE SUBSTRATE SEED
            </div>
            <div style={{ color: T.faint, fontSize: 12, letterSpacing: 1 }}>
              v3.0 · logistic feedback observatory · T133:PHASE-SHADOW
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: T.amber }}>
            <div>F(D) = 1 + 4u(1−u),&nbsp;&nbsp;u = D / 100</div>
            <div style={{ color: T.faint, fontSize: 11 }}>dD/dt = r · F(D)</div>
          </div>
        </div>
      </div>

      {/* controls */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
        <Ctrl label={`extraction rate  r = ${r.toFixed(3)}`} hint="[0.01 – 0.30]">
          <input className="mz-range" style={{ width: 220 }} type="range" min="0.01" max="0.30" step="0.005"
            value={r} onChange={(e) => setR(parseFloat(e.target.value))} />
        </Ctrl>
        <Ctrl label={`sim speed  ${speed}×`} hint="sim-seconds / real-second">
          <input className="mz-range" style={{ width: 160 }} type="range" min="5" max="160" step="5"
            value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} />
        </Ctrl>
        <div>
          <div style={{ fontSize: 11, color: T.faint, marginBottom: 6 }}>feedback law</div>
          <div style={{ display: "flex", border: `1px solid ${T.edge}`, borderRadius: 6, overflow: "hidden" }}>
            <Tab on={law === "logistic"} c={T.phos} onClick={() => setLaw("logistic")}>LOGISTIC ✓</Tab>
            <Tab on={law === "quadratic"} c={T.red} onClick={() => setLaw("quadratic")}>QUADRATIC ✗</Tab>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => setRunning((v) => !v)} c={running ? T.amber : T.phos}>
            {running ? "❚❚ PAUSE" : "▶ RUN"}
          </Btn>
          <Btn onClick={reset} c={T.faint}>↺ RESET</Btn>
        </div>
      </div>

      {/* readouts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 18 }}>
        <Stat label="time t" v={state.t.toFixed(1)} u="s" />
        <Stat label="cycles c" v={Math.round(state.c).toLocaleString()} u="" />
        <Stat label="debt D" v={state.D.toFixed(3)} u="/100" hot={saturated} />
        <Stat label={`F (${law})`} v={Fnow.toFixed(4)} u="×" c={law === "logistic" ? T.phos : T.red} />
        <Stat label="t_saturate" v={tSat.toFixed(0)} u="s" c={T.amber} />
        <Stat label="state" v={saturated ? "SATURATED" : "EXTRACTING"} u="" c={saturated ? T.red : T.phos} small />
      </div>

      {/* charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16 }}>
        <Panel title="FEEDBACK MULTIPLIER  F(D)" sub="logistic self-limits at the midpoint; the v1 quadratic only accelerates">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 18, left: -8 }}>
              <CartesianGrid stroke={T.grid} />
              <XAxis dataKey="D" stroke={T.faint} tick={{ fontSize: 10, fill: T.faint }}
                label={{ value: "topological debt  D", position: "bottom", offset: 2, fill: T.faint, fontSize: 11 }} />
              <YAxis stroke={T.faint} tick={{ fontSize: 10, fill: T.faint }} domain={[0, 5.2]} />
              <Tooltip contentStyle={tip} labelStyle={{ color: T.ink }} formatter={(v) => v.toFixed(3)} />
              <ReferenceLine x={50} stroke={T.phosDim} strokeDasharray="3 3"
                label={{ value: "D=50  F=2", fill: T.phosDim, fontSize: 10, position: "insideTopRight" }} />
              <Line type="monotone" dataKey="quadratic" name="quadratic (v1 ✗)" stroke={T.red} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="logistic" name="logistic (v3 ✓)" stroke={T.phos} strokeWidth={2.4} dot={false} />
              <ReferenceDot x={Math.round(state.D)} y={law === "logistic" ? fNew(state.D) : fOld(state.D)}
                r={5} fill={law === "logistic" ? T.phos : T.red} stroke={T.bg} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Legendlet items={[["logistic (v3 ✓)", T.phos], ["quadratic (v1 ✗)", T.red], ["live D", T.amber]]} />
        </Panel>

        <Panel title="DEBT TRAJECTORY  D(t)" sub={law === "logistic"
          ? "numeric integration overlaid on the analytic closed form — they coincide"
          : "quadratic law — no closed form derived; analytic overlay disabled"}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={hist} margin={{ top: 8, right: 16, bottom: 18, left: -8 }}>
              <CartesianGrid stroke={T.grid} />
              <XAxis dataKey="t" stroke={T.faint} tick={{ fontSize: 10, fill: T.faint }}
                tickFormatter={(v) => v.toFixed(0)} type="number" domain={["dataMin", "dataMax"]}
                label={{ value: "time  t (s)", position: "bottom", offset: 2, fill: T.faint, fontSize: 11 }} />
              <YAxis stroke={T.faint} tick={{ fontSize: 10, fill: T.faint }} domain={[0, 100]} />
              <Tooltip contentStyle={tip} labelFormatter={(v) => `t=${v.toFixed(1)}s`} formatter={(v) => v.toFixed(3)} />
              <ReferenceLine y={100} stroke={T.red} strokeDasharray="2 4"
                label={{ value: "cap 100", fill: T.red, fontSize: 10, position: "insideTopRight" }} />
              {law === "logistic" && (
                <Line type="monotone" dataKey="ana" name="analytic" stroke={T.amber} strokeWidth={3} strokeDasharray="6 5" dot={false} isAnimationActive={false} />
              )}
              <Line type="monotone" dataKey="num" name="numeric" stroke={T.phos} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <Legendlet items={law === "logistic"
            ? [["numeric (Euler)", T.phos], ["analytic tanh", T.amber]]
            : [["numeric (Euler)", T.phos]]} />
        </Panel>
      </div>

      {/* explainers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginTop: 18 }}>
        <Note title="THE MODEL">
          Debt accrues with cycles: <code style={cd}>D = min(c·r/600, 100)</code>. Each cycle the substrate
          re-extracts at multiplier <code style={cd}>F(D)</code>, so <code style={cd}>dD/dt = r·F(D)</code>.
          The multiplier is a parabola in <code style={cd}>u = D/100</code> that opens downward —
          extraction is fastest at the midpoint and tapers to 1× at both empty and full.
        </Note>
        <Note title="WHY LOGISTIC, NOT QUADRATIC">
          The v1 law <code style={{ ...cd, color: T.red }}>1 + 4u²</code> rises monotonically to 5× at full debt:
          a runaway that pulls hardest exactly when the substrate is most exhausted. The fix
          <code style={{ ...cd, color: T.phos }}> 1 + 4u(1−u)</code> peaks at 2× when D=50 and decays back to 1×,
          so the system <b>self-limits</b>. Toggle the law above to watch the trajectory change.
        </Note>
        <Note title="FIX · ANALYTIC AMPLITUDE">
          Solving <code style={cd}>dD/dt = r·F</code> in closed form gives
          <code style={cd}> u(t) = ½ + tanh(x)/√2</code>, &nbsp;<code style={cd}>x = (√2·r/50)t + φ</code>,
          <code style={cd}> φ = atanh(−√2/2)</code>. v2.0 used <code style={{ ...cd, color: T.red }}>/2</code> instead of
          <code style={cd}> /√2</code> → it reported D(0)=14.6 and never tracked the ODE. The amber curve here is the corrected form.
        </Note>
        <Note title="FIX · Q64.64 OVERFLOW">
          The fixed-point kernel computed <code style={{ ...cd, color: T.red }}>qmul(c≪64, r)</code>, whose 128-bit
          product overflowed once <code style={cd}>c &gt; ~20</code>, wrapping the debt. Since <code style={cd}>c</code> is
          an integer and <code style={cd}>r</code> is already Q64.64, <code style={{ ...cd, color: T.phos }}>c·r</code> is the
          scaled product directly — no shift. The kernel then lands F = 2.000000 exactly at D=50.
        </Note>
        <Note title="SATURATION TIME">
          D reaches the cap when <code style={cd}>tanh(x)=√2/2</code>, giving a closed form
          <code style={cd}> t_sat = [atanh(√2/2) − φ]·50/(√2·r)</code>. At r={r.toFixed(3)} that is
          <b style={{ color: T.amber }}> {tSat.toFixed(1)} s</b>. Lower r ⇒ slower accrual ⇒ later saturation
          (t_sat scales as 1/r).
        </Note>
        <Note title="READING THE PANELS">
          Left: the static feedback law with a live dot riding the curve at the current D.
          Right: the running simulation. Under the logistic law the green Euler integration sits on top of the
          amber closed form — the visual proof the derivation is correct. Switch laws or drag r to perturb the run.
        </Note>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: T.faint, textAlign: "center", letterSpacing: 1 }}>
        David Lee Wise · TriPod LLC · ROOT0 — math mirrors memristive_seed_v3.c
      </div>
    </div>
  );
}

/* ── small components ──────────────────────────────────────────────── */
const tip = { background: "#0a0f0b", border: "1px solid #1d3324", borderRadius: 6, fontFamily: FONT_MONO, fontSize: 12 };
const cd = { background: "#0a0f0b", border: "1px solid #1d3324", borderRadius: 4, padding: "1px 5px", fontSize: 12, color: "#cfe9d6" };

function Ctrl({ label, hint, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.faint, marginBottom: 6 }}>
        {label} <span style={{ opacity: 0.6 }}>{hint}</span>
      </div>
      {children}
    </div>
  );
}
function Tab({ on, c, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: on ? c : "transparent", color: on ? T.bg : T.faint,
      border: "none", padding: "8px 14px", fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600,
      cursor: "pointer", letterSpacing: 1,
    }}>{children}</button>
  );
}
function Btn({ children, onClick, c }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", color: c, border: `1px solid ${c}`, borderRadius: 6,
      padding: "9px 16px", fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: 1,
    }}>{children}</button>
  );
}
function Stat({ label, v, u, c = T.ink, hot, small }) {
  return (
    <div className="mz-scan" style={{ background: T.panel, border: `1px solid ${hot ? T.red : T.edge}`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: T.faint, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: FONT_DISP, fontWeight: 700, fontSize: small ? 16 : 22, color: hot ? T.red : c, textShadow: `0 0 10px ${c}22` }}>
        {v}<span style={{ fontSize: 11, color: T.faint, marginLeft: 3 }}>{u}</span>
      </div>
    </div>
  );
}
function Panel({ title, sub, children }) {
  return (
    <div className="mz-scan" style={{ background: T.panel, border: `1px solid ${T.edge}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontFamily: FONT_DISP, fontWeight: 700, fontSize: 14, letterSpacing: 1.5, color: T.phos, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: T.faint, marginBottom: 10 }}>{sub}</div>
      {children}
    </div>
  );
}
function Legendlet({ items }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6, fontSize: 11, color: T.faint }}>
      {items.map(([l, c]) => (
        <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 3, background: c, borderRadius: 2, display: "inline-block" }} />{l}
        </span>
      ))}
    </div>
  );
}
function Note({ title, children }) {
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.edge}`, borderRadius: 8, padding: 14 }}>
      <div style={{ fontFamily: FONT_DISP, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, color: T.amber, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: T.ink }}>{children}</div>
    </div>
  );
}
