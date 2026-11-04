import React from 'react';

/**
 * 统一卡片容器：白底 + 细边框 + 可选内边距 / 悬停。
 */
const Card = ({ children, className = '', padded = true, hoverable = false, onClick, ...rest }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl border border-line
      ${padded ? 'p-6' : ''}
      ${hoverable ? 'transition-all hover:border-brand-500/40 hover:shadow-sm cursor-pointer' : ''}
      ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
