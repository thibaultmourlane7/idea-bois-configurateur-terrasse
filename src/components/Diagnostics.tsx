import type { Diagnostic } from '../domain/types';

export function Diagnostics({ items }: { items: Diagnostic[] }) {
  if (!items.length) return null;
  return <div className="diagnostics">{items.map((d, i) => (
    <div key={`${d.tag}-${i}`} className={`diagnostic ${d.severity}`}>
      <strong>{d.severity.toUpperCase()}</strong><span>{d.message}</span><code>{d.tag}</code>
    </div>
  ))}</div>;
}
