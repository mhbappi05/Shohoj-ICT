import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConsoleView from '../../components/ConsoleView';
import MemoryView from '../../components/MemoryView';
import Segmented from '../../components/Segmented';
import StepBar from '../../components/StepBar';
import { CHARTS, chartById } from '../../lib/flowcharts';
import { FlowRun } from '../../lib/flow';
import { track } from '../../analytics';

const INK = '#10202F';
const HIGH = '#00A676';
const VISITED = '#7FD1B6';
const IDLE = '#5B6B7B';

function Shape({ n, fill, stroke, sw = 1.5, dash }) {
  const l = n.x - n.w / 2;
  const t = n.y - n.h / 2;
  const common = { fill, stroke, strokeWidth: sw, strokeDasharray: dash };
  if (n.type === 'start' || n.type === 'end') return <rect x={l} y={t} width={n.w} height={n.h} rx={n.h / 2} {...common} />;
  if (n.type === 'process') return <rect x={l} y={t} width={n.w} height={n.h} {...common} />;
  if (n.type === 'io') {
    return <polygon points={`${l + 12},${t} ${l + n.w},${t} ${l + n.w - 12},${t + n.h} ${l},${t + n.h}`} {...common} />;
  }
  return <polygon points={`${n.x},${t} ${l + n.w},${n.y} ${n.x},${t + n.h} ${l},${n.y}`} {...common} />;
}

function Arrow({ id, color }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0L10 5L0 10z" fill={color} />
    </marker>
  );
}

export default function FlowchartRunner() {
  const { t } = useTranslation();
  const [id, setId] = useState('evenOdd');
  const [resets, setResets] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [inputs, setInputs] = useState({});
  const [badName, setBadName] = useState(null);
  const [, bump] = useReducer((x) => x + 1, 0);
  const activeRef = useRef(null);

  const chart = chartById(id);
  const run = useMemo(() => new FlowRun(chart), [chart, resets]);
  const snap = run.snap;

  useEffect(() => {
    setInputs({ ...chart.defaults });
    setBadName(null);
    setPlaying(false);
  }, [chart, resets]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      if (!run.canNext || run.waiting) { setPlaying(false); return; }
      run.step();
      bump();
    }, 800);
    return () => clearInterval(timer);
  }, [playing, run]);

  // keep the active node on screen
  useEffect(() => {
    if (activeRef.current && activeRef.current.scrollIntoView) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [snap]);

  const { visitedNodes, visitedEdges } = useMemo(() => {
    const vn = new Set();
    const ve = new Set();
    for (let k = 0; k <= run.idx; k++) {
      const s = run.hist[k];
      if (s.active) vn.add(s.active);
      if (s.edge !== null && s.edge !== undefined) ve.add(s.edge);
    }
    return { visitedNodes: vn, visitedEdges: ve };
  }, [run, run.idx, run.hist.length]);

  const pick = (v) => {
    setId(v);
    track('code_executed', { language_type: 'Flowchart', program_preset: v });
  };

  const submit = (e) => {
    e.preventDefault();
    const res = run.provideInput(inputs);
    setBadName(res.ok ? null : res.name || null);
    bump();
  };

  const note = snap.error
    ? t(`c.err.${snap.error.code}`, { ...snap.error.params, defaultValue: snap.error.code })
    : t(`f.note.${snap.note.key}`, snap.note.params);

  const edgeState = (e) => (e.id === snap.edge ? 2 : visitedEdges.has(e.id) ? 1 : 0);
  const edges = [...chart.edges].sort((a, b) => edgeState(a) - edgeState(b));

  return (
    <section className="space-y-4">
      <Segmented
        options={CHARTS.map((c) => ({ value: c.id, label: t(`f.chart.${c.id}`) }))}
        value={id}
        onChange={pick}
        label="Algorithm"
      />
      <p className="text-sm text-ink/80">{t(`f.desc.${id}`)}</p>

      <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-white/95 px-4 py-2 backdrop-blur">
        <p className={`rounded-md p-2 text-sm ${snap.error ? 'bg-red-50 text-red-800' : snap.done ? 'bg-signal/15 font-medium' : 'bg-paper'}`} role="status">
          {note}
        </p>
      </div>

      {run.waiting && (
        <form onSubmit={submit} className="space-y-3 rounded-lg border-2 border-signal bg-white p-4">
          <h3 className="font-semibold">{t('f.inputTitle')}</h3>
          <div className="grid grid-cols-3 gap-3">
            {run.waiting.vars.map((v) => (
              <label key={v.name} className="flex flex-col gap-1 text-sm font-medium">
                {v.name}
                <input
                  value={inputs[v.name] ?? ''}
                  onChange={(e) => setInputs((s) => ({ ...s, [v.name]: e.target.value }))}
                  inputMode="numeric"
                  className="w-full rounded-md border border-ink/20 px-3 py-3 font-mono text-base focus:border-signal"
                />
              </label>
            ))}
          </div>
          {badName && <p className="text-sm text-red-700" role="alert">{t('f.badNumber', { name: badName })}</p>}
          <button type="submit" className="h-12 w-full rounded-md bg-signal font-semibold text-white">{t('f.submit')}</button>
        </form>
      )}

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        <div className="rounded-lg border border-line bg-white p-3">
          <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="mx-auto block w-full max-w-md" role="img" aria-label={t('f.chartLabel')}>
            <defs>
              <Arrow id="ah-idle" color={IDLE} />
              <Arrow id="ah-vis" color={VISITED} />
              <Arrow id="ah-act" color={HIGH} />
            </defs>

            {edges.map((e) => {
              const s = edgeState(e);
              return (
                <g key={e.id}>
                  <polyline
                    points={e.pts.map((p) => p.join(',')).join(' ')}
                    fill="none"
                    stroke={s === 2 ? HIGH : s === 1 ? VISITED : IDLE}
                    strokeWidth={s === 2 ? 3 : s === 1 ? 2.5 : 1.5}
                    markerEnd={`url(#${s === 2 ? 'ah-act' : s === 1 ? 'ah-vis' : 'ah-idle'})`}
                  />
                  {e.label && (
                    <text x={e.label.x} y={e.label.y} fontSize="10" fontWeight="700" textAnchor={e.label.anchor} fill="#00805C">{e.label.text}</text>
                  )}
                </g>
              );
            })}

            {chart.nodes.map((n) => {
              const active = snap.active === n.id;
              const isNext = !snap.done && !snap.error && snap.next === n.id;
              const visited = visitedNodes.has(n.id);
              return (
                <g key={n.id} ref={active ? activeRef : null}>
                  {isNext && <Shape n={n} fill="none" stroke="#F2A900" sw={5} dash="5 3" />}
                  <Shape n={n} fill={active ? HIGH : visited ? '#E3F5EE' : '#fff'} stroke={active ? HIGH : INK} />
                  {n.text.map((line, i) => (
                    <text
                      key={i}
                      x={n.x}
                      y={n.y + 4 + (i - (n.text.length - 1) / 2) * 14}
                      textAnchor="middle"
                      fontSize="12"
                      fill={active ? '#fff' : INK}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-4">
          <MemoryView vars={snap.vars} />
          <ConsoleView out={snap.out} waiting={null} />
        </div>
      </div>

      <StepBar
        stepLabel={t('f.stepN', { n: run.idx })}
        canBack={run.canBack}
        canNext={run.canNext}
        playing={playing}
        onBack={() => { setPlaying(false); run.back(); bump(); }}
        onNext={() => { run.step(); bump(); }}
        onPlay={() => { if (playing) setPlaying(false); else if (run.canNext) setPlaying(true); }}
        onEnd={() => {
          setPlaying(false);
          let guard = 0;
          while (run.canNext && !run.waiting && guard++ < 3000) run.step();
          bump();
        }}
        onReset={() => setResets((n) => n + 1)}
      />
    </section>
  );
}