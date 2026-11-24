// Generic table for any database view (".table-box > .table" from the design).

function prettyHeader(col) {
  return col
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatValue(col, value) {
  if (value === null || value === undefined) return '—';
  if (col === 'accuracy_percentage') return `${Number(value).toFixed(2)}%`;
  return String(value);
}

const NUMERIC = /(_id$|_score$|^total_|^correct_|_percentage$)/;

export default function DataTable({ columns, rows, isMe, emptyMessage = 'No rows.' }) {
  return (
    <div className="table-box">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className={NUMERIC.test(c) ? 'num' : undefined}>
                {prettyHeader(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty">{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className={isMe?.(row) ? 'is-me' : undefined}>
                {columns.map((c) => (
                  <td key={c} className={NUMERIC.test(c) ? 'num' : undefined}>
                    {formatValue(c, row[c])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
