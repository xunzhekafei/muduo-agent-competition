import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchNotes, deleteNote } from '../api/notes';

const TABS = [
  { key: 'all', label: '全部速记' },
  { key: 'simple', label: '普通速记' },
  { key: 'time-tree', label: '时间树速记' },
  { key: 'timeline', label: '时间流速记' },
];

const TYPE_INFO = {
  'time-tree': { route: '/quick-notes/time-tree', color: '#D7EFE4', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
  'timeline': { route: '/quick-notes/timeline', color: '#E9E2F7', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  'simple': { route: '/quick-notes/simple', color: '#F7ECD9', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
};

const TYPE_LABEL = { 'time-tree': '时间树速记', 'timeline': '时间流速记', 'simple': '普通速记' };

const QuickNotesHistoryPage = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchNotes({ pageSize: 200 }).then(res => {
      const arr = res?.data || [];
      if (Array.isArray(arr)) setNotes(arr.filter(n => (n.title || '').trim()).filter(n => !n.tags || !n.tags.includes('source:tree_export')).filter(n => n.noteType !== 'quick_timetree' || (n.noteType === 'quick_timetree' && n.tags && n.tags.includes('is_root'))));
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const formatDate = (s) => { try { return new Date(s).toLocaleDateString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }); } catch { return ''; } };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try { await deleteNote(deleteConfirm); } catch {}
    setNotes(prev => prev.filter(n => n.id !== deleteConfirm));
    setDeleteConfirm(null);
  };

  const getNoteType = (note) => {
    const raw = note.noteType || note.note_type || 'simple';
    if (raw === 'quick_timetree') return 'time-tree';
    if (raw === 'quick_timeline') return 'timeline';
    return raw;
  };
  const filtered = activeTab === 'all' ? notes : notes.filter(n => getNoteType(n) === activeTab);

  const counts = {};
  TABS.forEach(t => {
    counts[t.key] = t.key === 'all' ? notes.length : notes.filter(n => getNoteType(n) === t.key).length;
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/quick-notes')} className="p-2 -ml-2 rounded-xl hover:bg-[#F3F4F6] transition-colors">
            <svg className="h-5 w-5 text-[#7B7B7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-[#1F1F1F]">全部速记</h1>
        </div>

        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 w-fit border border-[#ECECEC]">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-[10px] text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-[#10A37F] text-[#1F1F1F]' : 'text-[#7B7B7B] hover:text-[#1F1F1F]'
              }`}>
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-[#10A37F] border-t-transparent animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-black/[0.03]">
            <p className="text-sm text-[#A0A0A0]">暂无「{TABS.find(t => t.key === activeTab)?.label}」记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(note => {
              const t = getNoteType(note);
              const info = TYPE_INFO[t] || TYPE_INFO.simple;
              return (
                <div key={note.id} className="group relative">
                  <Link to={`${info.route}/${note.id}`} className="block">
                    <div className="bg-white rounded-xl p-4 hover:shadow-sm transition-all border border-black/[0.03] flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: info.color }}>
                        <svg className="h-4 w-4 text-[#1F1F1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          {info.icon}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-[#1F1F1F] truncate">{note.title}</h3>
                        {note.createdAt && <span className="text-xs text-[#A0A0A0]">{formatDate(note.createdAt)}</span>}
                      </div>
                      <span className="text-xs text-[#A0A0A0] bg-[#F3F4F6] px-2 py-1 rounded-full flex-shrink-0">
                        {TYPE_LABEL[t] || '普通速记'}
                      </span>
                      <svg className="h-4 w-4 text-[#D1D5DB] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(note.id); }}
                    className="absolute top-3 right-14 w-6 h-6 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:border-red-200 z-10">
                    <svg className="h-3 w-3 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
              <p className="text-base font-semibold text-[#1F1F1F] mb-1">确认删除</p>
              <p className="text-sm text-[#7B7B7B] mb-5">删除后无法恢复，确定要删除这条速记吗？</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] transition-colors">取消</button>
                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">确认删除</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickNotesHistoryPage;
