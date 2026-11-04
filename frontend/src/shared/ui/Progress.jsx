import React from 'react';

const TONES = {
  brand: 'bg-brand-500',
  success: 'bg-[#10A37F]',
  warning: 'bg-[#F0A040]',
};

const Progress = ({ value = 0, tone = 'brand', className = '' }) => {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full h-2 bg-surface-sunken rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${TONES[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};

export default Progress;
