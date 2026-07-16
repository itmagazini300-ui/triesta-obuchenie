import { Icon } from './icons.jsx';

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
}

export function toneForPercent(p) {
  if (p >= 100) return 'g';
  if (p >= 40) return 'a';
  if (p > 0) return 'a';
  return 'n';
}

export function Ring({ percent = 0, size = 96, thickness = 13, label }) {
  const color = percent >= 100 ? 'var(--green)' : 'var(--orange)';
  return (
    <div className="ring" style={{
      width: size, height: size, flex: 'none',
      background: `conic-gradient(${color} 0 ${percent}%, #EFEAE6 ${percent}% 100%)`,
    }}>
      <div className="hole" style={{ width: size - thickness * 2, height: size - thickness * 2 }}>
        <b style={{ fontSize: size * 0.26 }}>{percent}%</b>
        {label && <small style={{ fontSize: size * 0.1 }}>{label}</small>}
      </div>
    </div>
  );
}

export function Bar({ percent = 0, tone }) {
  const t = tone || toneForPercent(percent);
  return (
    <div className="track"><div className={'fill ' + t} style={{ width: Math.max(percent, percent > 0 ? 2 : 0) + '%' }} /></div>
  );
}

const STATUS = {
  completed: { cls: 'g', label: 'Завършен' },
  in_progress: { cls: 'a', label: 'В процес' },
  not_started: { cls: 'n', label: 'Не е започнат' },
};
export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.not_started;
  return <span className={'pill ' + s.cls}>{s.label}</span>;
}

export function Loading({ text = 'Зареждане…' }) {
  return <div className="center-msg"><div className="spin" />{text}</div>;
}

export function Brand({ dark }) {
  return (
    <div className="brand">
      <span className="n300 ac">300</span>
      <span className="nm">ТРИСТА<small>АКАДЕМИЯ ЗА ОБУЧЕНИЯ</small></span>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal" style={wide ? { maxWidth: 620 } : undefined} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Затвори"><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export const ICON_CHOICES = ['store', 'box', 'receipt', 'headset', 'shield', 'clip', 'book', 'grad', 'medal', 'trophy', 'monitor', 'users'];

export function IconPicker({ value, onChange }) {
  return (
    <div className="icon-picker">
      {ICON_CHOICES.map((n) => (
        <button type="button" key={n} className={'icon-choice' + (value === n ? ' sel' : '')} onClick={() => onChange(n)} aria-label={n}>
          <Icon name={n} size={22} />
        </button>
      ))}
    </div>
  );
}

export { Icon };
