import React, { useState } from 'react';
import { renderMarkdown } from '../../../shared/renderMarkdown';

const AIGenerationBlock = ({ content, onChange, onDelete, onConvertToMarkdown }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState(content || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const generateContent = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const { apiRequest } = await import('../../../api/client');
      const res = await apiRequest('/api/v1/notes/ai-generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const content = res?.data?.content || '';
      setResponse(content);
      onChange(content);
    } catch {
      setResponse('AI 生成失败，请重试');
    }
    setIsGenerating(false);
  };

  const handleConvert = () => {
    onConvertToMarkdown(response);
  };

  return (
    <div className="bg-gradient-to-r from-[#10A37F]/10 to-[#E9E2F7]/10 rounded-xl border border-[#10A37F]/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-[#6B7280] font-medium">AI 生成</div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleConvert}
            disabled={!response}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            转为 Markdown 代码块
          </button>
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

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入你想让 AI 生成的内容..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-sm outline-none focus:ring-2 focus:ring-[#10A37F]/40 focus:border-transparent"
          disabled={isGenerating}
        />
        <button
          onClick={generateContent}
          disabled={isGenerating || !prompt.trim()}
          className="px-5 py-2.5 rounded-xl bg-[#10A37F] text-[#1F1F1F] text-sm font-medium hover:bg-[#B8E65A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-[#1F1F1F] border-t-transparent animate-spin" />
              生成中
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              生成
            </>
          )}
        </button>
      </div>

      {response && (
        <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9CA3AF] font-medium">AI 生成内容</span>
            <button onClick={() => setShowRaw(!showRaw)} className="text-xs text-[#7B7B7B] hover:text-[#1F1F1F] px-2 py-0.5 rounded-lg hover:bg-[#F3F4F6] transition-colors">
              {showRaw ? '预览' : '源码'}
            </button>
          </div>
          {showRaw ? (
            <pre className="text-sm text-[#374151] whitespace-pre-wrap max-h-[200px] overflow-y-auto font-mono leading-relaxed">{response}</pre>
          ) : (
            <div className="text-sm text-[#374151] leading-relaxed max-h-[200px] overflow-y-auto"
              dangerouslySetInnerHTML={renderMarkdown(response)} />
          )}
        </div>
      )}
    </div>
  );
};

export default AIGenerationBlock;
