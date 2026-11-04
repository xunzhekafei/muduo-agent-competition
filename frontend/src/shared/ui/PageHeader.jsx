import React from 'react';
import Icon from './Icon';

/**
 * 模块身份头：图标 + 名称 + 一句话说明 + 主操作。
 * 每个工具页顶部都用它，构成「同一套模块」的视觉锚点。
 */
const PageHeader = ({ icon, title, description, actions }) => (
  <div className="flex items-start justify-between gap-4 mb-6">
    <div className="flex items-center gap-3.5 min-w-0">
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-surface-sunken flex items-center justify-center shrink-0 text-ink-700">
          <Icon d={icon} className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-ink-900 leading-tight">{title}</h1>
        {description && <p className="text-sm text-ink-500 mt-0.5">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
