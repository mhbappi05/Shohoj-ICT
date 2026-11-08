import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './components/LanguageToggle';
import Converter from './modules/NumberSystems/Converter';
import BinaryArithmetic from './modules/NumberSystems/BinaryArithmetic';
import TwosComplement from './modules/NumberSystems/TwosComplement';
import LogicGates from './modules/Logic/LogicGates';
import UniversalGates from './modules/Logic/UniversalGates';
import Adders from './modules/Logic/Adders';
import EncoderDecoder from './modules/Logic/EncoderDecoder';
import { track } from './analytics';

const MODULES = [
  {
    key: 'numbers', name: 'Number Systems', ready: true,
    tabs: [
      { key: 'converter', topic: 'Base Converter', render: () => <Converter /> },
      { key: 'add', topic: 'Binary Addition', usesBits: true, render: (b) => <BinaryArithmetic key="add" bits={b} op="add" /> },
      { key: 'sub', topic: 'Binary Subtraction', usesBits: true, render: (b) => <BinaryArithmetic key="sub" bits={b} op="sub" /> },
      { key: 'twos', topic: "2's Complement", usesBits: true, render: (b) => <TwosComplement bits={b} /> },
    ],
  },
  {
    key: 'logic', name: 'Logic Gates', ready: true,
    tabs: [
      { key: 'gates', topic: 'Gates', render: () => <LogicGates /> },
      { key: 'universal', topic: 'Universal Gates', render: () => <UniversalGates /> },
      { key: 'adders', topic: 'Adders', render: () => <Adders /> },
      { key: 'encdec', topic: 'Encoder & Decoder', render: () => <EncoderDecoder /> },
    ],
  },
  { key: 'web', ready: false },
  { key: 'programming', ready: false },
  { key: 'databases', ready: false },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const [moduleKey, setModuleKey] = useState('numbers');
  const [tabKey, setTabKey] = useState('converter');
  const [bits, setBits] = useState(8);

  const mod = MODULES.find((m) => m.key === moduleKey);
  const current = mod.tabs.find((x) => x.key === tabKey);

  const selectModule = (m) => {
    setModuleKey(m.key);
    setTabKey(m.tabs[0].key);
  };

  useEffect(() => {
    track('module_opened', {
      module_name: mod.name,
      topic: current.topic,
      language: i18n.resolvedLanguage.toUpperCase(),
    });
  }, [moduleKey, tabKey]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <header className="flex items-center justify-between gap-3 py-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">{t('app.title')}</h1>
          <p className="text-sm text-ink/70">{t('app.tagline')}</p>
        </div>
        <LanguageToggle />
      </header>

      <nav className="no-scrollbar -mx-4 mb-4 overflow-x-auto px-4" aria-label="Chapters">
        <div className="flex gap-2 whitespace-nowrap">
          {MODULES.map((m) =>
            m.ready ? (
              <button
                key={m.key}
                onClick={() => selectModule(m)}
                aria-current={m.key === moduleKey ? 'page' : undefined}
                className={`min-h-[40px] rounded-full border px-4 text-sm font-medium transition-colors ${
                  m.key === moduleKey ? 'border-signal bg-signal text-white' : 'border-line bg-white text-ink'
                }`}
              >
                {t(`nav.${m.key}`)}
              </button>
            ) : (
              <span
                key={m.key}
                title={t('nav.soon')}
                aria-disabled="true"
                className="flex min-h-[40px] items-center rounded-full border border-line bg-white/70 px-4 text-sm text-ink/50"
              >
                {t(`nav.${m.key}`)}
              </span>
            )
          )}
        </div>
      </nav>

      <div className="no-scrollbar -mx-4 mb-4 overflow-x-auto px-4">
        <div className="flex gap-5 whitespace-nowrap border-b border-line" role="tablist">
          {mod.tabs.map((x) => (
            <button
              key={x.key}
              role="tab"
              aria-selected={tabKey === x.key}
              onClick={() => setTabKey(x.key)}
              className={`-mb-px min-h-[44px] border-b-2 text-base font-medium transition-colors ${
                tabKey === x.key ? 'border-signal text-ink' : 'border-transparent text-ink/60 hover:text-ink'
              }`}
            >
              {t(`tabs.${x.key}`)}
            </button>
          ))}
        </div>
      </div>

      {current.usesBits && (
        <div className="mb-4 flex items-center justify-end gap-2 text-sm font-medium">
          {t('twos.bits')}
          <div className="inline-flex overflow-hidden rounded-md border border-ink/20" role="group">
            {[8, 16].map((b) => (
              <button
                key={b}
                onClick={() => setBits(b)}
                aria-pressed={bits === b}
                className={`min-h-[40px] px-4 ${bits === b ? 'bg-ink text-white' : 'bg-white'}`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {current.render(bits)}
    </div>
  );
}