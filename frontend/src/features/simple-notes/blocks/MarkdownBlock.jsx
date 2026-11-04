import React, { useState } from 'react';
import { renderMarkdown } from '../../../shared/renderMarkdown';

const MarkdownBlock = ({ content, onChange, onDelete, onAddBlock }) => {
  const [text, setText] = useState(content || '');

  const handleChange = (e) => {
    setText(e.target.value);
    onChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onAddBlock('markdown', '');
    }
  };

  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 hover:border-[#10A37F]/50 transition-all duration-200">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-sm text-[#6B7280] font-medium">Markdown</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#F3F4F6] rounded-lg p-0.5">
            <button
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!showPreview ? 'bg-white text-[#374151] shadow-sm' : 'text-[#6B7280]'}`}
            >
              编辑
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${showPreview ? 'bg-white text-[#374151] shadow-sm' : 'text-[#6B7280]'}`}
            >
              预览
            </button>
          </div>
        <button
          onClick={onDelete}
          className="opacity-0 hover:opacity-100 p-2 rounded-lg hover:bg-[#FEF2F2] text-[#9CA3AF] hover:text-[#DC2626] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        </div>
      </div>

      {showPreview ? (
        <div 
          className="w-full min-h-[80px] p-4 rounded-lg bg-[#FAFAFA] text-sm text-[#374151] whitespace-pre-wrap leading-relaxed"
          dangerouslySetInnerHTML={renderMarkdown(text)}
        />
      ) : (
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="输入 Markdown 内容...（Shift+Enter 添加新块）"
          className="w-full min-h-[120px] p-4 rounded-lg bg-[#FAFAFA] border-none resize-none focus:outline-none focus:ring-2 focus:ring-[#10A37F]/40 text-[#374151] text-sm font-mono placeholder:text-[#9CA3AF] leading-relaxed"
        />
      )}
    </div>
  );
};

export default MarkdownBlock;