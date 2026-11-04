import React, { useState, useEffect } from 'react';
import { fetchNotes, createNote, deleteNote } from '../../api/notes';
import { NOTE_STATUS_LABEL, NOTE_STATUS } from '../../shared/constants';

const statusStyle = {
  [NOTE_STATUS.ACTIVE]: 'tag-mint',
  [NOTE_STATUS.DRAFT]: 'bg-black/[0.04] text-[#7B7B7B]',
  [NOTE_STATUS.ARCHIVED]: 'bg-[#F7ECD9] text-[#8A5A1A]',
};

const NoteList = ({ onSelectNote }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const load = async () => {
    try { setLoading(true); const r = await fetchNotes(); setNotes(r.data || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try { await createNote({ title: newTitle.trim() }); setNewTitle(''); setShowCreate(false); load(); }
    catch (e) { console.error(e); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[#1F1F1F]">我的笔记</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="text-xs font-semibold transition-colors" style={{ color: '#5C7A10' }}>+ 新建</button>
      </div>
      {showCreate && (
        <div className="mb-3 flex gap-2">
          <input className="input-base flex-1 !py-2" placeholder="笔记标题..." value={newTitle}
            onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
          <button onClick={handleCreate} className="btn-primary !h-9 !text-xs">创建</button>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-[#A0A0A0]">加载中...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-[#A0A0A0] py-8 text-center">暂无笔记</p>
      ) : (
        <div className="space-y-0.5">
          {notes.map(n => (
            <div key={n.id} onClick={() => onSelectNote?.(n)}
              className="flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer hover:bg-black/[0.02] transition-colors group">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[#1F1F1F] truncate">{n.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`badge text-[10px] ${statusStyle[n.status] || statusStyle[NOTE_STATUS.DRAFT]}`}>
                    {NOTE_STATUS_LABEL[n.status] || n.status}
                  </span>
                  {n.tags?.slice(0,2).map(t => <span key={t} className="text-[10px] text-[#A0A0A0]">{t}</span>)}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); handleDelete(n.id); }}
                className="p-1 rounded-lg text-[#A0A0A0] hover:text-[#e74c3c] hover:bg-[#fce4e4] opacity-0 group-hover:opacity-100 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteList;
