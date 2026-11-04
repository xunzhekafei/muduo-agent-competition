import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MemoryLibrary from '../features/memory/MemoryLibrary';
import MemoryMode from '../features/memory/MemoryMode';

const MemoryModePage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('library'); // 'library' | 'mode'
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [selectedNoteStatus, setSelectedNoteStatus] = useState(null);
  const [selectedNoteMeta, setSelectedNoteMeta] = useState(null);
  const [showAiDialog, setShowAiDialog] = useState(null); // { noteId, status, title, course }

  const handleEnterNote = (info) => {
    if (info.status === 'none') {
      setShowAiDialog(info);
      return;
    }
    setSelectedNoteId(info.noteId);
    setSelectedNoteStatus(info.status);
    setSelectedNoteMeta({ title: info.title, course: info.course });
    setView('mode');
  };

  const confirmAiGenerate = () => {
    if (!showAiDialog) return;
    setSelectedNoteId(showAiDialog.noteId);
    setSelectedNoteStatus(showAiDialog.status);
    setSelectedNoteMeta({ title: showAiDialog.title, course: showAiDialog.course });
    setView('mode');
    setShowAiDialog(null);
  };

  const handleBack = () => {
    setSelectedNoteId(null);
    setSelectedNoteStatus(null);
    setSelectedNoteMeta(null);
    setView('library');
  };

  const handleComplete = () => {
    navigate('/dashboard');
  };

  const handleStartNew = () => {
    setSelectedNoteId(null);
    setSelectedNoteStatus(null);
    setSelectedNoteMeta(null);
    setView('mode');
  };

  if (view === 'mode') {
    return (
      <MemoryMode
        noteId={selectedNoteId}
        noteStatus={selectedNoteStatus}
        noteMeta={selectedNoteMeta}
        onClose={handleBack}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <>
      <MemoryLibrary
        onEnterNote={handleEnterNote}
        onStartNew={handleStartNew}
      />
      {showAiDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <p className="text-base font-semibold text-[#1F1F1F] mb-1">AI 生成记忆卡片</p>
            <p className="text-sm text-[#7B7B7B] mb-5">是否使用 AI 为「{showAiDialog.title}」生成记忆卡片？</p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmAiGenerate} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">确认生成</button>
              <button onClick={() => setShowAiDialog(null)} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#f3f4f6] text-[#7B7B7B] hover:bg-[#e5e7eb] transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MemoryModePage;
