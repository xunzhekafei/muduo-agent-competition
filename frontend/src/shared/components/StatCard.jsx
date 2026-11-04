import React from 'react';

const colorConfig = {
  blue:    { bg: 'bg-brand-50', text: 'text-brand-700', bar: 'bg-brand-500' },
  green:   { bg: 'bg-sage-50', text: 'text-sage-700', bar: 'bg-sage-500' },
  orange:  { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  purple:  { bg: 'bg-mauve-50', text: 'text-mauve-700', bar: 'bg-mauve-500' },
  red:     { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' },
};

const StatCard = ({ icon, title, value, subtitle, progress, color = 'blue' }) => {
  const c = colorConfig[color] || colorConfig.blue;

  return (
    <div className={`${c.bg} rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${c.text} opacity-80`}>{icon}</div>
        {subtitle && <span className="text-xs font-medium text-ink-tertiary">{subtitle}</span>}
      </div>

      <p className="text-sm text-ink-secondary mb-1">{title}</p>
      <p className={`text-[28px] font-bold ${c.text} tracking-tight`}>{value}</p>

      {progress !== undefined && (
        <div className="mt-3 progress-bar">
          <div className={`progress-fill ${c.bar}`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
