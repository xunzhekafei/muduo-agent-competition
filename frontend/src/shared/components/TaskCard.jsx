import React from 'react';

const TaskCard = ({ task, onTaskStart }) => {
  const priorityDot = {
    high:   '#e74c3c',
    medium: '#f0a040',
    low:    '#6aaf82',
  };
  const dot = priorityDot[task.priority] || priorityDot.medium;

  return (
    <div
      className="card p-5 cursor-pointer card-hover group"
      onClick={() => onTaskStart?.(task)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
          <span className="text-xs font-medium text-[#7B7B7B]">{task.courseName}</span>
        </div>
        <span className="text-xs text-[#A0A0A0] font-medium">{task.durationMinutes} min</span>
      </div>

      <h3 className="font-semibold text-[#1F1F1F] mb-1 line-clamp-2 leading-snug">{task.title}</h3>

      {task.countLabel && (
        <span className="badge tag-neon mt-2">{task.countLabel}</span>
      )}

      <div className="mt-4 pt-3 border-t border-black/[0.04] flex items-center justify-between">
        <span className="text-xs text-[#A0A0A0]">
          {task.priority === 'high' ? '优先处理' : task.priority === 'medium' ? '今日任务' : '可稍后'}
        </span>
        <span className="text-xs font-semibold text-[#10A37F] opacity-0 group-hover:opacity-100 transition-opacity">开始 →</span>
      </div>
    </div>
  );
};

export default TaskCard;
