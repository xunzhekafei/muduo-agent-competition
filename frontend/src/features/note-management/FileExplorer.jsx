import React, { useState, useMemo } from 'react';
import { mockKnowledgeTree } from '../../mocks/mockData.jsx';

// Flatten all leaf nodes from the tree
const flattenTree = (node) => {
  let files = [];
  if (node.children) {
    node.children.forEach(child => {
      if (child.children) {
        files = files.concat(flattenTree(child));
      } else {
        files.push({ ...child, courseName: node.name === '我的课程' ? (child.courseName || '') : node.name });
      }
    });
  }
  return files;
};

const ALL_FILES = flattenTree(mockKnowledgeTree);

const masteryColor = (v) => v >= 80 ? 'text-[#1A7A57]' : v >= 60 ? 'text-[#8A5A1A]' : 'text-[#c0392b]';
const masteryBg = (v) => v >= 80 ? 'bg-[#D7EFE4]' : v >= 60 ? 'bg-[#F7ECD9]' : 'bg-[#fce4e4]';
const typeIcon = {
  note: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625" />,
  card: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />,
};

const FileExplorer = ({ selectedId, onSelect, searchQuery }) => {
  const [viewMode, setViewMode] = useState('list'); // list | grid
  const [sortBy, setSortBy] = useState('name');

  const filtered = useMemo(() => {
    let files = [...ALL_FILES];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      files = files.filter(f => f.name.toLowerCase().includes(q) || f.tags?.some(t => t.toLowerCase().includes(q)));
    }
    if (sortBy === 'name') files.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'date') files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    else if (sortBy === 'mastery') files.sort((a, b) => (b.mastery || 0) - (a.mastery || 0));
    return files;
  }, [searchQuery, sortBy]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="p-3 flex items-center justify-between border-b border-[#ECECEC] flex-shrink-0">
        <div className="flex items-center gap-1 text-xs text-[#7B7B7B]">
          <span className="font-semibold text-[#1F1F1F]">{filtered.length}</span> 个文件
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <select className="text-[10px] font-medium text-[#7B7B7B] bg-transparent border-none focus:outline-none cursor-pointer"
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name">按名称</option>
            <option value="date">按时间</option>
            <option value="mastery">按掌握度</option>
          </select>
          {/* View toggle */}
          <div className="flex bg-black/[0.03] rounded-lg p-0.5">
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-[#1F1F1F]' : 'text-[#A0A0A0]'}`}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
            <button onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#1F1F1F]' : 'text-[#A0A0A0]'}`}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-[#A0A0A0]">无匹配文件</div>
        ) : viewMode === 'list' ? (
          <div>
            {filtered.map(f => (
              <div key={f.id} onClick={() => onSelect(f)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-[#ECECEC]/50 cursor-pointer transition-all duration-150 group
                  ${selectedId === f.id ? 'bg-[#10A37F]/10 border-l-2 border-l-[#10A37F]' : 'hover:bg-black/[0.015] border-l-2 border-l-transparent'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${f.type === 'card' ? 'bg-[#E9E2F7]' : f.tags?.includes('重点') ? 'bg-[#F7ECD9]' : f.tags?.includes('难点') ? 'bg-[#fce4e4]' : 'bg-[#f5f5f5]'}`}>
                  <svg className={`h-4 w-4 ${f.type === 'card' ? 'text-[#5B3FA8]' : 'text-[#7B7B7B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {typeIcon[f.type] || typeIcon.note}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${selectedId === f.id ? 'font-semibold text-[#1F1F1F]' : 'font-medium text-[#1F1F1F]'}`}>{f.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {f.tags?.map(t => <span key={t} className="text-[9px] text-[#A0A0A0] bg-black/[0.03] px-1.5 py-0.5 rounded-md">{t}</span>)}
                    <span className="text-[9px] text-[#A0A0A0]">{f.updatedAt}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-[#ECECEC] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${masteryBg(f.mastery)}`} style={{ width: `${f.mastery}%` }} />
                    </div>
                    <span className={`text-[10px] font-semibold w-8 ${masteryColor(f.mastery)}`}>{f.mastery}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3">
            {filtered.map(f => (
              <div key={f.id} onClick={() => onSelect(f)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-150 border
                  ${selectedId === f.id ? 'bg-[#10A37F]/15 border-[#10A37F]/40' : 'bg-[#FAFAFA] border-transparent hover:border-[#ECECEC] hover:shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2">
                  <svg className="h-6 w-6 text-[#7B7B7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{typeIcon[f.type] || typeIcon.note}</svg>
                  <span className={`text-[10px] font-semibold ${masteryColor(f.mastery)}`}>{f.mastery}%</span>
                </div>
                <p className="text-sm font-medium text-[#1F1F1F] truncate mb-1">{f.name}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {f.tags?.map(t => <span key={t} className="text-[9px] text-[#A0A0A0]">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
