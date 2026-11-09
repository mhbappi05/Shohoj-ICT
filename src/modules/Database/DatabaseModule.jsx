import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createDb, readSchema } from '../../lib/db';
import SqlPlayground from './SqlPlayground';
import SchemaView from './SchemaView';

const START_SQL = 'SELECT name, age\nFROM Students\nWHERE age > 17;';

export default function DatabaseModule({ tab }) {
  const { t } = useTranslation();
  const dbRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0); // bumps whenever the data or tables change
  const [resets, setResets] = useState(0);
  const [sql, setSql] = useState(START_SQL);

  useEffect(() => {
    let alive = true;
    createDb()
      .then((db) => {
        if (!alive) { db.close(); return; }
        dbRef.current = db;
        setStatus('ready');
        setVersion((v) => v + 1);
      })
      .catch((e) => {
        if (alive) { setError(String((e && e.message) || e)); setStatus('error'); }
      });
    return () => {
      alive = false;
      if (dbRef.current) { dbRef.current.close(); dbRef.current = null; }
    };
  }, []);

  const schema = useMemo(
    () => (status === 'ready' && dbRef.current ? readSchema(dbRef.current) : []),
    [status, version]
  );

  const changed = () => setVersion((v) => v + 1);
  const reset = async () => {
    const fresh = await createDb();
    if (dbRef.current) dbRef.current.close();
    dbRef.current = fresh;
    setResets((n) => n + 1);
    changed();
  };

  if (status === 'loading') return <p className="p-4 text-sm text-ink/70">{t('db.loading')}</p>;
  if (status === 'error') {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        {t('db.loadError')} {error}
      </p>
    );
  }

  return tab === 'sql' ? (
    <SqlPlayground
      key={resets}
      db={dbRef.current}
      schema={schema}
      sql={sql}
      setSql={setSql}
      onChanged={changed}
      onReset={reset}
    />
  ) : (
    <SchemaView db={dbRef.current} schema={schema} version={version} />
  );
}