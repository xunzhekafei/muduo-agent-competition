import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchNoteDetail, updateNoteBlock, addNoteBlock, deleteNoteBlock } from '../../api/notes';
import { getNoteById } from '../../mocks/mockData.jsx';

import TipTapEditor from './TipTapEditor';
import { blocksToTipTap, tipTapToBlocks, diffBlocks } from './tiptap-converter';

/**
 * 从 TipTap JSON 中提取所有 heading，用于目录
 */
function extractHeadings(doc) {
  if (!doc?.content) return [];
  const headings = [];
  doc.content.forEach((node, i) => {
    if (node.type === 'heading') {
      const level = node.attrs?.level || 2;
      const text = extractPlainText(node);
      headings.push({ id: `h-${i}`, level, text });
    }

  });
  return headings;
}


function extractPlainText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  let text = '';
  if (node.content) {
    node.content.forEach(c => { text += extractPlainText(c); });
  }
  return text;
}


const NoteWorkspace = ({ noteId, onClose, scrollToBlockId, onScrolled }) => {
  const [showTOC, setShowTOC] = useState(true);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [originalBlocks, setOriginalBlocks] = useState([]);
  const [headings, setHeadings] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef(null);
  const saveAttempted = useRef(false);
  // 用 ref 追踪编辑器最新内容，不触发重渲染
  const editorContentRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNoteDetail(noteId)
      .then((res) => {
        if (cancelled) return;
        loadNote(res);
      })
      .catch(() => {
        if (cancelled) return;
        // fallback to mock
        const mock = getNoteById(noteId);
        if (mock) {
          // 把 mock 数据转成类似 API 返回的格式
          loadNote({ data: mock.data || mock });
        } else {
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [noteId]);

  function loadNote(res) {
    const d = res.data || res;
    const noteData = d.note || d;
    const blocks = d.blocks || [];

    setNote({
      id: noteData.id,
      title: noteData.title,
      course: noteData.courseName || '未分类',
      tags: noteData.tags || [],
      mastery: noteData.mastery || 0,
      updatedAt: noteData.updatedAt,
      aiStatus: 'parsed',
    });
    setOriginalBlocks(blocks);

    // 转换为 TipTap JSON — 存到 ref，不触发重渲染
    const tipJson = blocksToTipTap(blocks);
    editorContentRef.current = tipJson;
    setHeadings(extractHeadings(tipJson));
    setIsDirty(false);
    setLoading(false);
  }

  // 处理编辑器内容变化 — 内容存入 ref（不触发重渲染），只更新目录和脏标记
  const handleEditorChange = useCallback((json) => {
    editorContentRef.current = json;
    setHeadings(extractHeadings(json));
    setIsDirty(true);
  }, []);

  // **保存笔记 — 核心逻辑**
  const handleSave = useCallback(async () => {
    if (!note || saving) return;
    setSaving(true);
    saveAttempted.current = true;

    try {
      // 1. 先更新笔记标题（如果改了）
      // （暂不实现标题编辑，只保存 blocks）

      // 2. 从 ref 取最新编辑器内容 → 转换 TipTap JSON → blocks
      const currentContent = editorContentRef.current;
      if (!currentContent) {
        showToast('没有可保存的内容', 'error');
        setSaving(false);
        return;
      }
      const newBlocks = tipTapToBlocks(currentContent, originalBlocks);

      // 3. 对比差异，生成操作列表
      const ops = diffBlocks(newBlocks, originalBlocks);

      if (ops.length === 0) {
        showToast('笔记已是最新', 'success');
        setSaving(false);
        setIsDirty(false);
        return;
      }

      // 4. 逐个执行操作
      let successCount = 0;
      for (const op of ops) {
        try {
          switch (op.action) {
            case 'update':
              await updateNoteBlock(note.id, op.oldBlock.id, {
                content: op.block.content,
                blockType: op.block.blockType,
                metadata: op.block.metadata || {},
              });
              successCount++;
              break;

            case 'create':
              await addNoteBlock(note.id, {
                content: op.block.content,
                blockType: op.block.blockType,
                position: op.block.position,
                metadata: op.block.metadata || {},
              });
              successCount++;
              break;

            case 'delete':
              await deleteNoteBlock(note.id, op.oldBlock.id);
              successCount++;
              break;
          }
        } catch (err) {
          console.error(`保存 block 失败 (${op.action}):`, err);
        }
      }

      if (successCount === 0 && ops.length > 0) {
        showToast('保存失败 — 后端未连接', 'error');
        setSaving(false);
        return;
      }

      // 5. 重新加载笔记，获取最新的 block IDs
      try {
        const res = await fetchNoteDetail(note.id);
        const d = res.data || res;
        setOriginalBlocks(d.blocks || []);
        setIsDirty(false);
      } catch {
        // 重载失败没关系，保持当前状态
        setIsDirty(false);
      }

      showToast(`已保存（${successCount} 处更改）`, 'success');
    } catch (err) {
      showToast('保存失败，请重试', 'error');
      console.error('保存笔记失败:', err);
    } finally {
      setSaving(false);
    }
  }, [note, originalBlocks, saving, showToast]);

  // Ctrl+S 快捷键
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, handleSave]);

  // 滚动到搜索结果
  useEffect(() => {
    if (!scrollToBlockId || !note) return;
    // TipTap 模式下暂不支持滚动到指定 block
    if (onScrolled) onScrolled();
  }, [scrollToBlockId, note, onScrolled]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#10A37F] border-t-transparent animate-spin" />
          <div className="text-sm text-[#9ca3af]">加载中...</div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-sm text-[#9ca3af]">笔记不存在或已删除</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all"
          style={{
            backgroundColor: toast.type === 'success' ? '#10A37F' : '#fce4e4',
            color: toast.type === 'success' ? '#1F1F1F' : '#c0392b',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ===== 顶部工具栏 ===== */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#e0e0e0] flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/[0.04] transition-colors">
            <svg className="h-5 w-5 text-[#7B7B7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#1F1F1F]">{note.title}</h1>
            <p className="text-xs text-[#A0A0A0]">{note.course} · 更新于 {note.updatedAt}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 保存状态指示 */}
          {isDirty && (
            <span className="text-xs text-[#A0A0A0] font-medium mr-1">未保存</span>
          )}

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`px-4 h-9 rounded-xl text-sm font-semibold transition-all duration-200
              ${saving || !isDirty
                ? 'bg-black/[0.04] text-[#A0A0A0] cursor-not-allowed'
                : 'bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] active:scale-[0.97]'
              }`}
          >
            {saving ? '保存中...' : '保存'}
          </button>

          {/* 掌握度 */}
          <span className={`text-sm font-bold ml-1 ${
            note.mastery >= 80 ? 'text-[#1A7A57]' : note.mastery >= 60 ? 'text-[#8A5A1A]' : 'text-[#c0392b]'
          }`}>
            掌握度 {note.mastery}%
          </span>

          <div className="w-px h-6 bg-[#e0e0e0] mx-1"/>

          {/* 目录切换按钮 */}
          <button
            onClick={() => setShowTOC(!showTOC)}
            className={`p-2 rounded-xl transition-colors ${
              showTOC ? 'bg-[#f3f4f6] text-[#1F1F1F]' : 'text-[#7B7B7B] hover:bg-[#f5f5f5]'
            }`}
            title="目录"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={showTOC
                ? "M3.75 6.75h16.5M3.75 12h16.5M10.5 17.25h9.75"
                : "M3.75 6.75h16.5M3.75 12h16.5m-7.5 5.25h7.5"
              }/>
            </svg>
          </button>
        </div>
      </div>

      {/* ===== 主体: 编辑器 + 目录 ===== */}
      <div className="flex-1 flex min-h-0">

        {/* 编辑器 */}
        <div className="flex-1 overflow-hidden">
          <TipTapEditor
            key={noteId}
            initialContent={editorContentRef.current}
            onChange={handleEditorChange}
            placeholder="开始书写笔记内容..."
          />

        </div>

        {/* 目录侧栏 */}
        {showTOC && (
          <div className="w-[200px] flex-shrink-0 border-l border-[#e0e0e0] bg-white overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">文档目录</h4>
              <button onClick={() => setShowTOC(false)} className="p-0.5 rounded hover:bg-[#f3f4f6] text-[#9ca3af]">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            {headings.length === 0 ? (
              <p className="text-xs text-[#A0A0A0]">暂无标题</p>
            ) : (
              <nav className="space-y-0.5">
                {headings.map((h, i) => (
                  <div key={h.id || i} style={{ paddingLeft: h.level === 1 ? '0' : '12px' }}>
                    <span className="block text-xs py-1.5 px-2 rounded-lg text-[#6B7280] hover:bg-[#f5f5f5] cursor-default">
                      {h.text}
                    </span>
                  </div>
                ))}
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteWorkspace;
