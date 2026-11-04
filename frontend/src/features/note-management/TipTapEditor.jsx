import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

const ToolbarButton = ({ onClick, active, title, children }) => (
  <button type="button" onClick={onClick} title={title}
    className={`p-2 rounded-lg text-sm transition-colors ${active ? 'bg-[#10A37F]/40 text-[#1F1F1F]' : 'text-[#7B7B7B] hover:bg-black/[0.04] hover:text-[#1F1F1F]'}`}
  >{children}</button>
);
const ToolbarDivider = () => <div className="w-px h-5 bg-black/[0.06] mx-1" />;

const icons = {
  bold: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zM6 12h9a4 4 0 010 8H6z"/></svg>,
  italic: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 4l4 16M14 4l4 16M6 8h8M10 20h8"/></svg>,
  underline: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 4v6a6 6 0 0012 0V4M4 20h16"/></svg>,
  highlight: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3.536 3.536L12.536 20H9v-3.536L15 10.5"/></svg>,
  h1: <span className="text-xs font-bold">H1</span>, h2: <span className="text-xs font-bold">H2</span>, h3: <span className="text-xs font-bold">H3</span>,
  ul: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>,
  ol: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>,
  quote: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m-15 0l3-3m-3 3l3 3"/></svg>,
  code: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25M6.75 17.25L1.5 12l5.25-5.25"/></svg>,
  table: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3zm0 6h18M9 3v18"/></svg>,
  task: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  undo: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>,
  redo: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"/></svg>,
};

const TipTapEditor = ({ initialContent, onChange, placeholder = '开始书写...', editable = true }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
      CodeBlockLowlight,
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder }), Highlight, Underline, TaskList,
      TaskItem.configure({ nested: true }),
    ],
    editable,
    onUpdate: ({ editor: ed }) => { if (onChange) onChange(ed.getJSON()); },
  });

  useEffect(() => { if (editor && initialContent) editor.commands.setContent(initialContent); }, [editor]);

  const insertTable = useCallback(() => {
    if (editor) editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) {
    return <div className="flex items-center justify-center h-48 text-sm text-[#9ca3af]">加载编辑器...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-0.5 px-4 py-2 bg-white border-b border-[#e5e7eb] flex-wrap sticky top-0 z-10">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="加粗 (Ctrl+B)">{icons.bold}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体 (Ctrl+I)">{icons.italic}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线 (Ctrl+U)">{icons.underline}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="高亮">{icons.highlight}</ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="一级标题">{icons.h1}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="二级标题">{icons.h2}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="三级标题">{icons.h3}</ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="无序列表">{icons.ul}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="有序列表">{icons.ol}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="待办列表">{icons.task}</ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用">{icons.quote}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="代码块">{icons.code}</ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={insertTable} active={editor.isActive('table')} title="插入表格">{icons.table}</ToolbarButton>
        {editor.isActive('table') && (
          <>
            <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} active={false} title="上方插入行"><span className="text-xs font-medium">↑行</span></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} active={false} title="右侧插入列"><span className="text-xs font-medium">列→</span></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} active={false} title="删除表格"><span className="text-xs text-[#c0392b]">✕</span></ToolbarButton>
          </>
        )}
        <div className="flex-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="撤销 (Ctrl+Z)">{icons.undo}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="重做 (Ctrl+Y)">{icons.redo}</ToolbarButton>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto py-8 px-4">
          <style>{`
            .ProseMirror strong { font-weight: 700 !important; }
            .ProseMirror em { font-style: italic !important; }
            .ProseMirror {
              min-height: 400px; outline: none; padding: 0;
              font-size: 15px; line-height: 1.8; color: #1F1F1F;
              font-synthesis: auto !important;
            }
            .ProseMirror p { margin: 0.5em 0; }
            .ProseMirror h1 { font-size: 1.75rem; font-weight: 700; margin: 1.5em 0 0.5em; line-height: 1.3; }
            .ProseMirror h2 { font-size: 1.25rem; font-weight: 700; margin: 1.2em 0 0.4em; line-height: 1.3; }
            .ProseMirror h3 { font-size: 1.1rem; font-weight: 600; margin: 1em 0 0.3em; line-height: 1.4; }
            .ProseMirror blockquote { border-left: 3px solid #10A37F; padding: 0.5em 1em; margin: 0.5em 0; background: rgba(0,0,0,0.015); border-radius: 0 8px 8px 0; color: #555; }
            .ProseMirror pre { background: #1F1F1F; color: #f0f0f0; padding: 1em 1.2em; border-radius: 12px; font-size: 13px; line-height: 1.6; overflow-x: auto; margin: 0.75em 0; }
            .ProseMirror pre code { background: none; color: inherit; padding: 0; }
            .ProseMirror code { background: rgba(0,0,0,0.05); padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
            .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; margin: 0.5em 0; }
            .ProseMirror li { margin: 0.25em 0; }
            .ProseMirror table { width: 100%; border-collapse: collapse; margin: 0.75em 0; font-size: 14px; }
            .ProseMirror th, .ProseMirror td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; min-width: 80px; }
            .ProseMirror th { background: #f8f9fa; font-weight: 600; }
            .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #A0A0A0; pointer-events: none; height: 0; }
            .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }
            .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5em; }
            .ProseMirror ul[data-type="taskList"] li > label { flex-shrink: 0; margin-top: 0.3em; }
            .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] { accent-color: #10A37F; }
            .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p { text-decoration: line-through; color: #A0A0A0; }
            .ProseMirror mark { background: #10A37F; color: #1F1F1F; padding: 0.1em 0.2em; border-radius: 2px; }
            .ProseMirror table .selectedCell { background: rgba(16, 163, 127, 0.15); }
          `}</style>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default TipTapEditor;
