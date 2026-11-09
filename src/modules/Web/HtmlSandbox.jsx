import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CodeBox from '../../components/CodeBox';
import Segmented from '../../components/Segmented';
import DomTree from './DomTree';
import { parseHtml } from '../../lib/htmlDom';
import { track } from '../../analytics';

const SAMPLE = `<h1>My first page</h1>
<p>This is a <b>paragraph</b> with a <a href="https://example.com">link</a>.</p>
<ul>
  <li>HTML</li>
  <li>CSS</li>
</ul>
`;

const SNIPPETS = {
  format: `<h1>Heading 1</h1>
<h2>Heading 2</h2>
<p>Normal, <b>bold</b>, <i>italic</i>, <u>underline</u>, H<sub>2</sub>O, x<sup>2</sup></p>
`,
  list: `<ul>
  <li>Apple</li>
  <li>Mango</li>
</ul>
<ol>
  <li>First</li>
  <li>Second</li>
</ol>
`,
  link: `<a href="https://example.com">Visit example.com</a>
`,
  image: `<img src="https://placehold.co/200x100" alt="Sample image">
`,
  table: `<table border="1" cellpadding="6">
  <tr>
    <th>Name</th>
    <th>Marks</th>
  </tr>
  <tr>
    <td>Rahim</td>
    <td>85</td>
  </tr>
  <tr>
    <td>Nusrat</td>
    <td>92</td>
  </tr>
</table>
`,
  form: `<form>
  <label>Name: <input type="text" name="name"></label><br>
  <label>Email: <input type="email" name="email"></label><br>
  Gender:
  <input type="radio" name="gender" value="m"> Male
  <input type="radio" name="gender" value="f"> Female<br>
  <select name="dept">
    <option>Science</option>
    <option>Humanities</option>
  </select><br>
  <input type="submit" value="Submit">
</form>
`,
};

const pair = (tag) => ({ label: tag, text: `<${tag}></${tag}>`, back: tag.length + 3 });
const TAGS = [
  pair('h1'), pair('p'), pair('b'), pair('i'),
  { label: 'a', text: '<a href=""></a>', back: 6 },
  { label: 'img', text: '<img src="" alt="">', back: 9 },
  pair('ul'), pair('li'), pair('table'), pair('tr'), pair('td'), pair('div'),
  { label: 'br', text: '<br>' },
];
const SYMBOLS = ['<', '>', '</', '/', '=', '"'].map((s) => ({ label: s, text: s }));

export default function HtmlSandbox() {
  const { t } = useTranslation();
  const [code, setCode] = useState(SAMPLE);
  const [shown, setShown] = useState(SAMPLE);
  const [pane, setPane] = useState('code');

  // Re-parse shortly after the user stops typing
  useEffect(() => {
    const id = setTimeout(() => setShown(code), 300);
    return () => clearTimeout(id);
  }, [code]);

  const parsed = useMemo(() => parseHtml(shown), [shown]);

  const keyRows = [
    { title: t('web.symbolsTitle'), items: SYMBOLS },
    { title: t('web.tagsTitle'), items: TAGS },
    {
      title: t('web.snippetsTitle'),
      items: Object.keys(SNIPPETS).map((k) => ({ label: t(`web.snip.${k}`), text: SNIPPETS[k], snippet: k })),
    },
  ];

  const onKey = (item) => {
    if (item.snippet) track('code_executed', { language_type: 'HTML', program_preset: item.snippet });
  };

  const show = (name) => `${pane === name ? '' : 'hidden'} lg:block`;

  return (
    <section className="space-y-4">
      <div className="lg:hidden">
        <Segmented
          options={[
            { value: 'code', label: t('web.panes.code') },
            { value: 'preview', label: t('web.panes.preview') },
            { value: 'tree', label: t('web.panes.tree') },
          ]}
          value={pane}
          onChange={setPane}
          label="Panes"
        />
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        <div className={`${show('code')} space-y-3 rounded-lg border border-line bg-white p-4`}>
          <CodeBox
            value={code}
            onChange={setCode}
            keyRows={keyRows}
            rows={12}
            label={t('web.codeLabel')}
            onKey={onKey}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPane('preview')}
              className="h-11 flex-1 rounded-md bg-signal px-4 font-semibold text-white lg:hidden">
              {t('web.seeResult')}
            </button>
            <button type="button" onClick={() => setCode(SAMPLE)}
              className="h-11 rounded-md border border-ink/20 bg-white px-4 text-sm font-medium">
              {t('web.reset')}
            </button>
            <button type="button" onClick={() => setCode('')}
              className="h-11 rounded-md border border-ink/20 bg-white px-4 text-sm font-medium">
              {t('web.clear')}
            </button>
          </div>
        </div>

        <div className={`${show('preview')} space-y-2 rounded-lg border border-line bg-white p-4`}>
          <iframe
            title={t('web.previewTitle')}
            sandbox=""
            srcDoc={parsed.srcDoc}
            className="h-[55vh] w-full rounded-md border border-line bg-white lg:h-[460px]"
          />
          <p className="text-xs text-ink/60">{t('web.previewNote')}</p>
        </div>

        <div className={`${show('tree')} lg:col-span-2`}>
          <DomTree model={parsed.model} truncated={parsed.truncated} />
        </div>
      </div>
    </section>
  );
}