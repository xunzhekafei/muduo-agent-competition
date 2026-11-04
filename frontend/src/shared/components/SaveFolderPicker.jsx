import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { fetchCourses } from '../../api/courses';
import { fetchNotes } from '../../api/notes';

const DEFAULT_TREE = { id:'root', name:'我的笔记', children:[] };

// ── 工具函数 ──────────────────────────────────────
const findNode = (node, id) => {
  if (node.id === id) return node;
  if (node.children) for (const c of node.children) { const f = findNode(c, id); if (f) return f; }
  return null;
};

const getBreadcrumb = (tree, targetId, path = []) => {
  if (tree.id === targetId) return [...path, tree];
  if (tree.children) for (const c of tree.children) { const f = getBreadcrumb(c, targetId, [...path, tree]); if (f) return f; }
  return null;
};

const getAncestorIds = (tree, targetId) => {
  const bc = getBreadcrumb(tree, targetId);
  return bc ? bc.map(b => b.id).slice(0, -1) : [];
};

const getChildFolderCount = (node) => {
  if (!node.children) return 0;
  return node.children.filter(c => c.isFolder || node.id === 'root').length;
};

const getChildCount = (node) => {
  return node.children ? node.children.length : 0;
};

// ── 文件夹图标 SVG ────────────────────────────────
const FolderIcon = ({ size = 40 }) => (
  <svg width={size} height={size * 0.82} viewBox="0 0 44 36" fill="none" className="transition-transform duration-200 group-hover:scale-105">
    <path d="M2 7.5a2.5 2.5 0 012.5-2.5h10.8l3.6 2.6h16.6a2.5 2.5 0 012.5 2.5V29a2.5 2.5 0 01-2.5 2.5H4.5A2.5 2.5 0 012 29V7.5z" fill="#FEF9E7" stroke="#E5DFCC" strokeWidth="1.5"/>
    <path d="M2 10v19a2.5 2.5 0 002.5 2.5h29a2.5 2.5 0 002.5-2.5V10H2z" fill="#FFFDF5" stroke="#E5DFCC" strokeWidth="1.5"/>
  </svg>
);

// ── 空文件夹图标 ──────────────────────────────────
const EmptyFolderIcon = ({ size = 40 }) => (
  <svg width={size} height={size * 0.82} viewBox="0 0 44 36" fill="none" className="transition-transform duration-200 group-hover:scale-105 opacity-70">
    <path d="M2 7.5a2.5 2.5 0 012.5-2.5h10.8l3.6 2.6h16.6a2.5 2.5 0 012.5 2.5V29a2.5 2.5 0 01-2.5 2.5H4.5A2.5 2.5 0 012 29V7.5z" fill="#F5F5F0" stroke="#E5E0D8" strokeWidth="1.5"/>
    <path d="M2 10v19a2.5 2.5 0 002.5 2.5h29a2.5 2.5 0 002.5-2.5V10H2z" fill="#FAFAF8" stroke="#E5E0D8" strokeWidth="1.5"/>
  </svg>
);

// ── 树节点组件（递归） ────────────────────────────
const TreeNode = ({ node, depth, currentDir, onNavigate, tree }) => {
  const isFolder = node.isFolder || (node.children && node.children.length > 0) || node.id === 'root';
  const hasChildren = node.children && node.children.length > 0;
  const isActive = currentDir === node.id;
  const isInPath = (isFolder || hasChildren) && (() => {
    const bc = getBreadcrumb(tree, currentDir);
    return bc ? bc.some(b => b.id === node.id) : false;
  })();

  return (
    <div>
      <button
        onClick={() => { if (isFolder) onNavigate(node.id); }}
        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left text-[13px] transition-all duration-150 group/tree
          ${isActive
            ? 'bg-[#10A37F]/25 font-semibold text-[#1F1F1F]'
            : isInPath
              ? 'bg-[#10A37F]/8 text-[#1F1F1F] font-medium'
              : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F1F1F]'}`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {isFolder && (
          <svg className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${isInPath ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        )}
        {!isFolder && <span className="w-3 flex-shrink-0" />}
        <span className="text-sm flex-shrink-0">{isFolder ? '📁' : '📄'}</span>
        <span className="truncate flex-1">{node.name}</span>
        {hasChildren && <span className="text-[10px] text-[#A0A0A0] flex-shrink-0">{node.children.length}</span>}
      </button>
    </div>
  );
};

// ── 主组件 ────────────────────────────────────────
const SaveFolderPicker = ({ onSave, onCancel, fileName }) => {
  const [tree, setTree] = useState(DEFAULT_TREE);
  const [currentDir, setCurrentDir] = useState('root');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [loading, setLoading] = useState(true);
  const folderInputRef = React.useRef(null);

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
        noteMap[cid].push({ id: n.id, name: n.title + '.md', type: 'file' });
      });
      setTree({ id:'root', name:'我的笔记', children: courses.map(c => ({
        id: c.id, name: c.name, isFolder: true,
        children: noteMap[c.id] || [],
      }))});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const current = findNode(tree, currentDir);
  const breadcrumb = getBreadcrumb(tree, currentDir) || [];
  const items = current?.children || [];
  const isRoot = currentDir === 'root';
  const subFolders = items.filter(i => i.isFolder || (i.children && i.children.length > 0));
  const subFiles = items.filter(i => !i.isFolder && (!i.children || i.children.length === 0));
  const folderCount = subFolders.length;

  React.useEffect(() => {
    if (showNewFolder && folderInputRef.current) folderInputRef.current.focus();
  }, [showNewFolder]);

  const handleNavigate = (id) => {
    setCurrentDir(id);
    setShowNewFolder(false);
  };

  const handleBack = () => {
    if (isRoot) return;
    const parent = breadcrumb[breadcrumb.length - 2];
    if (parent) setCurrentDir(parent.id);
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (!current) return;
    current.children = current.children || [];
    current.children.push({ id: `d_${Date.now()}`, name, children: [] });
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleSave = () => {
    const path = breadcrumb.map(b => b.name).join(' / ');
    onSave({ path, dirId: currentDir });
  };

  const displayName = fileName || '未命名.md';

  return (
    <div
      className="fixed inset-0 bg-black/15 backdrop-blur-[2px] z-50 flex items-center justify-center p-6"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.10)] w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ height: '520px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── 头部 ─────────────────────────────── */}
        <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[17px] font-bold text-[#1F1F1F]">保存到我的笔记</h2>
            <p className="text-xs text-[#A0A0A0] mt-0.5 font-medium">
              文件：<span className="text-[#6B7280]">{displayName}</span>
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#F3F4F6] transition-colors"
          >
            <svg className="h-4 w-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── 主体：左侧树 + 右侧内容 ──────────── */}
        <div className="flex-1 flex min-h-0">
          {/* 左侧目录树 */}
          <div className="w-[210px] flex-shrink-0 border-r border-[#F3F4F6] overflow-y-auto py-2 px-2">
            <p className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wider px-2 mb-1">目录</p>
            <div className="space-y-0.5">
              <TreeNode node={tree} depth={-1} currentDir={currentDir} onNavigate={handleNavigate} tree={tree} />
              {tree.children.map(course => (
                <TreeNode key={course.id} node={course} depth={0} currentDir={currentDir} onNavigate={handleNavigate} tree={tree} />
              ))}
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 面包屑 */}
            <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center gap-1 text-xs flex-shrink-0">
              <button
                onClick={handleBack}
                className={`p-1 rounded-md hover:bg-[#F3F4F6] transition-colors ${isRoot ? 'opacity-25 pointer-events-none' : ''}`}
              >
                <svg className="h-3.5 w-3.5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
                </svg>
              </button>
              <svg className="h-3 w-3 text-[#D1D5DB] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/>
              </svg>
              {breadcrumb.map((b, i) => (
                <span key={b.id} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <span className="text-[#D1D5DB] mx-0.5">/</span>}
                  <button
                    onClick={() => setCurrentDir(b.id)}
                    className={`truncate max-w-[120px] hover:text-[#1F1F1F] transition-colors ${
                      i === breadcrumb.length - 1
                        ? 'font-semibold text-[#1F1F1F]'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {b.icon}{b.name}
                  </button>
                </span>
              ))}
            </div>

            {/* 文件夹内容 */}
            <div className="flex-1 overflow-y-auto p-4">
              {subFolders.length === 0 && subFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <EmptyFolderIcon size={56} />
                  <p className="text-sm text-[#A0A0A0] mt-3 font-medium">此文件夹为空</p>
                  <p className="text-[11px] text-[#C0C0C0] mt-1">点击下方"新建文件夹"创建子目录</p>
                </div>
              ) : (
                <div>
                  {/* 子文件夹 */}
                  {subFolders.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-2 px-1">
                        文件夹 · {subFolders.length}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {subFolders.map(f => {
                          const count = getChildCount(f);
                          return (
                            <button
                              key={f.id}
                              onClick={() => handleNavigate(f.id)}
                              onDoubleClick={() => handleNavigate(f.id)}
                              className="group flex flex-col items-center p-3 rounded-2xl transition-all duration-200 hover:bg-[#F9FAFB] hover:shadow-sm active:scale-[0.98]"
                            >
                              {count > 0 ? <FolderIcon size={40} /> : <EmptyFolderIcon size={40} />}
                              <p className="text-xs font-medium text-[#1F1F1F] mt-2 text-center line-clamp-1 w-full">
                                {f.name}
                              </p>
                              <p className="text-[10px] text-[#A0A0A0] mt-0.5">
                                {count > 0 ? `${count} 项` : '空'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 文件列表 */}
                  {subFiles.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-2 px-1">
                        文件 · {subFiles.length}
                      </p>
                      <div className="space-y-0.5">
                        {subFiles.map(f => (
                          <div
                            key={f.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-[#6B7280]"
                          >
                            <span className="text-sm">📄</span>
                            <span className="truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 当前路径提示 */}
            <div className="px-5 py-2 border-t border-[#F3F4F6] flex-shrink-0">
              <p className="text-[11px] text-[#A0A0A0] truncate">
                保存位置：<span className="text-[#6B7280] font-medium">{breadcrumb.map(b => b.name).join(' / ')}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── 底部操作栏 ─────────────────────────── */}
        <div className="px-6 py-3 border-t border-[#F3F4F6] flex items-center justify-between flex-shrink-0 bg-[#FAFBFA]">
          <div className="flex items-center gap-2">
            {showNewFolder ? (
              <div className="flex items-center gap-2 animate-[fadeIn_0.15s_ease-out]">
                <input
                  ref={folderInputRef}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] w-36 focus:outline-none focus:ring-2 focus:ring-[#10A37F]/50 focus:border-[#10A37F] transition-all"
                  placeholder="文件夹名称"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
                  }}
                />
                <button
                  onClick={handleCreateFolder}
                  className="text-xs font-semibold text-[#1A7A57] px-2 py-1 rounded-lg hover:bg-[#DDF0EA] transition-colors"
                >
                  创建
                </button>
                <button
                  onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                  className="text-xs text-[#9CA3AF] px-1.5 py-1 rounded-lg hover:bg-[#F3F4F6] transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#1F1F1F] px-2 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-all"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                </svg>
                新建文件夹
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1F1F1F] transition-all"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all shadow-sm"
            >
              保存到这里
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveFolderPicker;
