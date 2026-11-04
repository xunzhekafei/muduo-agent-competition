import React, { useState, useCallback, useEffect, useRef } from 'react';
import NoteWorkspace from './NoteWorkspace';
import AIAsidePanel from './AIAsidePanel';
import { fetchCourses, deleteCourse, createCourse, createLearningSpace, updateCourse, updateLearningSpace, deleteLearningSpace } from '../../api/courses';
import { fetchNotes, fetchNoteDetail, deleteNote, updateNote, createNote } from '../../api/notes';
import { useNavigate } from 'react-router-dom';
import { NOTE_TYPE_LABEL } from '../../shared/constants';
import { createSharedAsset } from '../../api/community';
import { PageHeader, Button, Loading, ErrorState, EmptyState, Icon } from '../../shared/ui';
import { useAgent } from '../agent/AgentContext';

const FolderIcon = ({ size=20 }) => (
  <svg width={size} height={size*0.82} viewBox="0 0 36 30" fill="none">
    <path d="M2 7a2.5 2.5 0 012.5-2.5h8.5l3 2h13.5a2.5 2.5 0 012.5 2.5V24a2.5 2.5 0 01-2.5 2.5H4.5A2.5 2.5 0 012 24V7z" fill="#F7ECD9" stroke="#E5D9B0" strokeWidth="1.5"/>
    <path d="M2 9v15a2.5 2.5 0 002.5 2.5h24a2.5 2.5 0 002.5-2.5V9H2z" fill="#FFFDF5" stroke="#E5D9B0" strokeWidth="1.5"/>
  </svg>
);

const FileIcon = ({ size=18 }) => (
  <svg width={size} height={size*1.15} viewBox="0 0 20 23" fill="none">
    <path d="M1 2.5A1.5 1.5 0 012.5 1h11l5.5 5.5v14a1.5 1.5 0 01-1.5 1.5H2.5A1.5 1.5 0 011 20.5v-18z" fill="#fff" stroke="#D0D0D0" strokeWidth="1.2"/>
    <path d="M13.5 1v5.5H19" fill="#F5F5F5" stroke="#D0D0D0" strokeWidth="1.2"/>
  </svg>
);

const RenameIcon = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z"/>
  </svg>
);

const DeleteIcon = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18 18 6M6 6l12 12"/>
  </svg>
);

const ICON_NOTE = 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z';
const ICON_CHAT = 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z';

const DEFAULT_TREE = { id:'root', name:'我的课程', children:[] };

const findNode=(n,id)=>{if(n.id===id)return n;if(n.children)for(const c of n.children){const f=findNode(c,id);if(f)return f;}return null;};
const getBreadcrumb=(t,id,p=[])=>{if(t.id===id)return[...p,t];if(t.children)for(const c of t.children){const f=getBreadcrumb(c,id,[...p,t]);if(f)return f;}return null;};

const NoteManagement = () => {
  const [tree,setTree]=useState(DEFAULT_TREE);
  const [currentDir,setCurrentDir]=useState('root');
  const [selectedFile,setSelectedFile]=useState(null);
  const [viewMode,setViewMode]=useState('grid');
  const [showNewCourse,setShowNewCourse]=useState(false);
  const [newCourseName,setNewCourseName]=useState('');
  const [renaming,setRenaming]=useState(null);
  const [renameValue,setRenameValue]=useState('');
  const [recentFiles,setRecentFiles]=useState([]);
  const [toast,setToast]=useState('');
  const [search,setSearch]=useState('');
  const [searchResults,setSearchResults]=useState(null);
  const [searching,setSearching]=useState(false);
  const [searchFocused,setSearchFocused]=useState(false);
  const [scrollToBlockId,setScrollToBlockId]=useState(null);
  const [loading, setLoading] = useState(true);
  const [contextMenu,setContextMenu]=useState(null);
  const [showMoveDialog,setShowMoveDialog]=useState(false);
  const [moveTarget,setMoveTarget]=useState(null);
  const [coursesList,setCoursesList]=useState([]);
  const [showArchived,setShowArchived]=useState(false);
  const [archivedNotes,setArchivedNotes]=useState([]);
  const [renderError,setRenderError]=useState(null);

  const { askAI } = useAgent();
  const navigate = useNavigate();
  const askAboutNotes = () => {
    askAI('帮我根据我的笔记，看看最近该复习什么、哪里比较薄弱');
    navigate('/agent');
  };

  // 撤销/重做栈
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  const pushAction = useCallback((label, undoFn, redoFn) => {
    undoStackRef.current.push({ label, undo: undoFn, redo: redoFn });
    redoStackRef.current = [];
    setUndoCount(undoStackRef.current.length);
    setRedoCount(0);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
  }, []);

  const handleUndo = useCallback(async () => {
    const action = undoStackRef.current.pop();
    if (!action) return;
    try { await action.undo(); redoStackRef.current.push(action); showToast('已撤销: '+action.label); }
    catch (e) { console.error('撤销失败:', e.message || e); showToast('撤销失败'); }
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
  }, []);

  const handleRedo = useCallback(async () => {
    const action = redoStackRef.current.pop();
    if (!action) return;
    try { await action.redo(); undoStackRef.current.push(action); }
    catch (e) { console.error('重做失败', e); }
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
  }, []);

  // Ctrl+Z / Ctrl+Y 快捷键
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // 从 API 数据重建目录树（笔记直接放在课程下）
  const buildTree = useCallback((courses, notes) => {
    const noteMap = {};
    notes.forEach(n => {
      const cid = n.courseId || '_uncategorized';
      if (!noteMap[cid]) noteMap[cid] = [];
      noteMap[cid].push({ id: n.id, name: n.title + '.md', _type: 'note', noteType: n.noteType });
    });
    return {
      id: 'root',
      name: '我的课程',
      children: courses.map(c => ({
        id: c.id, name: c.name, _type: 'course',
        children: noteMap[c.id] || [],
      })),
    };
  }, []);

  const reloadTree = useCallback(async (includeArchived) => {
    try {
      const [coursesResp, notesResp] = await Promise.all([
        fetchCourses().catch(() => ({ data: [] })),
        fetchNotes({ pageSize: 100 }).catch(() => ({ data: [] })),
      ]);
      const allNotes = notesResp.data || [];
      const activeNotes = allNotes.filter(n => n.status !== 'archived');
      const archived = allNotes.filter(n => n.status === 'archived');
      setArchivedNotes(archived);
      setTree(buildTree(coursesResp.data || [], activeNotes));
    } catch(e) { console.error('reloadTree error',e); setRenderError('数据加载失败'); }
  }, [buildTree]);

  // Load courses and notes from API on mount
  useEffect(() => {
    let cancelled = false;
    reloadTree().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadTree]);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const q = search.trim();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        if (selectedFile && !selectedFile.children) {
          // In-note search: search within current note's blocks
          const res = await fetchNoteDetail(selectedFile.id);
          const blocks = res.data?.blocks || res.blocks || [];
          const matches = blocks
            .filter(b => b.content && b.content.toLowerCase().includes(q.toLowerCase()))
            .map(b => {
              const idx = b.content.toLowerCase().indexOf(q.toLowerCase());
              const start = Math.max(0, idx - 10);
              const end = Math.min(b.content.length, idx + q.length + 10);
              let snippet = b.content.slice(start, end);
              if (start > 0) snippet = '...' + snippet;
              if (end < b.content.length) snippet += '...';
              return { id: b.id, blockType: b.type, content: b.content, snippet, position: b.position };
            });
          setSearchResults(matches);
        } else {
          // Global search across all notes
          const res = await fetchNotes({ q, pageSize: 10 });
          setSearchResults(res.data || []);
        }
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedFile]);

  const highlightText = (text, q) => {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-[#10A37F]/50 text-[#1f2937] rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </span>
    );
  };

  const handleSearchSelect = (item) => {
    setSearchResults(null);
    setSearch('');
    setSearchFocused(false);
    if (selectedFile && !selectedFile.children) {
      // In-note search: scroll to block
      setScrollToBlockId(item.id);
    } else {
      // Global search: navigate to note
      const cid = item.courseId;
      if (cid && tree.children) {
        const course = tree.children.find(c => c.id === cid);
        if (course) setCurrentDir(cid);
      }
      setSelectedFile({ id: item.id, name: (item.title || '') + '.md', type: 'note' });
    }
  };

  const handleRestore=async(note)=>{try{await updateNote(note.id,{status:'active'});await reloadTree();showToast('已恢复');}catch{showToast('恢复失败');}};

  const showToast=useCallback((msg,action=null)=>{setToast({msg,action});if(!action)setTimeout(()=>setToast(''),2000);},[]);

  // 归档笔记
  const handleArchive=async(item)=>{setContextMenu(null);try{const undoName=item.name.replace(/\.md$/i,'');const redoFn=async()=>{await updateNote(item.id,{status:'archived'});setTree(t=>{const p=findNode(t,currentDir);if(p){p.children=p.children.filter(c=>c.id!==item.id)}return{...t}});};const undoFn=async()=>{await updateNote(item.id,{status:'active'});await reloadTree();};await redoFn();pushAction('归档',undoFn,redoFn);showToast('已归档',undoFn);}catch(e){console.error(e);showToast('归档失败');}};

  // 移动笔记到其他课程
  const handleMoveStart=async(item)=>{setContextMenu(null);setMoveTarget(item);try{const r=await fetchCourses();const courses=r.data||[];setCoursesList(courses.filter(c=>c.id!==item.courseId));setShowMoveDialog(true);}catch{showToast('加载课程失败');}};
  const handleMoveConfirm=async(courseId)=>{if(!moveTarget)return;try{await updateNote(moveTarget.id,{courseId});await reloadTree();showToast('已移动');}catch{showToast('移动失败');}setShowMoveDialog(false);setMoveTarget(null);};

  // 导出 Markdown
  const handleExportMarkdown = async (item) => {
    setContextMenu(null);
    try {
      const detail = await fetchNoteDetail(item.id);
      const d = detail.data || detail;
      const note = d.note || d;
      const blocks = d.blocks || [];
      const mdLines = ['# ' + (note.title || item.name), ''];
      blocks.forEach(b => {
        const type = b.blockType || b.type;
        if (type === 'heading') {
          const level = b.level || 2;
          mdLines.push('#'.repeat(level) + ' ' + b.content, '');
        } else {
          mdLines.push(b.content, '');
        }
      });
      const md = mdLines.join(String.fromCharCode(10));
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = (note.title || item.name).replace(/\.md$/i,'') + '.md';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { showToast('导出失败'); }
  };

  // 分享到社区
  const handleShareToCommunity = async (item) => {
    setContextMenu(null);
    try {
      const title = item.name.replace(/\.md$/i, '');
      await createSharedAsset({ title, assetType: 'note', sourceId: item.id, visibility: 'public' });
      showToast('已分享到社区');
    } catch { showToast('分享失败'); }
  };

  // 关闭右键菜单（点击空白处/Esc）
  useEffect(()=>{const handler=()=>{setContextMenu(null)};if(contextMenu){window.addEventListener('click',handler);window.addEventListener('scroll',handler,true)}return()=>{window.removeEventListener('click',handler);window.removeEventListener('scroll',handler,true)}},[contextMenu]);
  useEffect(()=>{const handler=(e)=>{if(e.key==='Escape'){setContextMenu(null);setShowMoveDialog(false)}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[]);
  const current=findNode(tree,currentDir);
  const breadcrumb=getBreadcrumb(tree,currentDir)||[];
  const items=current?.children||[];
  const isRoot=currentDir==='root';
  const filtered=items;

  const handleOpenFolder=(id)=>{setCurrentDir(id);setSelectedFile(null);};
  const handleBack=()=>{if(isRoot)return;const p=breadcrumb[breadcrumb.length-2];if(p)setCurrentDir(p.id);};
  const handleSelectFile=(f)=>{if(f.children)handleOpenFolder(f.id);else{setSelectedFile(f);setRecentFiles(p=>{const n=[f,...p.filter(x=>x.id!==f.id)].slice(0,5);return n;});}};
  const handleNewCourse=async()=>{if(!newCourseName.trim())return;try{const cname=newCourseName.trim();const res=await createCourse({name:cname,subject:"未分类",description:""});const course=res.data;const courseNode={id:course.id,name:course.name,_type:"course",children:[]};setTree(p=>({...p,children:[...p.children,courseNode]}));pushAction("新建文件夹",async()=>{await deleteCourse(course.id);await reloadTree();},async()=>{const r=await createCourse({name:cname,subject:"未分类",description:""});courseNode.id=r.data.id;await reloadTree();});setNewCourseName("");setShowNewCourse(false);showToast("已创建",async()=>{await deleteCourse(course.id);await reloadTree();});}catch{showToast("创建失败");}};
  const handleNewNote=async()=>{if(!current)return;try{const realCourseId=current._type==='group'?current._parentId:(current.id==='root'?null:current.id);const res=await createNote({title:'新笔记',courseId:realCourseId});const note=res.data;const noteNode={id:note.id,name:(note.title||'新笔记')+'.md',_type:'note'};current.children=current.children||[];current.children.push(noteNode);setTree({...tree});pushAction('新建笔记',async()=>{await deleteNote(note.id);await reloadTree();},async()=>{const r=await createNote({title:'新笔记',courseId:current.id==='root'?null:current.id});noteNode.id=r.data.id;await reloadTree();});showToast('笔记已创建');}catch(e){console.error(e);showToast('创建失败');}};
  const handleDelete=async(e,id)=>{e.stopPropagation();if(!current)return;const item=current.children.find(c=>c.id===id);if(!item)return;try{const t=item._type||(item.children?(currentDir==='root'?'course':'space'):'note');const itemName=item.name.replace(/\.md$/i,'');let cid=null;if(t==='space')cid=item._parentId||currentDir;const action={label:'删除',newId:null,undo:async()=>{if(t==='course'){const r=await createCourse({name:itemName,subject:"未分类",description:""});action.newId=r.data.id;}else if(t==='space'){const r=await createLearningSpace(cid,{name:itemName});action.newId=r.data.id;}else{const r=await createNote({title:itemName,courseId:currentDir});action.newId=r.data.id;}await reloadTree();},redo:async()=>{const targetId=action.newId||id;if(t==='course')await deleteCourse(targetId);else if(t==='space')await deleteLearningSpace(cid,targetId);else await deleteNote(targetId);await reloadTree();}};await action.redo();pushAction('删除',()=>action.undo(),()=>action.redo());showToast('已删除',()=>action.undo());}catch(e){console.error(e);showToast('删除失败');}};
  const handleRenameStart=(e,item)=>{e.stopPropagation();setRenaming(item.id);setRenameValue(item.name);};
  const handleRenameDone=async()=>{const v=renameValue.trim();if(!v||!renaming)return;const n=findNode(tree,renaming);if(!n){console.warn('rename: node not found',{renaming});setRenaming(null);return;}const oldName=n.name;try{const t=n._type||(n.children?(currentDir==='root'?'course':'space'):'note');if(t==='course'){await updateCourse(renaming,{name:v});}else if(t==='space'){const cid=n._parentId||currentDir;await updateLearningSpace(cid,renaming,{name:v});}else{const title=v.replace(/\.md$/i,'');await updateNote(renaming,{title});}n.name=v;setTree({...tree});setRenaming(null);pushAction('重命名',async()=>{const nn=findNode(tree,renaming);if(!nn)return;if(t==='course'){await updateCourse(renaming,{name:oldName});}else if(t==='space'){const cid=nn._parentId||currentDir;await updateLearningSpace(cid,renaming,{name:oldName});}else{await updateNote(renaming,{title:oldName.replace(/\.md$/i,'')});}nn.name=oldName;setTree({...tree});},async()=>{const nn=findNode(tree,renaming);if(!nn)return;if(t==='course'){await updateCourse(renaming,{name:v});}else if(t==='space'){const cid=nn._parentId||currentDir;await updateLearningSpace(cid,renaming,{name:v});}else{await updateNote(renaming,{title:v});}nn.name=v;setTree({...tree});});showToast('已重命名');}catch(e){console.error('rename error',e);showToast('重命名失败');}};

  if (renderError) {
    return (
      <div style={{ height: 'calc(100vh - 140px)' }}>
        <ErrorState
          message={renderError}
          onRetry={() => { setLoading(true); setRenderError(null); reloadTree().finally(() => setLoading(false)); }}
        />
      </div>
    );
  }

  if (loading) {
    return <Loading className="min-h-[calc(100vh-140px)]" />;
  }

  return (
    <div className="flex flex-col" style={{height:'calc(100vh - 140px)',color:'#1f2937'}}>
      {toast&&(
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg flex items-center gap-4 bg-[#10A37F]">
          <span>{toast.msg}</span>
          {toast.action && (
            <button onClick={()=>{toast.action();setToast('');}} className="font-bold underline hover:no-underline flex-shrink-0">撤销</button>
          )}
        </div>
      )}

      <PageHeader
        icon={ICON_NOTE}
        title="我的笔记"
        description="按课程浏览、编辑笔记，支持撤销 / 归档 / 搜索"
        actions={
          <>
            <Button variant="ghost" onClick={askAboutNotes}>
              <Icon d={ICON_CHAT} className="h-4 w-4" />
              问 AI
            </Button>
            <Button variant="secondary" onClick={() => setShowNewCourse(!showNewCourse)}>
              新建文件夹
            </Button>
            {!isRoot && (!current._type || current._type !== 'group' || current.name === '我的笔记') && (
              <Button onClick={handleNewNote}>新建笔记</Button>
            )}
          </>
        }
      />

      {/* 工具栏 */}
      <div className="flex items-center justify-end mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
            <input className="pl-9 pr-3 py-1.5 rounded-xl text-xs bg-[#f3f4f6] w-48 focus:outline-none focus:ring-1 focus:ring-[#10A37F]" placeholder="搜索笔记..." value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setSearchFocused(true)} onBlur={()=>setTimeout(()=>setSearchFocused(false),200)}/>
            {search.trim() && searchFocused && (
              <div className="absolute top-full mt-1 left-0 w-[420px] bg-white rounded-xl shadow-lg border border-[#e5e7eb] z-50 max-h-[400px] overflow-y-auto">
                {searching ? (
                  <div className="px-4 py-3 text-xs text-[#9ca3af]">搜索中...</div>
                ) : !searchResults || searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-[#9ca3af]">未找到匹配内容</div>
                ) : selectedFile && !selectedFile.children ? (
                  // In-note block search results
                  searchResults.map(b => (
                    <button
                      key={b.id}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSearchSelect(b)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#f9fafb] border-b border-[#f3f4f6] last:border-b-0 transition-colors"
                    >
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f3f4f6] text-[#6b7280] mr-2">{b.blockType}</span>
                      <p className="text-xs text-[#444] leading-relaxed mt-1">{highlightText(b.snippet, search.trim())}</p>
                    </button>
                  ))
                ) : (
                  // Global note search results
                  searchResults.map(n => (
                    <button
                      key={n.id}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSearchSelect(n)}
                      className="w-full text-left px-4 py-3 hover:bg-[#f9fafb] border-b border-[#f3f4f6] last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#1f2937]">{n.title}</span>
                        {n.courseName && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f3f4f6] text-[#6b7280]">{n.courseName}</span>}
                      </div>
                      {n.snippet && (
                        <p className="text-xs text-[#6b7280] leading-relaxed line-clamp-2">{highlightText(n.snippet, search.trim())}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {/* 撤销/重做 */}
          <button onClick={handleUndo} disabled={undoCount===0} className={`p-1.5 rounded-md transition-colors ${undoCount===0?'text-[#d0d0d0]':'text-[#6b7280] hover:bg-[#e5e7eb]'}`} title="撤销 (Ctrl+Z)">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
          </button>
          <button onClick={handleRedo} disabled={redoCount===0} className={`p-1.5 rounded-md transition-colors ${redoCount===0?'text-[#d0d0d0]':'text-[#6b7280] hover:bg-[#e5e7eb]'}`} title="重做 (Ctrl+Y)">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"/></svg>
          </button>
          <button onClick={()=>{setShowArchived(!showArchived);if(!showArchived)reloadTree()}} className={`p-1.5 rounded-md transition-colors ${showArchived?'bg-[#fce4e4] text-[#c0392b]':'text-[#6b7280] hover:bg-[#e5e7eb]'}`} title="归档笔记">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25 2.25-2.25M5.25 7.5h13.5M5.25 7.5l1.2-1.956A2.25 2.25 0 018.48 4.5h7.04a2.25 2.25 0 012.03 1.044L18.75 7.5"/></svg>
          </button>
          <span className="text-xs text-[#9ca3af]">{showArchived?archivedNotes.length:items.length} 项</span>
          <div className="flex bg-[#f3f4f6] rounded-lg p-0.5">
            {['grid','list'].map(m=>(<button key={m} onClick={()=>setViewMode(m)} className={`p-1.5 rounded-md transition-colors ${viewMode===m?'bg-white shadow-sm':'text-[#9ca3af]'}`}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{m==='grid'?<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>:<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>}</svg></button>))}
          </div>
        </div>
      </div>
      {showNewCourse&&(<div className="mb-3 flex gap-2"><input className="input-base flex-1 !py-2 !text-sm" placeholder="课程名称" value={newCourseName} onChange={e=>setNewCourseName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleNewCourse()} autoFocus/><button onClick={handleNewCourse} className="btn-primary !h-9 !text-xs">创建</button><button onClick={()=>setShowNewCourse(false)} className="btn-ghost !h-9 !text-xs">取消</button></div>)}

      {/* 归档视图 */}
      {showArchived&&(
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#f3f4f6] overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-[#1F1F1F] mb-4">归档笔记</h2>
          {archivedNotes.length===0?(<div className="flex flex-col items-center justify-center py-20 text-center"><p className="text-[#A0A0A0] text-sm">没有归档笔记</p></div>
          ):(<div className="space-y-2">{archivedNotes.map(n=>(<div key={n.id} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#f5f5f5] transition-colors"><div><p className="text-sm font-medium text-[#1F1F1F]">{n.title}</p><p className="text-xs text-[#A0A0A0]">{n.courseName||'未分类'}</p></div><button onClick={()=>handleRestore(n)} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">恢复</button></div>))}</div>)}
        </div>
      )}

      {/* 空状态引导 */}
      {!showArchived&&!selectedFile&&tree.children?.length===0&&(
        <div className="flex-1 bg-white rounded-2xl border border-line overflow-hidden">
          <EmptyState
            icon={ICON_NOTE}
            title="还没有笔记"
            description="创建你的第一个文件夹，开始记录学习内容"
            action={<Button onClick={()=>setShowNewCourse(true)}>新建文件夹</Button>}
          />
        </div>
      )}

      {/* 主体 — 未选中文件时显示文件浏览器 */}
      {!showArchived&&!selectedFile&&tree.children?.length>0&&(
      <div className="flex-1 flex min-h-0 bg-white rounded-2xl shadow-sm border border-[#f3f4f6] overflow-hidden">
        {/* 左侧目录树 */}
        <div className="w-[220px] flex-shrink-0 bg-[#FAFAFA] border-r border-[#f3f4f6] overflow-y-auto p-3">
          <button onClick={handleBack} className={`flex items-center gap-1 text-xs mb-2 px-1 ${isRoot?'opacity-30':''}`}><svg className="h-3.5 w-3.5 text-[#6b7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg><span>返回</span></button>
          <div className="flex items-center gap-0.5 text-[10px] mb-2 flex-wrap">{breadcrumb.map((b,i)=>(<span key={b.id} className="flex items-center gap-0.5">{i>0&&<span className="text-[#9ca3af]">/</span>}<button onClick={()=>handleOpenFolder(b.id)} className={`hover:text-[#1f2937] ${i===breadcrumb.length-1?'font-semibold text-[#1f2937]':'text-[#6b7280]'}`}>{b.name}</button></span>))}</div>
          {isRoot&&recentFiles.length>0&&(<div className="mb-3"><p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-1 mb-1">最近打开</p>{recentFiles.map(f=>(<button key={f.id} onClick={()=>handleSelectFile(f)} className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"><FileIcon size={14}/><span className="truncate">{f.name}</span></button>))}</div>)}
          <div className="space-y-0.5">{tree.children?.map(c=>(<div key={c.id}><button onClick={()=>handleOpenFolder(c.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all group ${currentDir===c.id||breadcrumb.some(b=>b.id===c.id)?'bg-[#10A37F]/20 font-semibold text-[#1f2937]':'text-[#6b7280] hover:bg-[#f3f4f6]'}`}><FolderIcon size={18}/><span className="truncate flex-1 text-left">{c.name}</span><svg className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg></button></div>))}</div>
        </div>

        {/* 中间文件区 */}
        <div className={`flex-1 bg-white overflow-y-auto ${selectedFile?'border-r border-[#f3f4f6]':''}`}>
          <div className="p-4">
          {viewMode==='grid'?(
            <div className="grid grid-cols-4 gap-3">{filtered.map(f=>{
              const isGroup=f._type==='group';const isNote=!f.children&&!isGroup;
              return (<div key={f.id} onClick={()=>handleSelectFile(f)} onContextMenu={e=>{e.preventDefault();if(f._type==='note'){setContextMenu({x:e.clientX,y:e.clientY,item:f})}}} className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 text-center group relative ${selectedFile?.id===f.id?'bg-[#10A37F]/15 ring-2 ring-[#10A37F]/30':'hover:bg-[#f9fafb]'}`}>
              {renaming===f.id?<input className="w-full text-center text-xs px-2 py-1 rounded-lg bg-white border border-[#e5e7eb] focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={renameValue} onChange={e=>setRenameValue(e.target.value)} onBlur={handleRenameDone} onKeyDown={e=>e.key==='Enter'&&handleRenameDone()} autoFocus onClick={e=>e.stopPropagation()}/>:<>
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center">{f.children?<FolderIcon size={32}/>:<FileIcon size={28}/>}</div>
                <p className="text-sm font-medium truncate px-2">{f.name}</p>
                {isNote&&f.noteType&&NOTE_TYPE_LABEL[f.noteType]&&(
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.05] text-[#7B7B7B] font-medium">{NOTE_TYPE_LABEL[f.noteType]}</span>
                )}
              </>}
              {!isGroup&&(<><button onClick={(e)=>handleDelete(e,f.id)} className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#fce4e4] text-[#A0A0A0] hover:text-[#c0392b] transition-all" title="删除"><DeleteIcon size={14}/></button>
              <button onClick={(e)=>handleRenameStart(e,f)} className="absolute bottom-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#f3f4f6] text-[#A0A0A0] hover:text-[#6b7280] transition-all" title="重命名"><RenameIcon size={14}/></button></>)}
            </div>);})}</div>
          ):(
            <div>{filtered.map(f=>{
              const isGroup=f._type==='group';const isNote=!f.children&&!isGroup;
              return (<div key={f.id} onClick={()=>handleSelectFile(f)} onContextMenu={e=>{e.preventDefault();if(f._type==='note'){setContextMenu({x:e.clientX,y:e.clientY,item:f})}}} className={`flex items-center gap-3 px-4 py-3 border-b border-[#f3f4f6] cursor-pointer transition-all group relative ${selectedFile?.id===f.id?'bg-[#10A37F]/10':'hover:bg-[#f9fafb]'}`}>
              {renaming===f.id?<input className="flex-1 text-sm px-2 py-1 rounded-lg bg-white border border-[#e5e7eb] focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={renameValue} onChange={e=>setRenameValue(e.target.value)} onBlur={handleRenameDone} onKeyDown={e=>e.key==='Enter'&&handleRenameDone()} autoFocus onClick={e=>e.stopPropagation()}/>:<>
                {f.children?<FolderIcon size={20}/>:<FileIcon size={16}/>}
                <span className="text-sm font-medium truncate flex-1">{f.name}</span>
                {isNote&&f.noteType&&NOTE_TYPE_LABEL[f.noteType]&&(
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.05] text-[#7B7B7B] font-medium flex-shrink-0">{NOTE_TYPE_LABEL[f.noteType]}</span>
                )}
              </>}
              {!isGroup&&(<><button onClick={(e)=>handleDelete(e,f.id)} className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[#fce4e4] text-[#A0A0A0] hover:text-[#c0392b] transition-all"><DeleteIcon size={12}/></button>
              <button onClick={(e)=>handleRenameStart(e,f)} className="absolute bottom-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[#f3f4f6] text-[#A0A0A0] hover:text-[#6b7280] transition-all"><RenameIcon size={12}/></button></>)}
            </div>);})}</div>
          )}
          </div>
        </div>
      </div>
      )}

      {/* ===== Word 风格全屏文档视图 ===== */}
      {selectedFile&&!selectedFile.children&&(
        <div className="flex-1 flex min-w-0 bg-white overflow-hidden">
          <div className="flex-1 overflow-hidden"><NoteWorkspace noteId={selectedFile.id} onClose={()=>{setSelectedFile(null);setScrollToBlockId(null);}} scrollToBlockId={scrollToBlockId} onScrolled={()=>setScrollToBlockId(null)}/></div>
          <div className="w-[220px] flex-shrink-0 border-l border-[#f3f4f6] overflow-hidden"><AIAsidePanel note={selectedFile}/></div>
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu&&(
        <div className="fixed z-50 bg-white rounded-2xl shadow-lg border border-[#e5e7eb] py-1 min-w-[160px] overflow-hidden" style={{left:contextMenu.x,top:contextMenu.y}}>
          <button onClick={()=>{const n=contextMenu.item;setContextMenu(null);setRenaming(n.id);setRenameValue(n.name);}} className="w-full text-left px-4 py-2.5 text-sm text-[#1F1F1F] hover:bg-[#f5f5f5] transition-colors">重命名</button>
          <button onClick={()=>handleMoveStart(contextMenu.item)} className="w-full text-left px-4 py-2.5 text-sm text-[#1F1F1F] hover:bg-[#f5f5f5] transition-colors">移动到...</button>
          <button onClick={()=>handleExportMarkdown(contextMenu.item)} className="w-full text-left px-4 py-2.5 text-sm text-[#1F1F1F] hover:bg-[#f5f5f5] transition-colors">导出 Markdown</button>
          <button onClick={()=>handleShareToCommunity(contextMenu.item)} className="w-full text-left px-4 py-2.5 text-sm text-[#1F1F1F] hover:bg-[#f5f5f5] transition-colors">分享到社区</button>
          <div className="h-px bg-[#e5e7eb] my-1"/>
          <button onClick={()=>handleArchive(contextMenu.item)} className="w-full text-left px-4 py-2.5 text-sm text-[#c0392b] hover:bg-[#fce4e4] transition-colors">归档</button>
        </div>
      )}

      {/* 移动对话框 */}
      {showMoveDialog&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={()=>setShowMoveDialog(false)}>
          <div className="bg-white rounded-3xl shadow-xl p-6 w-[360px]" onClick={e=>e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#1F1F1F] mb-4">移动到课程</h3>
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {coursesList.length===0?(<p className="text-sm text-[#A0A0A0] py-4 text-center">没有其他课程</p>
              ):(coursesList.map(c=>(<button key={c.id} onClick={()=>handleMoveConfirm(c.id)} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-[#1F1F1F] hover:bg-[#f5f5f5] transition-colors">{c.name}</button>)))}
            </div>
            <button onClick={()=>setShowMoveDialog(false)} className="btn-ghost w-full mt-3">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteManagement;
