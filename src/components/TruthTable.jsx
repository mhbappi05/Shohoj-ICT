export default function TruthTable({ inputNames, outputNames, rows, active }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-center font-mono text-sm">
          <thead>
            <tr className="text-ink/70">
              {inputNames.map((n) => (
                <th key={n} className="px-2 py-2 font-medium">{n}</th>
              ))}
              {outputNames.map((n, i) => (
                <th key={n} className={`px-2 py-2 font-medium ${i === 0 ? 'border-l-2 border-line' : ''}`}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, k) => (
              <tr key={k} className={`border-t border-line ${k === active ? 'bg-signal/10 font-bold' : ''}`}>
                {r.ins.map((v, i) => (
                  <td key={i} className="px-2 py-2">{v}</td>
                ))}
                {r.outs.map((v, i) => (
                  <td key={i} className={`px-2 py-2 ${i === 0 ? 'border-l-2 border-line' : ''} ${v ? 'text-signal' : ''}`}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }