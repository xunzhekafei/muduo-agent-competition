import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchNotes, deleteNote } from '../api/notes';
import { PageHeader, Button, Icon } from '../shared/ui';
import { useAgent } from '../features/agent/AgentContext';

const ICON_QUICK = 'm16.862 4.487 1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10';
const ICON_CHAT = 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z';

const QuickNotesLandingPage = () => {
  const { askAI } = useAgent();
  const navigate = useNavigate();
  const askAboutQuickNotes = () => {
    askAI('根据我最近的速记记录，帮我看看有哪些还没整理，以及建议怎么整理成笔记');
    navigate('/agent');
  };

  const [simpleNotes, setSimpleNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const DISPLAY_LIMIT = 6; // 3行 x 2列

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetchNotes({ pageSize: 50 });
      if (response?.data) {
        const notesData = response.data.data || response.data.items || response.data;
        if (Array.isArray(notesData)) {
          const notes = notesData
            .filter(note => (note.title || '').trim()).filter(n => !n.tags || !n.tags.includes('source:tree_export')).filter(n => n.noteType !== 'quick_timetree' || (n.tags && n.tags.includes('is_root')) || (n.noteType === 'quick_timetree' && (!n.tags || !n.tags.some(t => String(t).startsWith('tree_')))))
            .slice(0, 10)
            .map(note => ({
              id: note.id, title: note.title,
              noteType: note.noteType || note.note_type || 'simple',
              date: note.createdAt || note.created_at ? formatDate(note.createdAt || note.created_at) : '',
            }));
          setSimpleNotes(notes);
        }
      }
    } catch {}
    setIsLoading(false);
  };

  const location = useLocation();
  useEffect(() => { loadNotes(); }, [location.pathname]);

  const formatDate = (s) => { try { const d = new Date(s); return d.toLocaleDateString('zh-CN', { month:'2-digit', day:'2-digit' }); } catch { return ''; } };

  const handleDelete = (noteId, e) => {
    e.stopPropagation();
    setDeleteConfirm(noteId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm);
    try { await deleteNote(deleteConfirm); loadNotes(); } catch {}
    setDeletingId(null);
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          icon={ICON_QUICK}
          title="速记模式"
          description="选择一种速记方式，快速记录课堂与学习内容"
          actions={
            <Button variant="ghost" onClick={askAboutQuickNotes}>
              <Icon d={ICON_CHAT} className="h-4 w-4" />
              问 AI
            </Button>
          }
        />

        {/* 三卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <Link to="/quick-notes/time-tree" className="block">
            <div className="bg-white rounded-2xl p-6 hover:shadow-md transition-all cursor-pointer border border-black/[0.04] h-full">
              <div className="w-12 h-12 rounded-xl bg-[#D7EFE4] flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-[#1A7A57]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#1F1F1F] mb-1">时间树速记</h3>
              <p className="text-xs text-[#7B7B7B] leading-relaxed">以知识树形式记录，AI 实时解析生成结构化节点，适合课堂讲座</p>
            </div>
          </Link>

          <Link to="/quick-notes/timeline" className="block">
            <div className="bg-white rounded-2xl p-6 hover:shadow-md transition-all cursor-pointer border border-black/[0.04] h-full">
              <div className="w-12 h-12 rounded-xl bg-[#E9E2F7] flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-[#5B3FA8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#1F1F1F] mb-1">时间流速记</h3>
              <p className="text-xs text-[#7B7B7B] leading-relaxed">录音 + 文字时间流 + AI 结构化面板，边听边记</p>
            </div>
          </Link>

          <Link to="/quick-notes/simple" className="block">
            <div className="bg-white rounded-2xl p-6 hover:shadow-md transition-all cursor-pointer border border-black/[0.04] h-full">
              <div className="w-12 h-12 rounded-xl bg-[#F7ECD9] flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-[#8A5A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#1F1F1F] mb-1">普通速记</h3>
              <p className="text-xs text-[#7B7B7B] leading-relaxed">块编辑器 + Markdown 预览，快速记录要点</p>
            </div>
          </Link>
        </div>

        {/* 删除确认弹窗 */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
              <p className="text-sm font-medium text-[#1F1F1F] mb-1">确认删除</p>
              <p className="text-xs text-[#7B7B7B] mb-5">删除后无法恢复，确定要删除这条速记吗？</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2 rounded-xl text-sm font-medium bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] transition-colors">取消</button>
                <button onClick={confirmDelete} className="px-5 py-2 rounded-xl text-sm font-medium bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">确认</button>
              </div>
            </div>
          </div>
        )}

        {/* 历史记录 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1F1F1F]">历史速记</h2>
            {simpleNotes.length > DISPLAY_LIMIT && (
              <Link to="/quick-notes/history" className="text-sm text-[#5B3FA8] font-medium hover:underline">
                查看全部 →
              </Link>
            )}
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-[#10A37F] border-t-transparent animate-spin" /></div>
          ) : simpleNotes.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-black/[0.03]">
              <p className="text-sm text-[#A0A0A0]">暂无记录，创建第一条速记吧</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {simpleNotes.slice(0, DISPLAY_LIMIT).map(note => {
                const linkPath = note.noteType === 'quick_timetree'
                  ? `/quick-notes/time-tree/${note.id}`
                  : `/quick-notes/simple/${note.id}`;
                const typeLabel = note.noteType === 'quick_timetree' ? '时间树' : '普通速记';
                return (
                <div key={note.id} className="group relative">
                  <Link to={linkPath} className="block">
                    <div className="bg-white rounded-xl p-4 hover:shadow-sm transition-all border border-black/[0.03]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]">{typeLabel}</span>
                      </div>
                      <h3 className="text-sm font-medium text-[#1F1F1F] truncate">{note.title}</h3>
                      {note.date && <span className="text-xs text-[#A0A0A0]">{note.date}</span>}
                    </div>
                  </Link>
                  <button onClick={(e) => handleDelete(note.id, e)} disabled={deletingId === note.id}
                    className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:border-red-200">
                    <svg className="h-3 w-3 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickNotesLandingPage;
