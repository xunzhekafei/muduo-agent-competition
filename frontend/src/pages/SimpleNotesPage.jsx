import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlockEditor from '../features/simple-notes/BlockEditor';
import { SaveFolderPicker } from '../shared/components';
import { createNote, fetchNoteDetail } from '../api/notes';
import { ensureAuth } from '../api/client';

const SimpleNotesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(id ? null : { id: null, title: '未命名笔记', blocks: [], isNew: true });
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('未命名笔记');
  const [dirty, setDirty] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const blockEditorRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    ensureAuth().then(token => {
      if (!token) { setError('认证失败'); setIsLoading(false); return; }
      fetchNoteDetail(id)
        .then(response => {
          if (response.data) {
            const blocks = (response.data.blocks || []).map(block => ({
              id: block.id,
              type: mapBlockType(block.blockType),
              content: block.content,
            }));
            const title = response.data.note?.title || response.data.title || '未命名笔记';
            setNote({ id, title, blocks });
            setEditTitle(title);
          }
        })
        .catch(() => setError('加载笔记失败'))
        .finally(() => setIsLoading(false));
    });
  }, [id]);

  const mapBlockType = (blockType) => {
    const typeMap = {
      paragraph: 'richText', heading: 'richText', quote: 'richText',
      todo: 'todo', code: 'markdown', table: 'table',
      ai_summary: 'ai', thinking: 'markdown', memory_cards: 'markdown',
      formula: 'markdown', annotation: 'image', relations: 'markdown',
    };
    return typeMap[blockType] || 'richText';
  };

  const ensureQuickNote = () => {
    if (note?.id) return note.id;
    // 速记保存在本地，不写 notes 表
    const newId = 'qn_' + Date.now();
    setNote(prev => ({ ...prev, id: newId, title: editTitle.trim() || '未命名笔记', isNew: false }));
    return newId;
  };

  const handleSaveTitle = () => {
    if (!note) return;
    ensureQuickNote();
    setNote(prev => ({ ...prev, title: editTitle.trim() }));
    setDirty(true);
    setIsEditingTitle(false);
  };

  const handleSaveAll = async () => {
    const targetId = ensureQuickNote();
    const ok = blockEditorRef.current ? await blockEditorRef.current.saveBlocks(targetId) : true;
    if (ok) {
      setNote(prev => ({ ...prev, title: editTitle.trim() }));
      setDirty(false);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSaveTitle(); }
    else if (e.key === 'Escape') { setEditTitle(note?.title || ''); setIsEditingTitle(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#10A37F] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="max-w-4xl mx-auto min-h-screen">
        <div className="bg-white border-b border-black/[0.04] px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => dirty ? setShowExitDialog(true) : navigate('/quick-notes')}
              className="p-2 -ml-2 rounded-xl hover:bg-[#F3F4F6] transition-colors flex-shrink-0"
            >
              <svg className="h-5 w-5 text-[#7B7B7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="text" value={editTitle} onChange={(e) => { setEditTitle(e.target.value); setDirty(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveTitle(); } }}
                  className="text-lg font-bold text-[#1F1F1F] border-none outline-none bg-transparent flex-1"
                  autoFocus
                />
                <button onClick={handleSaveTitle} className="text-xs font-semibold text-[#1A7A57] hover:opacity-70">保存</button>
              </div>
            ) : (
              <h1 className="text-lg font-bold text-[#1F1F1F] cursor-pointer hover:opacity-70 flex-1" onClick={() => { setEditTitle(note?.title || ''); setIsEditingTitle(true); }}>
                {note?.title || '未命名笔记'}
              </h1>
            )}
          </div>
        </div>
        <BlockEditor ref={blockEditorRef} initialBlocks={note?.blocks} noteId={note?.id} onSave={handleSaveAll} onChange={() => setDirty(true)} onExport={() => setShowExportPicker(true)} />

        {showExportPicker && (
          <SaveFolderPicker
            fileName={`${editTitle || '未命名笔记'}.md`}
            onSave={async (result) => {
              setShowExportPicker(false);
              try {
                // 创建笔记，归属到选中文件夹（课程）
                const res = await createNote({
                  title: editTitle || note?.title || '未命名笔记',
                  courseId: result.dirId !== 'root' ? result.dirId : undefined,
                });
                const newNoteId = res?.data?.id;
                if (newNoteId && blockEditorRef.current) {
                  await blockEditorRef.current.saveBlocks(newNoteId);
                }
                alert('已导出到我的笔记');
              } catch { alert('导出失败'); }
            }}
            onCancel={() => setShowExportPicker(false)}
          />
        )}

        {showExitDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
              <p className="text-base font-semibold text-[#1F1F1F] mb-1">未保存的更改</p>
              <p className="text-sm text-[#7B7B7B] mb-5">你有未保存的修改，是否保存后再离开？</p>
              <div className="flex flex-col gap-2">
                <button onClick={async () => { await handleSaveAll(); setShowExitDialog(false); navigate('/quick-notes'); }} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">保存并离开</button>
                <button onClick={() => { setShowExitDialog(false); navigate('/quick-notes'); }} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#fce4e4] text-[#c0392b] hover:bg-[#f5d0d0] transition-colors">不保存直接离开</button>
                <button onClick={() => setShowExitDialog(false)} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#f3f4f6] text-[#7B7B7B] hover:bg-[#e5e7eb] transition-colors">取消</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleNotesPage;
