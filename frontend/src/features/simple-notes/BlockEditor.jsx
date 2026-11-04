import React, { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import RichTextBlock from './blocks/RichTextBlock';
import MarkdownBlock from './blocks/MarkdownBlock';
import TodoBlock from './blocks/TodoBlock';
import ImageBlock from './blocks/ImageBlock';
import AIGenerationBlock from './blocks/AIGenerationBlock';
import TableBlock from './blocks/TableBlock';
import { saveNoteBlocks } from '../../api/notes';

const BlockEditor = forwardRef(({ initialBlocks, noteId, onSave, onChange, onExport }, ref) => {
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveError, setSaveError] = useState(null);

  // 暴露保存方法给父组件，接受外部传入的 noteId
  useImperativeHandle(ref, () => ({
    saveBlocks: (nid) => handleSave(nid || noteId)
  }));

  // 初始化加载
  useEffect(() => {
    if (initialBlocks) {
      setBlocks(initialBlocks);
      setIsLoading(false);
    } else {
      // 如果没有初始数据，使用默认示例数据
      setBlocks([
        { id: Date.now(), type: 'richText', content: '欢迎使用普通速记！这是一个块式编辑器，支持多种内容块类型。' },
        { id: Date.now() + 1, type: 'markdown', content: '# Markdown 支持\n\n这是一段 **Markdown** 内容，可以包含代码块、列表等。\n\n- 项目一\n- 项目二\n- 项目三' },
        { id: Date.now() + 2, type: 'todo', content: JSON.stringify([
          { id: 1, text: '完成块编辑器设计', completed: true },
          { id: 2, text: '实现 AI 生成功能', completed: false },
          { id: 3, text: '添加导出功能', completed: false },
        ])},
      ]);
      setIsLoading(false);
    }
  }, [initialBlocks]);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuPosition, setAddMenuPosition] = useState({ x: 0, y: 0, direction: 'down' });

  const addBlock = (type, content = '') => {
    const newBlock = {
      id: Date.now(),
      type,
      content,
    };
    setBlocks([...blocks, newBlock]);
    setShowAddMenu(false);
    onChange?.();
  };

  const updateBlock = (id, content) => {
    setBlocks(blocks.map(block =>
      block.id === id ? { ...block, content } : block
    ));
    onChange?.();
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter(block => block.id !== id));
    onChange?.();
  };

  const handleAddClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 240;
    const windowHeight = window.innerHeight;
    const availableSpaceBelow = windowHeight - rect.bottom;
    
    const direction = availableSpaceBelow > menuHeight ? 'down' : 'up';
    const y = direction === 'down' ? rect.bottom : rect.top - menuHeight;
    
    setAddMenuPosition({ x: rect.left, y, direction });
    setShowAddMenu(true);
  }, []);

  const handleConvertToMarkdown = (content) => {
    addBlock('markdown', content);
  };

  // 保存到后端（暴露给父组件）
  const handleSave = async (nid) => {
    const targetId = nid || noteId;
    if (!targetId) return false;
    if (!blocks || blocks.length === 0) return false;
    if (String(targetId).startsWith('qn_')) {
      // 速记模式：只存本地
      setSaveStatus('保存成功');
      return true;
    }
    // 笔记模式：写后端
    setIsSaving(true);
    setSaveStatus('保存中...');
    setSaveError(null);
    try {
      const blocksToSave = blocks.map((b) => ({ type: b.type, content: b.content, metadata: {} }));
      await saveNoteBlocks(targetId, blocksToSave);
      setSaveStatus('保存成功');
      return true;
    } catch {
      setSaveError('保存失败');
      return false;
    } finally {
      setIsSaving(false);
      setTimeout(() => { setSaveStatus(''); setSaveError(null); }, 3000);
    }
  };

  const blockTypes = [
    { type: 'richText', label: '文本', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' },
    { type: 'markdown', label: 'Markdown', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    { type: 'todo', label: '待办列表', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { type: 'image', label: '图片', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { type: 'table', label: '表格', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { type: 'ai', label: 'AI 生成', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  ];

  const renderBlock = (block) => {
    switch (block.type) {
      case 'richText':
        return (
          <RichTextBlock
            key={block.id}
            content={block.content}
            onChange={(content) => updateBlock(block.id, content)}
            onDelete={() => deleteBlock(block.id)}
            onAddBlock={addBlock}
          />
        );
      case 'markdown':
        return (
          <MarkdownBlock
            key={block.id}
            content={block.content}
            onChange={(content) => updateBlock(block.id, content)}
            onDelete={() => deleteBlock(block.id)}
            onAddBlock={addBlock}
          />
        );
      case 'todo':
        return (
          <TodoBlock
            key={block.id}
            content={block.content}
            onChange={(content) => updateBlock(block.id, content)}
            onDelete={() => deleteBlock(block.id)}
            onAddBlock={addBlock}
          />
        );
      case 'image':
        return (
          <ImageBlock
            key={block.id}
            content={block.content}
            onChange={(content) => updateBlock(block.id, content)}
            onDelete={() => deleteBlock(block.id)}
          />
        );
      case 'table':
        return (
          <TableBlock
            key={block.id}
            content={block.content}
            onChange={(content) => updateBlock(block.id, content)}
            onDelete={() => deleteBlock(block.id)}
          />
        );
      case 'ai':
        return (
          <AIGenerationBlock
            key={block.id}
            content={block.content}
            onChange={(content) => updateBlock(block.id, content)}
            onDelete={() => deleteBlock(block.id)}
            onConvertToMarkdown={handleConvertToMarkdown}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="w-8 h-8 rounded-full border-2 border-[#10A37F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FAFAFA]">
      {/* 添加块菜单 */}
      {showAddMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowAddMenu(false)}
          />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-lg border border-[#E5E7EB] p-2 w-48 shadow-xl"
            style={{ 
              left: addMenuPosition.x, 
              top: addMenuPosition.y,
              transform: addMenuPosition.direction === 'up' ? 'none' : 'none'
            }}
          >
            {blockTypes.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F3F4F6] transition-all duration-150"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
                <span className="text-sm font-medium text-[#374151]">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 编辑器内容区域 */}
      <div className="max-w-4xl mx-auto py-6">
        {/* 工具栏 */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="text-sm text-[#6B7280]">
            {blocks.length} 个内容块
          </div>
          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className={`text-sm ${saveStatus.includes('成功') ? 'text-green-500' : 'text-blue-500'}`}>
                {saveStatus}
              </span>
            )}
            {saveError && (
              <span className="text-sm text-red-500">
                {saveError}
              </span>
            )}
            <button
              onClick={onExport}
              className="px-4 py-2.5 rounded-xl bg-[#f0f1f3] text-[#5a5f66] text-sm font-medium hover:bg-[#e3e5e8] transition-all"
            >
              导出到我的笔记
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10A37F] text-[#1F1F1F] text-sm font-medium hover:bg-[#0D8B6C] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {isSaving ? '保存中...' : '保存速记'}
            </button>
          </div>
        </div>

        {/* 块列表 */}
        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block.id} className="relative">
              {/* 拖拽指示线 */}
              <div className="absolute -top-1.5 left-0 right-0 h-1 hover:bg-[#10A37F]/40 rounded-full cursor-ns-resize transition-colors" />
              {renderBlock(block)}
            </div>
          ))}
        </div>

        {/* 添加块按钮 */}
        <button
          onClick={handleAddClick}
          className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border-2 border-dashed border-[#E5E7EB] text-[#6B7280] hover:border-[#10A37F] hover:text-[#1F1F1F] hover:bg-[#10A37F]/5 transition-all duration-200 font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          添加内容块
        </button>
      </div>
    </div>
  );
});

BlockEditor.displayName = 'BlockEditor';

export default BlockEditor;
