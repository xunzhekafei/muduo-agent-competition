import React from 'react';

const colorConfig = {
  blue:    { bg: '#E2EBF7', iconBg: '#C7DCF2', text: '#2C5282' },
  green:   { bg: '#D7EFE4', iconBg: '#BFE5D9', text: '#1A7A57' },
  orange:  { bg: '#F7ECD9', iconBg: '#f8c880', text: '#8A5A1A' },
  purple:  { bg: '#E9E2F7', iconBg: '#D3C6F0', text: '#5B3FA8' },
};

const ModeCard = ({ mode, onModeClick, icon }) => {
  const c = colorConfig[mode.color] || colorConfig.blue;

  return (
    <div onClick={() => onModeClick?.(mode)}
      className="card p-5 cursor-pointer card-hover">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200"
        style={{ backgroundColor: c.iconBg }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {icon || <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />}
        </svg>
      </div>
      <h3 className="font-semibold text-[#1F1F1F] mb-1.5">{mode.title}</h3>
      <p className="text-sm text-[#7B7B7B] leading-relaxed line-clamp-2">{mode.description}</p>
    </div>
  );
};

export default ModeCard;
