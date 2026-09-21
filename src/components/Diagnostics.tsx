import type { Diagnostic } from '../domain/types';

export function Diagnostics({ items }: { items: Diagnostic[] }) {
  if (!items.length) return null;
  return (
    <div className="diagnostics">
      {items.map((item, index) => (
        <div className={`diagnostic ${item.severity}`} key={`${item.tag}-${index}`}>
          <span className="diagnostic-dot" aria-hidden="true" />
          <div>
            <strong>{item.message}</strong>
            {item.technicalMessage && <small>{item.technicalMessage}</small>}
          </div>
          <code>{item.tag}</code>
        </div>
      ))}
    </div>
  );
}
