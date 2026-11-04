import React from 'react';

const colorMap = {
  lilac: { bg: '#E9E2F7', label: 'text-[#5B3FA8]', value: 'text-[#5B3FA8]' },
  sky:   { bg: '#E2EBF7', label: 'text-[#2C5282]', value: 'text-[#1a3a6a]' },
  mint:  { bg: '#D7EFE4', label: 'text-[#1A7A57]', value: 'text-[#1A7A57]' },
  neon:  { bg: '#10A37F', label: 'text-[#0B7A5E]', value: 'text-[#0B7A5E]' },
};

const StatCardLarge = ({ label, value, icon, color = 'sky' }) => {
  const c = colorMap[color] || colorMap.sky;
  return (
    <div className="rounded-3xl p-6 flex flex-col justify-between h-full" style={{ backgroundColor: c.bg }}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-semibold ${c.label}`}>{label}</span>
        <div className="w-9 h-9 rounded-2xl bg-white/60 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className={`text-[36px] font-bold tracking-tight leading-none ${c.value}`}>{value}</p>
    </div>
  );
};

export default StatCardLarge;
