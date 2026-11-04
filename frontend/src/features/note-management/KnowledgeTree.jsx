import React, { useState } from 'react';
import { mockKnowledgeTree } from '../../mocks/mockData.jsx';

const iconMap = {
  os: <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />,
  ds: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />,
  net: <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />,
  ai: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />,
  thinking: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0" />,
  memory: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />,
};

const TreeNode = ({ node, depth = 0, selectedId, onSelect, expanded, onToggle }) => {
  const isFolder = !!node.children;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        onClick={() => { if (isFolder) onToggle(node.id); else onSelect(node); }}
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 group text-sm
          ${isSelected ? 'bg-[#10A37F]/25 text-[#1F1F1F] font-semibold' : 'text-[#5a5a5a] hover:bg-black/[0.03] hover:text-[#1F1F1F]'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/collapse arrow */}
        {isFolder ? (
          <svg className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        {/* Icon */}
        {node.icon && iconMap[node.icon] ? (
          <svg className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-[#1F1F1F]' : 'text-[#8a8a8a]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {iconMap[node.icon]}
          </svg>
        ) : isFolder ? (
          <svg className={`h-4 w-4 flex-shrink-0 ${isExpanded ? 'text-[#10A37F]' : 'text-[#8a8a8a]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {isExpanded
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9" />}
          </svg>
        ) : node.type === 'card' ? (
          <svg className="h-4 w-4 flex-shrink-0 text-[#8a8a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        ) : (
          <svg className="h-4 w-4 flex-shrink-0 text-[#8a8a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625" />
          </svg>
        )}

        <span className="truncate flex-1">{node.name}</span>

        {/* Mastery badge for notes */}
        {node.mastery !== undefined && (
          <span className={`text-[10px] font-medium flex-shrink-0 ${node.mastery >= 80 ? 'text-[#1A7A57]' : node.mastery >= 60 ? 'text-[#8A5A1A]' : 'text-[#c0392b]'}`}>
            {node.mastery}%
          </span>
        )}
      </div>

      {/* Children */}
      {isFolder && isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} expanded={expanded} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
};

const KnowledgeTree = ({ selectedId, onSelect }) => {
  const [expanded, setExpanded] = useState(new Set(['root', 'course_os', 'course_ds', 'course_net', 'course_ai', 'course_math', 'course_phys', 'course_eng', 'course_uncategorized']));
  const [search, setSearch] = useState('');

  const toggleExpand = (id) => {
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA]">
      {/* Search */}
      <div className="p-3 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#A0A0A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#ECECEC] placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#10A37F]/40 focus:border-[#10A37F] transition-all"
            placeholder="搜索笔记..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Quick access */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1 text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wider px-2 mb-1">快速访问</div>
        {[
          { id: 'recent', label: '最近打开', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /> },
          { id: 'starred', label: '收藏笔记', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /> },
        ].map(item => (
          <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[#7B7B7B] hover:bg-black/[0.03] cursor-pointer transition-colors">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{item.icon}</svg>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-[#ECECEC] mx-3 flex-shrink-0" />

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <TreeNode node={mockKnowledgeTree} depth={0} selectedId={selectedId} onSelect={onSelect} expanded={expanded} onToggle={toggleExpand} />
      </div>
    </div>
  );
};

export default KnowledgeTree;
