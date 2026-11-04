import React from 'react';

const AIAsidePanel = ({ note }) => {
  // Find AI summary block
  const aiSummary = note?.blocks?.find(b => b.type === 'ai_summary');
  const thinkingBlocks = note?.blocks?.filter(b => b.type === 'thinking');
  const relationBlocks = note?.blocks?.filter(b => b.type === 'relations');
  const cardBlocks = note?.blocks?.filter(b => b.type === 'memory_cards');

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-y-auto">
      <div className="p-4 space-y-5">

        {/* AI 状态 */}
        {note?.aiStatus && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#D7EFE4]/50">
            <div className="w-2 h-2 rounded-full bg-[#1A7A57]" />
            <span className="text-xs font-medium text-[#1A7A57]">AI 已解析</span>
          </div>
        )}

        {/* AI 总结 */}
        {aiSummary && (
          <div>
            <h4 className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              AI 总结
            </h4>
            <div className="p-3 rounded-xl bg-white border border-[#ECECEC] text-xs text-[#5a5a5a] leading-relaxed">
              {aiSummary.content}
            </div>
          </div>
        )}

        {/* 思考链 */}
        {thinkingBlocks?.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189"/></svg>
              思考链 ({thinkingBlocks.length})
            </h4>
            {thinkingBlocks.map((tb, i) => (
              <div key={i} className="p-3 rounded-xl bg-[#E9E2F7]/30 border border-[#E9E2F7]/40 text-xs mb-2">
                <p className="font-medium text-[#5B3FA8] mb-1">{tb.question}</p>
                <p className="text-[#7B7B7B] mb-1"><span className="text-[10px] text-[#A0A0A0]">你的回答：</span>{tb.userAnswer?.slice(0, 60)}...</p>
                {tb.aiFeedback && <p className="text-[#1A7A57] mt-1 italic">{tb.aiFeedback}</p>}
              </div>
            ))}
          </div>
        )}

        {/* 记忆卡片 */}
        {cardBlocks?.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
              记忆卡片 ({cardBlocks[0]?.cards?.length || 0})
            </h4>
            <div className="space-y-1.5">
              {cardBlocks[0]?.cards?.slice(0, 3).map((card, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white border border-[#ECECEC] text-xs">
                  <p className="font-medium text-[#1F1F1F] mb-0.5">Q: {card.q.slice(0, 30)}...</p>
                  <p className="text-[#7B7B7B]">A: {card.a.slice(0, 40)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 关联知识 */}
        {relationBlocks?.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757"/></svg>
              关联知识
            </h4>
            <div className="space-y-1.5">
              {relationBlocks[0].items?.map((r, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#ECECEC] text-xs">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${r.label === '前置依赖' ? 'bg-[#E9E2F7] text-[#5B3FA8]' : r.label === '后续延伸' ? 'bg-[#E2EBF7] text-[#2C5282]' : 'bg-[#D7EFE4] text-[#1A7A57]'}`}>{r.label}</span>
                  <span className="truncate text-[#7B7B7B]">{r.target}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AIAsidePanel;
