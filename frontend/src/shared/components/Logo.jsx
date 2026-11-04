import React from 'react';

// Logo: 圆角方形 + 纯色绿底白图 + 树木与书本简笔画
const LogoIcon = ({ size = 44 }) => (
  <div
    className="flex items-center justify-center flex-shrink-0"
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.22,
      backgroundColor: '#10A37F',
      boxShadow: '0 6px 24px rgba(16,163,127,0.25)',
    }}
  >
    <svg
      width={size * 0.64}
      height={size * 0.64}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ===== 打开的书本（底部，放大） ===== */}
      {/* 左页 */}
      <path d="M5 42 L5 30 Q12 27 24 28.5 L24 39 Q12 37.5 5 42Z" fill="white" />
      {/* 右页 */}
      <path d="M43 42 L43 30 Q36 27 24 28.5 L24 39 Q36 37.5 43 42Z" fill="white" opacity="0.85" />
      {/* 左页文字线 */}
      <line x1="9" y1="33.5" x2="22.5" y2="33" stroke="#10A37F" strokeWidth="1" strokeLinecap="round" />
      <line x1="9" y1="36.5" x2="22.5" y2="36" stroke="#10A37F" strokeWidth="1" strokeLinecap="round" />
      {/* 右页文字线 */}
      <line x1="25.5" y1="33" x2="39" y2="33.5" stroke="#10A37F" strokeWidth="1" strokeLinecap="round" />
      <line x1="25.5" y1="36" x2="39" y2="36.5" stroke="#10A37F" strokeWidth="1" strokeLinecap="round" />

      {/* ===== 树木（占据中部，三层放大树冠） ===== */}
      {/* 树干 */}
      <rect x="22" y="19" width="4" height="12" rx="1.5" fill="white" />

      {/* 底层树冠 — 最宽 */}
      <path d="M7 22 L24 7 L41 22 Q35 17 30 19 Q24 15 18 19 Q13 17 7 22Z" fill="white" />

      {/* 中层树冠 */}
      <path d="M11 17 L24 4 L37 17 Q32 13 28 14.5 Q24 11 20 14.5 Q16 13 11 17Z" fill="white" opacity="0.92" />

      {/* 顶层树冠 — 最尖 */}
      <path d="M15 11 L24 1 L33 11 Q29 8 26.5 9 Q24 6.5 21.5 9 Q19 8 15 11Z" fill="white" opacity="0.96" />
    </svg>
  </div>
);

export const LogoText = ({ compact }) => (
  <div className={compact ? 'leading-tight' : ''}>
    <h1 className={`font-bold text-[#1F1F1F] tracking-tight ${compact ? 'text-base' : 'text-lg'}`}>
      木铎笔记
    </h1>
    {!compact && (
      <p className="text-[11px] text-[#7B7B7B] leading-tight font-medium">抗惰性知识内化引擎</p>
    )}
  </div>
);

const Logo = ({ compact, iconSize = 44 }) => (
  <div className="flex items-center gap-3">
    <LogoIcon size={iconSize} />
    <LogoText compact={compact} />
  </div>
);

export { LogoIcon };
export default Logo;
