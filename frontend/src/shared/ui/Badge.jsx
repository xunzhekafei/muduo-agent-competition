import React from 'react';

const TONES = {
  neutral: 'bg-surface-sunken text-ink-600',
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-[#E6F6EE] text-[#1A7A57]',
  warning: 'bg-[#F7ECD9] text-[#8A5A1A]',
  danger: 'bg-[#FCE9E9] text-[#A84441]',
};

const Badge = ({ tone = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TONES[tone]} ${className}`}>
    {children}
  </span>
);

export default Badge;
