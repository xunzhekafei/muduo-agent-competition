import React, { useState, useCallback } from 'react';
import { completeNoteReview } from '../../api/memory';

const CARD_TYPE_STYLES = {
  '概念定义': 'bg-[#E2EBF7] text-[#2C5282]',
  '填空卡片': 'bg-[#D7EFE4] text-[#1A7A57]',
  '辨析卡片': 'bg-[#E9E2F7] text-[#5B3FA8]',
  '翻转问答': 'bg-[#DDF0EA] text-[#0B7A5E]',
};

const MemoryReview = ({ cards, noteId, onExit }) => {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [viewed, setViewed] = useState(new Set());
  const [completing, setCompleting] = useState(false);

  const card = cards[index];
  if (!card) return null;

  const allViewed = viewed.size >= cards.length;

  const markViewed = useCallback(() => {
    setViewed((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, [index]);

  // 上一张：看答案→翻回问题 | 看问题→上一题答案
  const goPrev = () => {
    if (flipped) {
      setFlipped(false);
    } else if (index > 0) {
      setIndex(index - 1);
      setFlipped(true);
      markViewed();
    }
  };

  // 下一张：看问题→翻到答案 | 看答案→下一题问题
  const goNext = () => {
    if (!flipped) {
      setFlipped(true);
      markViewed();
    } else if (index < cards.length - 1) {
      setIndex(index + 1);
      setFlipped(false);
    }
  };

  const handleFlip = () => {
    if (!flipped) {
      markViewed();
    }
    setFlipped(!flipped);
  };

  const handleExit = async () => {
    if (allViewed && noteId) {
      setCompleting(true);
      try {
        await completeNoteReview(noteId);
      } catch {
        // 后端不可用也正常退出
      }
      setCompleting(false);
    }
    onExit();
  };

  const typeStyle = CARD_TYPE_STYLES[card.type] || CARD_TYPE_STYLES['概念定义'];

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* top bar */}
      <div className="border-b border-[#ECECEC] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-[#1F1F1F]">沉浸式复习</h2>
            <span className="text-[10px] text-[#A0A0A0]">已看 {viewed.size}/{cards.length}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#7B7B7B]">
            <span>{index + 1}/{cards.length}</span>
            <button
              onClick={handleExit}
              disabled={completing}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ backgroundColor: '#10A37F', color: '#1F1F1F' }}
            >
              {completing ? '保存中...' : allViewed ? '完成复习' : '退出'}
            </button>
          </div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((index + 1) / cards.length) * 100}%`, backgroundColor: '#10A37F' }} />
        </div>
      </div>

      {/* card area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-xl w-full" style={{ minHeight: '360px', perspective: '1000px' }}>
          <div
            onClick={handleFlip}
            className="relative w-full rounded-3xl cursor-pointer border border-[#ECECEC]"
            style={{ minHeight: '360px', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.5s ease' }}
          >
            {/* front */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-3xl" style={{ backfaceVisibility: 'hidden' }}>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold mb-4 ${typeStyle}`}>{card.type}</span>
              <h3 className="text-2xl font-bold text-[#1F1F1F] text-center leading-relaxed">{card.front || card.content}</h3>
              <p className="text-sm text-[#A0A0A0] mt-6">点击卡片查看答案</p>
            </div>
            {/* back */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-3xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: '#f5faf3' }}>
              <span className="px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-[#D7EFE4] text-[#1A7A57]">答案</span>
              <p className="text-xl font-semibold text-[#1A7A57] text-center leading-relaxed">{card.back || card.answer}</p>
              <p className="text-xs text-[#A0A0A0] mt-6">点击翻回问题</p>
            </div>
          </div>
        </div>
      </div>

      {/* navigation bar */}
      <div className="border-t border-[#ECECEC] p-4">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="px-8 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#f0f1f3', color: '#5a5f66' }}
          >
            上一张
          </button>
          <button
            onClick={handleFlip}
            className="px-10 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
            style={{ backgroundColor: '#10A37F', color: '#1F1F1F' }}
          >
            {flipped ? '隐藏答案' : '查看答案'}
          </button>
          <button
            onClick={goNext}
            disabled={index === cards.length - 1 && flipped}
            className="px-8 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#f0f1f3', color: '#5a5f66' }}
          >
            下一张
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoryReview;
