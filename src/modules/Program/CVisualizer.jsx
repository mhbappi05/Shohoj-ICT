import { useEffect, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CodeBox from '../../components/CodeBox';
import ConsoleView from '../../components/ConsoleView';
import MemoryView from '../../components/MemoryView';
import StepBar from '../../components/StepBar';
import { createRun } from '../../lib/cinterp';
import { PRESETS } from '../../lib/cpresets';
import { track } from '../../analytics';

const snip = (label, text, caretAt) => ({ label, text, back: text.length - caretAt });
const KEY_ROWS = (t) => [
  {
    title: t('c.keysSymbols'),
    items: ['{', '}', '(', ')', '[', ']', ';', '=', '+', '-', '*', '/', '%', '<', '>', '!', '&', '|', ',', '"', "'"].map((s) => ({ label: s, text: s })),
  },
  {
    title: t('c.keysFormat'),
    items: ['%d', '%f', '%c', '%s', '%lld', '\\n'].map((s) => ({ label: s, text: s })),
  },
  {
    title: t('c.keysSnippets'),
    items: [
      snip('printf', 'printf("");', 8),
      snip('scanf', 'scanf("%d", &);', 14),
      snip('if', 'if () {\n    \n}\n', 4),
      snip('if-else', 'if () {\n    \n} else {\n    \n}\n', 4),
      snip('for', 'for (i = 0; i < n; i++) {\n    \n}\n', 29),
      snip('while', 'while () {\n    \n}\n', 7),
      snip('int', 'int ;', 4),
      snip('array', 'int a[5];', 6),
    ],
  },
];

function CodeView({ code, line, errorLine }) {
  const lines = code.split('\n');
  const box = useRef(null);
  const mark = useRef(null);

  // keep the active line visible inside the code box (without scrolling the whole page)
  useEffect(() => {
    const b = box.current;
    const l = mark.current;
    if (!b || !l) return;
    const top = l.offsetTop;
    const bottom = top + l.offsetHeight;
    if (top < b.scrollTop + 8) b.scrollTop = Math.max(top - 8, 0);
    else if (bottom > b.scrollTop + b.clientHeight - 8) b.scrollTop = bottom - b.clientHeight + 8;
  }, [line, errorLine]);

  return (
    <div ref={box} className="relative max-h-[38vh] overflow-auto rounded-lg border border-line bg-white py-2 font-mono text-sm lg:max-h-[60vh]">
      <div className="min-w-max">
        {lines.map((text, i) => {
          const n = i + 1;
          const cur = n === line;
          const err = n === errorLine;
          return (
            <div key={n} ref={cur || err ? mark : null} className={`flex ${err ? 'bg-red-100' : cur ? 'bg-signal/15' : ''}`}>
              <span className={`w-9 shrink-0 select-none pr-2 text-right text-xs leading-6 ${cur || err ? 'font-bold text-ink' : 'text-ink/40'}`}>{n}</span>
              <span className={`whitespace-pre border-l-4 pl-2 pr-4 leading-6 ${err ? 'border-red-500' : cur ? 'border-signal' : 'border-transparent'}`}>{text || ' '}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CVisualizer() {
  const { t } = useTranslation();
  const [code, setCode] = useState(PRESETS[0].code);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [mode, setMode] = useState('edit');
  const [compileError, setCompileError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const runRef = useRef(null);
  const [, bump] = useReducer((x) => x + 1, 0);

  const errText = (e) => t(`c.err.${e.code}`, { ...e.params, defaultValue: e.code });

  const begin = (runAll) => {
    const r = createRun(code);
    if (!r.ok) { setCompileError(r.error); return; }
    setCompileError(null);
    runRef.current = r.run;
    if (runAll) r.run.runToEnd();
    setMode('debug');
    setPlaying(false);
    bump();
    track('code_executed', { language_type: 'C_Program', program_preset: presetId });
  };

  // auto-play
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      const r = runRef.current;
      if (!r || !r.canNext || r.waiting) { setPlaying(false); return; }
      r.step();
      bump();
    }, 650);
    return () => clearInterval(id);
  }, [playing]);

  // ---------- edit mode
  if (mode === 'edit' || !runRef.current) {
    return (
      <section className="space-y-4">
        <div>
          <div className="mb-1 text-sm font-medium">{t('c.examples')}</div>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <div className="flex gap-2 whitespace-nowrap">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setCode(p.code); setPresetId(p.id); setCompileError(null); }}
                  className={`min-h-[40px] rounded-full border px-4 text-sm font-medium ${presetId === p.id ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white'}`}
                >
                  {t(`c.preset.${p.id}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-line bg-white p-4">
          <CodeBox
            value={code}
            onChange={(v) => { setCode(v); setPresetId('custom'); setCompileError(null); }}
            keyRows={KEY_ROWS(t)}
            rows={14}
            label={t('c.codeLabel')}
          />
          {compileError && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <b>{t('c.lineN', { line: compileError.line })}:</b> {errText(compileError)}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => begin(false)} className="h-12 flex-1 rounded-md bg-signal font-semibold text-white">
              {t('c.start')}
            </button>
            <button type="button" onClick={() => begin(true)} className="h-12 rounded-md border border-ink/20 bg-white px-5 font-medium">
              {t('c.runAll')}
            </button>
          </div>
          <p className="text-xs text-ink/60">{t('c.limits')}</p>
        </div>
      </section>
    );
  }

  // ---------- debug mode
  const run = runRef.current;
  const snap = run.snap;
  const note = snap.error
    ? `${t('c.lineN', { line: snap.error.line ?? '?' })}: ${errText(snap.error)}`
    : t(`c.note.${snap.note.key}`, snap.note.params);

  const reset = () => {
    const r = createRun(code);
    if (r.ok) runRef.current = r.run;
    setPlaying(false);
    bump();
  };

  return (
    <section className="space-y-4">
      <div className="sticky top-0 z-20 -mx-4 space-y-2 border-b border-line bg-white/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => { setMode('edit'); setPlaying(false); }}
            className="min-h-[40px] rounded-md border border-ink/20 bg-white px-3 text-sm font-medium">
            {t('c.edit')}
          </button>
          {snap.line && <span className="text-xs text-ink/60">{t('c.lineN', { line: snap.line })}</span>}
        </div>
        <p
          className={`rounded-md p-2 text-sm ${snap.error ? 'bg-red-50 text-red-800' : snap.done ? 'bg-signal/15 font-medium' : 'bg-paper'}`}
          role={snap.error ? 'alert' : 'status'}
        >
          {note}
        </p>
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        <CodeView code={code} line={snap.error ? null : snap.line} errorLine={snap.error ? snap.error.line : null} />
        <div className="space-y-4">
          <MemoryView vars={snap.vars} warnings={snap.warnings} />
          <ConsoleView
            out={snap.out}
            waiting={run.waiting}
            onSubmit={(text) => { run.provideInput(text); bump(); }}
          />
        </div>
      </div>

      <StepBar
        stepLabel={t('c.stepN', { n: snap.n })}
        canBack={run.canBack}
        canNext={run.canNext}
        playing={playing}
        onBack={() => { setPlaying(false); run.back(); bump(); }}
        onNext={() => { run.step(); bump(); }}
        onPlay={() => { if (playing) setPlaying(false); else if (run.canNext) setPlaying(true); }}
        onEnd={() => { setPlaying(false); run.runToEnd(); bump(); }}
        onReset={reset}
      />
    </section>
  );
}