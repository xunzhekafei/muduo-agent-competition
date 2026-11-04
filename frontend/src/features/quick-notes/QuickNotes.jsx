import React, { useState, useEffect, useRef } from 'react';
import { SaveFolderPicker } from '../../shared/components';
import { fetchQuickNote, addTimelineItem } from '../../api/quickNotes';
import { mockQuickNotesDemoSteps, mockQuickNotesDemoStructured } from '../../mocks/mockData';

const TAG_DEFS = [
  { label:'不理解', bg:'#fce4e4', t:'#c0392b' },
  { label:'重点', bg:'#F7ECD9', t:'#8A5A1A' },
  { label:'考点', bg:'#E2EBF7', t:'#2C5282' },
  { label:'需复习', bg:'#D7EFE4', t:'#1A7A57' },
  { label:'我的想法', bg:'#E9E2F7', t:'#5B3FA8' },
];

const TYPE_BADGE_COLORS = {
  '概念定义':'bg-[#E2EBF7] text-[#2C5282]',
  '关键结论':'bg-[#D7EFE4] text-[#1A7A57]',
  '推导步骤':'bg-[#E9E2F7] text-[#5B3FA8]',
  '例题分析':'bg-[#DDF0EA] text-[#0B7A5E]',
  '教师强调':'bg-[#E9E2F7] text-[#5B3FA8]',
};

const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
const DEMO_STEPS = mockQuickNotesDemoSteps;
const DEMO_STRUCTURED = mockQuickNotesDemoStructured;

const INITIAL_TIMELINE = [
  { id: 1, type: 'system', content: '速记已就绪，点击下方按钮开始记录', timestamp: '00:00:00' },
];
const INITIAL_STRUCTURED = [];
const INITIAL_ANNOTATIONS = [
  { id: 1, type: '不理解', count: 0 },
  { id: 2, type: '重点', count: 0 },
  { id: 3, type: '考点', count: 0 },
  { id: 4, type: '需复习', count: 0 },
  { id: 5, type: '我的想法', count: 0 },
];

const QuickNotes = ({ noteId, noteTitle, onBack }) => {
  const DEMO_TIMELINE_DATA = DEMO_STEPS.map(s => s.item);
  // Demo 交互控制器 — 每种操作匹配对应步骤
  const [demoStep, setDemoStep] = useState(isDemo ? 0 : -1);
  const [demoRecClicks, setDemoRecClicks] = useState(0);
  const [demoTextCount, setDemoTextCount] = useState(0);

  const demoTrigger = (action) => {
    // 找到下一个匹配 action 的步骤
    let found = -1;
    for (let i = 0; i < DEMO_STEPS.length; i++) {
      const s = DEMO_STEPS[i];
      if (s.action === action && i >= demoStep) {
        // 跳过已经执行过的同类型步骤
        const sameTypeBefore = DEMO_STEPS.slice(0, i).filter(x => x.action === action).length;
        const sameTypeDone = action === 'asr' ? demoRecClicks : action === 'text' ? demoTextCount : 0;
        if (sameTypeBefore === sameTypeDone) { found = i; break; }
      }
    }
    if (found < 0) return;
    const s = DEMO_STEPS[found];
    if (s.action === 'ai') {
      setAiProgress(0);
      setTimeout(() => { setStructuredNotes(DEMO_STRUCTURED); setAiProgress(100); setTimelineItems(prev => [...prev, s.item]); }, 600);
    } else if (s.action === 'file') {
      setTimelineItems(prev => [...prev, s.item]);
      setResources(prev => [...prev, { id: s.item.id, name: s.item.fileName, type: 'DOCX', size: '45 KB' }]);
    } else if (s.action === 'rec_start') {
      setRecordingStatus('recording');
      setTimelineItems(prev => [...prev, s.item]);
    } else {
      setTimelineItems(prev => [...prev, s.item]);
    }
    if (s.action === 'text') setDemoTextCount(p => p + 1);
    if (s.action === 'rec_start') setDemoRecClicks(0);
    if (s.action === 'asr') setDemoRecClicks(p => p + 1);
    setDemoStep(found + 1);
  };

  const [recordingStatus, setRecordingStatus] = useState('not_started');
  const [recordingTime, setRecordingTime] = useState(0);
  const [noteName, setNoteName] = useState(noteTitle || '未命名笔记');
  const [isEditingNoteName, setIsEditingNoteName] = useState(false);
  const [noteNameInput, setNoteNameInput] = useState(noteTitle || '未命名笔记');
  const [timelineItems, setTimelineItems] = useState(INITIAL_TIMELINE);
  const [resources, setResources] = useState([]);
  const [structuredNotes, setStructuredNotes] = useState(INITIAL_STRUCTURED);
  const [annotations, setAnnotations] = useState(INITIAL_ANNOTATIONS);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [aiProgress, setAiProgress] = useState(isDemo ? 100 : 100);
  const [toast, setToast] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recStartTime, setRecStartTime] = useState(null);
  const [personalNote, setPersonalNote] = useState('');
  const [showSavePicker, setShowSavePicker] = useState(false);
  const fileRef = useRef(null);
  const [saveResult, setSaveResult] = useState(null);
  const timelineRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // 加载已有速记
  useEffect(() => {
    if (noteId) {
      setLoading(true);
      fetchQuickNote(noteId)
        .then((res) => {
          const d = res.data || {};
          setNoteName(d.title || '未命名笔记');
          setNoteNameInput(d.title || '未命名笔记');
          if (d.timelineItems) setTimelineItems(d.timelineItems);
          if (d.structuredNotes) setStructuredNotes(d.structuredNotes);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [noteId]);

  useEffect(() => { if (timelineRef.current) timelineRef.current.scrollTop = timelineRef.current.scrollHeight; }, [timelineItems]);
  useEffect(() => { let i; if (recordingStatus==='recording'){i=setInterval(()=>setRecordingTime(p=>p+1),1000);} return ()=>clearInterval(i); },[recordingStatus]);
  useEffect(() => { if(toast){const t=setTimeout(()=>setToast(''),2000);return ()=>clearTimeout(t);} },[toast]);
  const showToast = (msg) => setToast(msg);
  const fmt = (s) => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const startRecording = () => {
    if (isDemo) { demoTrigger('start'); return; }
    setRecordingStatus('recording'); setRecordingTime(0); setTimelineItems(p=>[...p,{id:Date.now(),type:'recording_start',content:'开始学习',timestamp:fmt(0)}]);
  };
  const pauseRecording = () => setRecordingStatus('paused');
  const triggerAiParse = () => { setAiProgress(0); showToast('AI 正在解析...'); let p=0; const iv=setInterval(()=>{p+=Math.random()*20;if(p>=100){p=100;clearInterval(iv);showToast('AI 结构化笔记已更新');} setAiProgress(p);},400); };
  const stopRecording = () => {
    if (isDemo) { demoTrigger('ai'); return; }
    setRecordingStatus('not_started'); const t=fmt(recordingTime); setTimelineItems(p=>[...p,{id:Date.now(),type:'recording_end',content:'结束学习',timestamp:t}]); showToast('学习记录已保存');
  };
  const sendText = () => {
    if (isDemo) { demoTrigger('text'); return; }
    if(textInput.trim()){setTimelineItems(p=>[...p,{id:Date.now(),type:'text',content:textInput.trim(),timestamp:fmt(recordingTime),tags:[]}]);setTextInput(''); triggerAiParse();}
  };
  const handleSave = () => setShowSavePicker(true);
  const handleSaveDone = (result) => { setShowSavePicker(false); setSaveResult(result); showToast(`已保存到 ${result.path}`); };
  const handleViewSource = (note) => { const rid=note.relatedItems?.[0]; if(rid){ const el=document.querySelector(`[data-timeline-id="${rid}"]`); if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.backgroundColor='#10A37F';setTimeout(()=>el.style.backgroundColor='',1500);} } };
  const [ideaInput, setIdeaInput] = useState('');
  const [showIdeaInput, setShowIdeaInput] = useState(false);
  const [showIdeaMenu, setShowIdeaMenu] = useState(null);
  const addTag = (t) => { if(!selectedNoteId)return;
    if(t==='我的想法'){ setShowIdeaInput(true); return; }
    setStructuredNotes(p=>p.map(n=>n.id===selectedNoteId&&!n.tags.includes(t)?{...n,tags:[...n.tags,t]}:n));
    setAnnotations(p=>p.map(a=>a.type===t?{...a,count:a.count+1}:a)); showToast(`已标记为"${t}"`);
  };
  const saveIdea = () => { if(!ideaInput.trim()||!selectedNoteId)return;
    setStructuredNotes(p=>p.map(n=>n.id===selectedNoteId&&!n.tags.includes('我的想法')?{...n,tags:[...n.tags,'我的想法'],idea:ideaInput.trim()}:n));
    setAnnotations(p=>p.map(a=>a.type==='我的想法'?{...a,count:a.count+1}:a));
    setIdeaInput(''); setShowIdeaInput(false); showToast('我的想法已保存');
  };
  const removeTag = (t) => { if(!selectedNoteId)return;
    setStructuredNotes(p=>p.map(n=>n.id===selectedNoteId?{...n,tags:n.tags.filter(x=>x!==t),idea:t==='我的想法'?undefined:n.idea}:n));
    setAnnotations(p=>p.map(a=>a.type===t?{...a,count:Math.max(0,a.count-1)}:a)); showToast(`已取消"${t}"`);
  };
  const showIdea = (note) => { setSelectedNoteId(note.id); setShowIdeaInput(false); showToast(note.idea||'暂无笔记'); };
  const saveAnnotation = () => { if(personalNote.trim()){showToast('批注已保存');setPersonalNote('');} };
  const sel = () => structuredNotes.find(n=>n.id===selectedNoteId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[#9ca3af]">加载速记内容...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4" style={{ height: 'calc(100vh - 140px)' }}>
      {toast && (<div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-[#1F1F1F] shadow-md" style={{backgroundColor:'#10A37F'}}>{toast} {saveResult && <button onClick={()=>window.location.href='/note-management'} className="ml-2 underline font-bold">立即打开</button>}</div>)}
      {showSavePicker && <SaveFolderPicker fileName={`${noteName}.md`} onSave={handleSaveDone} onCancel={()=>setShowSavePicker(false)}/>}

      {/* 顶栏 */}
      <div className="card p-4 flex-shrink-0"><div className="flex items-center">
        <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-[#f3f4f6] transition-colors mr-2">
          <svg className="h-5 w-5 text-[#7B7B7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="w-1/4">{isEditingNoteName?(<div className="flex items-center gap-2"><input className="input-base !py-2" value={noteNameInput} onChange={e=>setNoteNameInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(setNoteName(noteNameInput.trim()),setIsEditingNoteName(false))} autoFocus/><button className="text-xs font-semibold text-[#1A7A57]" onClick={()=>(setNoteName(noteNameInput.trim()),setIsEditingNoteName(false))}>保存</button></div>):(<h2 className="text-lg font-bold text-[#1F1F1F] cursor-pointer hover:opacity-70" onClick={()=>setIsEditingNoteName(true)}>{noteName}</h2>)}</div>
        <div className="w-1/2 flex items-center justify-center gap-3"><span className={`badge text-[10px] ${recordingStatus==='recording'?'bg-[#E9E2F7] text-[#5B3FA8]':recordingStatus==='paused'?'bg-[#E2EBF7] text-[#2C5282]':'bg-black/[0.04] text-[#7B7B7B]'}`}>{recordingStatus==='recording'?'正在学习':recordingStatus==='paused'?'已暂停':'未开始'}</span>{recordingStatus==='recording'&&<span className="text-sm text-[#7B7B7B] font-medium">{fmt(recordingTime)}</span>}<div className="flex gap-2">{recordingStatus==='not_started'&&<button onClick={startRecording} className="btn-primary">开始记录</button>}{recordingStatus==='recording'&&<><button onClick={pauseRecording} className="btn-ghost">暂停</button><button onClick={stopRecording} className="btn-ghost">结束</button></>}{recordingStatus==='paused'&&<><button onClick={startRecording} className="btn-primary">继续</button><button onClick={stopRecording} className="btn-ghost">结束</button></>}</div></div>
        <div className="w-1/4 flex items-center justify-end gap-3">
          <button onClick={handleSave} className="btn-ghost">保存速记</button>
          <button onClick={handleSave} className="btn-primary">导出笔记</button>
        </div>
      </div></div>

      {/* 主区域：左时间流 + 右 AI 结构化 */}
      <div className="flex-1 flex gap-5 min-h-0">
        {/* 左: 时间流记录 */}
        <div className="w-[45%] card flex flex-col min-h-0">
          <div className="p-4 border-b border-[#ECECEC] flex-shrink-0"><h3 className="font-semibold text-[#1F1F1F] text-center">速记时间流</h3></div>
          {resources.length>0 && (<div className="p-3 border-b border-[#ECECEC] flex-shrink-0"><div className="flex gap-2 overflow-x-auto">{resources.map(r=>(<div key={r.id} className="flex-shrink-0 p-2 rounded-xl text-xs bg-[#FAFAFA] border border-[#ECECEC]"><span className="font-medium">{r.name}</span></div>))}</div></div>)}
          <div className="flex-1 overflow-y-auto p-4" ref={timelineRef}><div className="space-y-3">{timelineItems.map(item=>(<div key={item.id} className="flex gap-3" data-timeline-id={item.id}><div className="w-14 flex-shrink-0"><span className="text-[10px] text-[#A0A0A0] font-medium">{item.timestamp}</span></div><div className="flex-1">{item.type==='text'&&<div className="p-3 rounded-2xl bg-[#FAFAFA]"><p className="text-sm text-[#1F1F1F] leading-relaxed">{item.content}</p></div>}{item.type==='recording'&&<div className="p-3 rounded-2xl" style={{backgroundColor:'#E2EBF7'}}><div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-[#2C5282]">录音片段</span><span className="text-[10px] text-[#2C5282]">{item.duration}</span></div><p className="text-sm text-[#1F1F1F] mb-1">{item.content}</p>{item.transcript&&<p className="text-[10px] text-[#2C5282] italic p-2 rounded-xl bg-white/60">{item.transcript}</p>}</div>}{item.type==='resource'&&<div className="p-3 rounded-2xl" style={{backgroundColor:'#E9E2F7'}}><p className="text-xs font-semibold text-[#5B3FA8]">{item.content}</p></div>}{item.type==='system'&&<p className="text-xs text-[#A0A0A0] italic px-1">{item.content}</p>}{item.type==='recording_start'&&<div className="p-2 rounded-2xl bg-[#E9E2F7] flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#5B3FA8]"/><p className="text-xs text-[#5B3FA8] font-semibold">{item.content} · {item.timestamp}</p></div>}
                {item.type==='recording_end'&&<div className="p-2 rounded-2xl bg-[#fce4e4] flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#c0392b]"/><p className="text-xs text-[#c0392b] font-semibold">{item.content} · {item.timestamp}</p></div>}</div></div>))}</div></div>
          {/* 底部输入 */}
          <div className="p-4 border-t border-[#ECECEC] flex items-center gap-2 flex-shrink-0">
            <button onClick={()=>{
              if (isDemo) { demoTrigger(isRecording ? 'asr' : 'rec_start'); return; }
              if(!isRecording){
                const t=fmt(recordingTime); setRecStartTime(t);
                setTimelineItems(p=>[...p,{id:Date.now(),type:'recording_start',content:'录音开始',timestamp:t}]);
                setIsRecording(true); showToast('录音已开始');
              }else{
                const endT=fmt(recordingTime); const dur=recordingTime;
                const durStr=`${Math.floor(dur/60)}分${dur%60}秒`;
                setTimelineItems(p=>[...p,
                  {id:Date.now(),type:'recording_end',content:'录音结束',timestamp:endT},
                  {id:Date.now(),type:'recording',content:'课堂录音片段',timestamp:recStartTime,endTimestamp:endT,duration:durStr,transcript:'录音转写中...'}
                ]);
                setIsRecording(false); showToast('录音已结束'); triggerAiParse();
              }
            }}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                ${isRecording?'bg-[#c0392b] text-white shadow-[0_0_0_4px_rgba(192,57,43,0.2)]':'bg-[#f5f5f5] text-[#7B7B7B] hover:bg-[#ECECEC]'}`}>
              {isRecording?<span className="flex items-center gap-0.5"><span className="w-1 h-3 bg-white rounded-full animate-[wave_0.6s_ease-in-out_infinite]"/><span className="w-1 h-4 bg-white rounded-full animate-[wave_0.6s_ease-in-out_0.15s_infinite]"/><span className="w-1 h-2.5 bg-white rounded-full animate-[wave_0.6s_ease-in-out_0.3s_infinite]"/></span>:<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/></svg>}
            </button>
            {isRecording && <span className="text-[10px] text-[#c0392b] font-medium animate-pulse">录音中</span>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={()=>showToast('图片已添加到时间流')}/>
            <button onClick={()=>{ if(isDemo){demoTrigger('file');return;}fileRef.current?.click();}} className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#f5f5f5] text-[#7B7B7B] hover:bg-[#ECECEC] transition-colors flex-shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            </button>
            <div className="flex-1 flex items-center rounded-xl bg-[#f3f4f6] border border-[#e5e7eb] px-3">
              <input className="flex-1 bg-transparent text-sm placeholder:text-[#A0A0A0] focus:outline-none py-2" placeholder="快速输入笔记内容..." value={textInput} onChange={e=>setTextInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendText()}/>
            </div>
            <button onClick={sendText} disabled={!textInput.trim()} className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors disabled:opacity-60">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
            </button>
          </div>
        </div>

        {/* 右: AI 结构化笔记 */}
        <div className="flex-1 card flex flex-col min-h-0">
          <div className="p-4 border-b border-[#ECECEC] flex-shrink-0"><h3 className="font-semibold text-[#1F1F1F] text-center">AI 结构化笔记</h3></div>
          <div className="px-4 py-3 flex-shrink-0"><div className="flex justify-between text-[10px] text-[#A0A0A0] mb-1"><span>AI 解析进度</span><span>{Math.round(aiProgress)}%</span></div><div className="progress-bar h-1.5"><div className="progress-fill" style={{width:`${aiProgress}%`,backgroundColor:'#10A37F'}}/></div></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">{structuredNotes.map(note=>(
            <div key={note.id} onClick={()=>setSelectedNoteId(note.id)} className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${selectedNoteId===note.id ? 'border-[#10A37F] ring-1 ring-[#10A37F]/30' : 'border-[#E5E7EB] hover:border-[#10A37F]/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${TYPE_BADGE_COLORS[note.type]||'bg-[#f3f4f6] text-[#6B7280]'}`}>{note.type}</span>
                  <span className="text-[10px] text-[#A0A0A0]">{note.timestamp}</span>
                </div>
                <span className="text-[10px] text-[#A0A0A0]">{note.source}</span>
              </div>
              <h4 className="font-semibold text-sm text-[#1F1F1F] mb-1.5">{note.title}</h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">{note.content}</p>
              {note.tags?.length > 0 && (
                <div className="flex gap-1 mt-2 pt-2 border-t border-[#f3f4f6]">
                  {note.tags.map(t=>{
                    const def=TAG_DEFS.find(x=>x.label===t);
                    return <span key={t} className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{backgroundColor:def?.bg||'#f3f4f6',color:def?.t||'#6b7280'}}>{t}</span>;
                  })}
                </div>
              )}
            </div>
          ))}
          {/* 选中后快速标签 */}
          {selectedNoteId && (
            <div className="flex gap-1.5 px-1 flex-wrap pt-1">
              {TAG_DEFS.map(tag=>(
                <button key={tag.label} onClick={()=>addTag(tag.label)} className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:-translate-y-0.5" style={{backgroundColor:tag.bg,color:tag.t}}>{tag.label}</button>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickNotes;
