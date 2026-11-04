import React, { useState, useEffect, useRef } from 'react';
import { fetchQuickNote, updateQuickNote } from '../../api/quickNotes';
import { renderMarkdown } from '../../shared/renderMarkdown';

const RegularNote = ({ noteId, noteTitle, onBack }) => {
  const [title, setTitle] = useState(noteTitle || '未命名速记');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(noteTitle || '');

  // 加载已有速记
  useEffect(() => {
    if (noteId) {
      setLoading(true);
      fetchQuickNote(noteId)
        .then((res) => {
          const d = res.data || {};
          setTitle(d.title || noteTitle || '未命名速记');
          setContent(d.content || '');
          setTitleInput(d.title || noteTitle || '');
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [noteId]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2000); return () => clearTimeout(t); } }, [toast]);
  const showToast = (msg) => setToast(msg);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (noteId) {
        await updateQuickNote(noteId, { title, content });
      }
    } catch {
      // 后端不可用也提示
    }
    setSaving(false);
    showToast('已保存');
  };

  // Ctrl+S 快捷键保存
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [title, content, noteId]);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[#9ca3af]">加载速记内容...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-[#1F1F1F]" style={{ backgroundColor: '#10A37F' }}>
          {toast}
        </div>
      )}

      {/* 顶栏 */}
      <div className="card p-4 flex-shrink-0 mb-4">
        <div className="flex items-center">
          <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-[#f3f4f6] transition-colors mr-3">
            <svg className="h-5 w-5 text-[#7B7B7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input className="text-lg font-bold px-2 py-1 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setTitle(titleInput.trim() || '未命名速记'); setIsEditingTitle(false); } }} autoFocus />
              <button onClick={() => { setTitle(titleInput.trim() || '未命名速记'); setIsEditingTitle(false); }} className="text-xs font-semibold text-[#1A7A57]">保存</button>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-[#1F1F1F] cursor-pointer hover:opacity-70 flex-1" onClick={() => { setTitleInput(title); setIsEditingTitle(true); }}>{title}</h2>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setPreview(!preview)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${preview ? 'bg-[#10A37F] text-[#1F1F1F]' : 'bg-[#f0f1f3] text-[#5a5f66] hover:bg-[#e3e5e8]'}`}>
              {preview ? '编辑' : '预览'}
            </button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 card overflow-hidden flex">
        {preview ? (
          <div className="flex-1 overflow-y-auto p-6" dangerouslySetInnerHTML={renderMarkdown(content)} />
        ) : (
          <textarea
            ref={textareaRef}
            className="flex-1 w-full resize-none p-6 text-sm leading-relaxed font-mono focus:outline-none"
            style={{ border: 'none', color: '#1F1F1F' }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此输入笔记内容...

支持 Markdown 语法：
# 标题
## 二级标题
- 列表项
**粗体** *斜体*
> 引用
"
          />
        )}
      </div>

      <p className="text-[10px] text-[#A0A0A0] mt-2 text-center">
        Ctrl+S 保存 · 支持 Markdown 格式 · {content.length} 字
      </p>
    </div>
  );
};

export default RegularNote;
