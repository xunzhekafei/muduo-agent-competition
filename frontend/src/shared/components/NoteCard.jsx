import React from 'react';

const modeConfig = {
  quick:    { bg: 'bg-brand-50', text: 'text-brand-600', label: '速记' },
  think:    { bg: 'bg-sage-50', text: 'text-sage-600', label: '思考' },
  memory:   { bg: 'bg-amber-50', text: 'text-amber-600', label: '记忆' },
  feynman:  { bg: 'bg-mauve-50', text: 'text-mauve-600', label: '费曼' },
};

const NoteCard = ({ title, content, date, mode, onClick }) => {
  const m = modeConfig[mode] || modeConfig.quick;

  return (
    <div
      className="card p-5 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-ink-primary">{title}</h3>
        <span className={`badge ${m.bg} ${m.text}`}>{m.label}</span>
      </div>
      <p className="text-sm text-ink-secondary line-clamp-2 leading-relaxed mb-3">{content}</p>
      <p className="text-xs text-ink-tertiary">{date}</p>
    </div>
  );
};

export default NoteCard;
