import React from 'react';

/**
 * SVG 图标原语：统一线宽、端点、圆角。
 * d 可为单个 path 字符串，或数组（多路径图标，如齿轮）。
 */
const Icon = ({ d, className = 'h-5 w-5', strokeWidth = 1.7, ...rest }) => {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
      {...rest}
    >
      {paths.map((p, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={p} />
      ))}
    </svg>
  );
};

export default Icon;
