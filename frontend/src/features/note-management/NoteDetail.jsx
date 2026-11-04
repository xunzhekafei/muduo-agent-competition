import React, { useState, useEffect } from 'react';
import { fetchNoteDetail, updateNote, addNoteBlock } from '../../api/notes';
import { NOTE_BLOCK_LABEL } from '../../shared/constants';
import { renderMarkdown } from '../../shared/renderMarkdown';

const NoteDetail = ({ noteId, onBack }) => {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [newBlock, setNewBlock] = useState('');

  const load = async () => {
    try { setLoading(true); const r = await fetchNoteDetail(noteId);
      const d = r.data || r;
      const n = d.note || d;
      setNote({ ...n, blocks: (d.blocks || []).map(b => ({ ...b, type: b.blockType || b.type })) });
      setTitle(n.title || '');
    }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (noteId) load(); }, [noteId]);

  const handleSave = async () => {
    try { await updateNote(noteId, { title }); setEditing(false); } catch (e) { console.error(e); }
  };
  const handleAddBlock = async () => {
    if (!newBlock.trim()) return;
    try { await addNoteBlock(noteId, { blockType: 'paragraph', content: newBlock.trim() }); setNewBlock(''); load(); }
    catch (e) { console.error(e); }
  };

  if (loading) return <p className="text-sm text-ink-tertiary py-12 text-center">加载中...</p>;
  if (!note) return <p className="text-sm text-rose-500 py-12 text-center">笔记未找到</p>;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ink-tertiary hover:text-ink-primary mb-5 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        返回列表
      </button>

      <div className="mb-6">
        {editing ? (
          <div className="flex gap-2">
            <input className="input-base !text-lg !font-semibold" value={title}
              onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus />
            <button onClick={handleSave} className="btn-primary">保存</button>
          </div>
        ) : (
          <h2 className="text-xl font-semibold text-ink-primary cursor-pointer hover:text-brand-600 transition-colors"
            onClick={() => setEditing(true)}>{note.title}</h2>
        )}
        {note.tags?.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {note.tags.map(t => <span key={t} className="badge bg-brand-50 text-brand-600">{t}</span>)}
          </div>
        )}
      </div>

      <div className="space-y-2 mb-6">
        {(note.blocks || []).map((b, i) => {
          const blockType = b.blockType || b.type || '';

          // 根据 6 种速记类型（经过后端映射后）选择渲染方式
          const renderContent = (type, content) => {
            switch (type) {
              // 前端 richText → 后端 paragraph，内容是 HTML
              case 'paragraph':
                return <div className="text-sm text-ink-primary leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content || '' }} />;
              // 前端 markdown → 后端 thinking，内容是 markdown
              case 'thinking':
              // 前端 ai → 后端 ai_summary，内容是 markdown
              case 'ai_summary':
              // 前端 table → JSON 或 markdown
              case 'table':
                return <TableBlock content={content || ''} />;
              // 前端 todo → 后端 todo，内容是 JSON 数组
              case 'todo':
                return <TodoList raw={content || ''} />;
              // 前端 image → 后端 annotation，内容是图片 URL
              case 'annotation':
                return <img src={content} alt="" className="max-w-full rounded-lg my-2" />;
              // 标题
              case 'heading':
                return <h3 className="text-base font-semibold text-ink-primary">{content}</h3>;
              // 代码块
              case 'code':
                return <div className="text-sm text-ink-primary leading-relaxed" dangerouslySetInnerHTML={renderMarkdown(content || '')} />;
              default:
                // 未知类型，尝试 markdown 兜底
                return <div className="text-sm text-ink-primary leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={renderMarkdown(content || '')} />;
            }
          };

          return (
            <div key={b.id || i} className="px-4 py-3 rounded-xl bg-gray-50/70">
              <span className="text-[10px] text-ink-tertiary mb-1 block">{NOTE_BLOCK_LABEL[blockType] || blockType}</span>
              {renderContent(blockType, b.content)}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input className="input-base flex-1" placeholder="添加段落..."
          value={newBlock} onChange={e => setNewBlock(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddBlock()} />
        <button onClick={handleAddBlock} className="btn-primary">添加</button>
      </div>
    </div>
  );
};

// ── 表格渲染 ──
function TableBlock({ content }) {
  try {
    const tbl = JSON.parse(content);
    if (tbl.headers && tbl.rows) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-[#e5e7eb] rounded-lg">
            <thead><tr className="bg-[#f8f9fa]">{tbl.headers.map((h,i)=><th key={i} className="text-left px-3 py-2 text-xs font-semibold text-[#374151] border-b border-[#e5e7eb]">{h}</th>)}</tr></thead>
            <tbody>{tbl.rows.map((row,i)=>(<tr key={i} className="border-b border-[#f3f4f6]">{row.map((c,j)=><td key={j} className="px-3 py-2 text-[#4B5563]">{c}</td>)}</tr>))}</tbody>
          </table>
        </div>
      );
    }
  } catch {}
  // fallback：尝试 markdown 渲染
  return <div className="text-sm text-ink-primary leading-relaxed" dangerouslySetInnerHTML={renderMarkdown(content)} />;
}

// ── 待办列表渲染 ──
function TodoList({ raw }) {
  let items = [];
  try { items = JSON.parse(raw); } catch {
    // 非 JSON 格式，按行解析
    items = raw.split('\n').filter(Boolean).map(line => ({ text: line.replace(/^[-*]\s*/, ''), completed: false }));
  }
  if (!Array.isArray(items) || items.length === 0) return <p className="text-sm text-ink-primary">{raw}</p>;
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${item.completed ? 'bg-[#10A37F] border-[#10A37F]' : 'border-[#d1d5db]'}`}>
            {item.completed && <svg className="w-3 h-3 text-[#1F1F1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
          </span>
          <span className={item.completed ? 'line-through text-[#9ca3af]' : 'text-[#374151]'}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

export default NoteDetail;
