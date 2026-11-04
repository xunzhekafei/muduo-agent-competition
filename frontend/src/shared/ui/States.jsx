import React from 'react';
import Icon from './Icon';
import Button from './Button';

export const Loading = ({ className = '' }) => (
  <div className={`flex items-center justify-center py-16 ${className}`}>
    <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
  </div>
);

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-surface-sunken ${className}`} />
);

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16">
    {icon && (
      <div className="w-14 h-14 rounded-2xl bg-surface-sunken flex items-center justify-center text-ink-400 mb-4">
        <Icon d={icon} className="h-6 w-6" />
      </div>
    )}
    {title && <h3 className="text-base font-semibold text-ink-900">{title}</h3>}
    {description && <p className="text-sm text-ink-500 mt-1 max-w-sm leading-relaxed">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ message = '加载失败', onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
    <p className="text-sm text-ink-500">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        重试
      </Button>
    )}
  </div>
);
