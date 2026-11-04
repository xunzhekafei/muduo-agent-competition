import React, { useState, useEffect } from 'react';
import { fetchCourses } from '../../api/courses';
import { fetchNotes } from '../../api/notes';

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

const findNode = (node, id) => { if(node.id===id)return node; if(node.children)for(const c of node.children){const f=findNode(c,id);if(f)return f;} return null; };
const getBreadcrumb = (t,id,p=[])=>{ if(t.id===id)return[...p,t]; if(t.children)for(const c of t.children){const f=getBreadcrumb(c,id,[...p,t]);if(f)return f;} return null; };

const FilePicker = ({ onSelect, onCancel, title = '选择学习文件' }) => {
  const [tree, setTree] = useState({ id:'root', name:'我的课程', children:[] });
  const [currentDir, setCurrentDir] = useState('root');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCourses().catch(() => ({ data: [] })),
      fetchNotes({ pageSize: 100 }).catch(() => ({ data: [] })),
    ]).then(([cr, nr]) => {
      const courses = cr.data || [];
      const notes = nr.data || [];
      const noteMap = {};
      notes.forEach(n => {
        const cid = n.courseId || '_none';
        if (!noteMap[cid]) noteMap[cid] = [];
        noteMap[cid].push({ id: n.id, name: n.title + '.md', type: 'note', course: n.courseName || '' });
      });
      setTree({ id:'root', name:'我的课程', children: courses.map(c => ({
        id: c.id, name: c.name,
        children: noteMap[c.id] || [],
      }))});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const current = findNode(tree, currentDir);
  const breadcrumb = getBreadcrumb(tree, currentDir) || [];
  const items = current?.children || [];
  const isRoot = currentDir === 'root';
  const filtered = search ? items.filter(i => i.name.includes(search)) : items;
  const handleBack = () => { if(isRoot)return; const p=breadcrumb[breadcrumb.length-2]; if(p)setCurrentDir(p.id); };

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-8" onClick={onCancel}>
      <div className="bg-white rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] w-full max-w-2xl max-h-[540px] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="p-5 border-b border-[#f3f4f6] flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-[#1f2937]">{title}</h2>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-[#f3f4f6]"><svg className="h-5 w-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg></button>
        </div>

        <div className="px-5 py-3 border-b border-[#f3f4f6] flex-shrink-0 space-y-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
            <input className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-[#f3f4f6] placeholder:text-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#10A37F]" placeholder="搜索文件..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button onClick={handleBack} className={`p-1 rounded-md hover:bg-[#f3f4f6] ${isRoot?'opacity-30':''}`}><svg className="h-3.5 w-3.5 text-[#6b7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg></button>
            {breadcrumb.map((b,i)=>(<span key={b.id} className="flex items-center gap-1">{i>0&&<span className="text-[#9ca3af]">/</span>}<button onClick={()=>setCurrentDir(b.id)} className={`hover:text-[#1f2937] ${i===breadcrumb.length-1?'font-semibold text-[#1f2937]':'text-[#6b7280]'}`}>{b.name}</button></span>))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? <p className="text-sm text-[#9ca3af] text-center py-8">加载中...</p> :
           filtered.length===0 ? <p className="text-sm text-[#9ca3af] text-center py-8">无匹配文件</p> :
           <div className="space-y-0.5">
            {filtered.map(item => (
              <button key={item.id} onClick={()=>item.children?setCurrentDir(item.id):onSelect(item)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-[#f3f4f6]">
                {item.children?<FolderIcon size={22}/>:<FileIcon size={18}/>}
                <span className="text-sm font-medium text-[#1f2937] truncate flex-1">{item.name}</span>
                {item.children && <svg className="h-4 w-4 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>}
              </button>
            ))}
          </div>}
        </div>

        <div className="p-3 border-t border-[#f3f4f6] text-center flex-shrink-0">
          <p className="text-[10px] text-[#9ca3af]">点击文件夹进入 · 点击文件确认选择</p>
        </div>
      </div>
    </div>
  );
};

export default FilePicker;
