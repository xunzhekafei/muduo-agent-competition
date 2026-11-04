import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createNote, updateNote, deleteNote, fetchNotes, fetchNoteDetail, aiGenerate, addNoteBlock } from '../../api/notes';
import { useFunASR } from '../quick-notes/hooks/useFunASR';
import { SaveFolderPicker } from '../../shared/components';

/**
 * 时间树速记 — TimeTree
 *
 * 数据存储方案：
 *   每个节点存为一条 note，note_type="quick_timetree"
 *   根节点：metadata.isTimeTreeRoot=true
 *   子节点：metadata.parentId=父节点ID, metadata.position=兄弟间排序
 *   通过 tag "tree_{rootId}" 标识属于同一棵树
 */

// 获取一棵树的所有节点
async function fetchTreeNodes(rootNoteId) {
  const res = await fetchNotes({ tag: `tree_${rootNoteId}`, pageSize: 100 });
  const notes = res.data || [];
  return notes.map(n => {
    const tags = n.tags || [];
    // 从 tags 中提取 parentId（格式：parent_{parentId}）
    const parentTag = tags.find(t => t.startsWith('parent_'));
    // 如果没有 parent_ 标签，默认为根节点的直接子节点
    const parentId = parentTag ? parentTag.slice(7) : rootNoteId;
    const posX = tags.find(t => t.startsWith('pos_x:'));
    const posY = tags.find(t => t.startsWith('pos_y:'));
    return {
      id: n.id,
      title: n.title,
      parentId,
      noteType: n.noteType,
      dragX: posX ? parseInt(posX.slice(6)) : null,
      dragY: posY ? parseInt(posY.slice(6)) : null,
    };
  });
}

const TimeTreeNotes = ({ initialNoteId = null }) => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [treeNodes, setTreeNodes] = useState([]);
  const [rootNoteId, setRootNoteId] = useState(initialNoteId);
  const rootNoteIdRef = useRef(initialNoteId);
  const [visibleNodeIds, setVisibleNodeIds] = useState(new Set());
  const [animatingNodeIds, setAnimatingNodeIds] = useState(new Set());
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [multiSelectNodes, setMultiSelectNodes] = useState(new Set());
  const [treeTitle, setTreeTitle] = useState('未命名主题');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('未命名主题');
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [renamingNode, setRenamingNode] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  const pushAction = (label, undoFn, redoFn) => {
    undoStackRef.current.push({ label, undo: undoFn, redo: redoFn });
    redoStackRef.current = [];
    setUndoCount(undoStackRef.current.length);
    setRedoCount(0);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
  };

  const handleUndo = async () => {
    const action = undoStackRef.current.pop();
    if (!action) return;
    try { await action.undo(); redoStackRef.current.push(action); showToast('已撤销: ' + action.label); }
    catch (e) { console.error('撤销失败', e); showToast('撤销失败'); }
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
  };

  const handleRedo = async () => {
    const action = redoStackRef.current.pop();
    if (!action) return;
    try { await action.redo(); undoStackRef.current.push(action); showToast('已重做: ' + action.label); }
    catch (e) { console.error('重做失败', e); showToast('重做失败'); }
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
  };
  const [pendingNav, setPendingNav] = useState(null);
  const [dragNodeId, setDragNodeId] = useState(null);
  const [nodeOffsets, setNodeOffsets] = useState({});
  const [renameValue, setRenameValue] = useState('');

  // 语音识别
  const { start: startASR, stop: stopASR, isListening, error: asrError, isFunASR } = useFunASR({
    onSegment: ({ text }) => {
      if (text && text.trim()) {
        // 语音识别到内容后，自动创建子节点
        const parent = selectedNodeId || rootNoteId;
        if (parent) {
          createNote({ title: text.trim().slice(0, 30), noteType: 'quick_timetree',
            tags: rootNoteId ? ['tree_' + rootNoteId, 'parent_' + parent] : [],
          }).then(r => {
            const n = r.data;
            const newNode = { id: n.id, title: text.trim().slice(0, 30), parentId: parent };
            const lp = Array.from(positionsRef.current.values()).pop();
            if (lp) positionsRef.current.set(newNode.id, { x: lp.x + 40, y: lp.y - 30, node: newNode, nodeRadius: 30, rootRadius: 45 });
            setTreeNodes(prev => [...prev, newNode]);
            const vnodeId = n.id;
            pushAction('语音节点',
              async () => { await deleteNote(vnodeId); setTreeNodes(prev => prev.filter(x => x.id !== vnodeId)); setVisibleNodeIds(prev => { const s = new Set(prev); s.delete(vnodeId); return s; }); },
              async () => { const vr = await createNote({ title: text.trim().slice(0, 30), noteType: 'quick_timetree', tags: rootNoteId ? ['tree_' + rootNoteId, 'parent_' + parent] : [] }); const vn = { id: vr.data.id, title: text.trim().slice(0, 30), parentId: parent }; setTreeNodes(prev => [...prev, vn]); setVisibleNodeIds(prev => new Set([...prev, vn.id])); }
            );
            setVisibleNodeIds(prev => new Set([...prev, newNode.id]));
          }).catch(() => {});
        }
      }
    },
    onTranscriptChange: (t) => {},
  });

  const toggleRecording = async () => {
    if (isListening) { stopASR(); }
    else { await startASR(); }
  };
  // 节点拖拽
  const nodeDragRef = useRef(null);
  const handleNodeMouseDown = (nid, e) => {
    if (e.button !== 0) return; // 只响应左键
    e.stopPropagation();
    const svg = canvasRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pos = positionsRef.current.get(nid);
    if (!pos) return;
    nodeDragRef.current = {
      nid,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      svgX: rect.left,
      svgY: rect.top,
      scale,
      translateX: translate.x,
      translateY: translate.y,
    };
    setDragNodeId(nid);
  };

  // 全局鼠标移动/释放监听
  useEffect(() => {
    if (!dragNodeId) return;
    const handleMove = (e) => {
      const dr = nodeDragRef.current;
      if (!dr) return;
      const dx = (e.clientX - dr.startX) / dr.scale;
      const dy = (e.clientY - dr.startY) / dr.scale;
      // 直接更新 positionsRef，不触发重渲染，不引起侧边栏抖动
      const pos = positionsRef.current.get(dr.nid);
      if (pos) {
        pos.x = dr.origX + dx;
        pos.y = dr.origY + dy;
      }
      setNodeOffsets(prev => ({ ...prev, [dr.nid]: { x: dr.origX + dx, y: dr.origY + dy } }));
    };
    const handleUp = () => { if (nodeDragRef.current) { const dr = nodeDragRef.current; const np = positionsRef.current.get(dr.nid); if (np && (Math.abs(dr.origX - np.x) > 2 || Math.abs(dr.origY - np.y) > 2)) { setIsDirty(true); fetchNoteDetail(dr.nid).then(r => { const nd = r?.data?.note || r?.data || {}; const tg = (nd.tags || []).filter(t => !t.startsWith("pos_")); updateNote(dr.nid, { tags: [...tg, "pos_x:" + Math.round(np.x), "pos_y:" + Math.round(np.y)] }); }).catch(() => {}); } } setDragNodeId(null); nodeDragRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [dragNodeId]);

  const fileInputRef = useRef(null);
  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { showToast('请选择文件'); return; }
    setSaving(true);
    showToast('正在处理视频...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = (await import('../../api/client')).getAuthToken();
      const res = await fetch('/api/v1/quick-notes/timetree/process-video', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData
      });
      const data = await res.json();
      const nodes = data?.data?.nodes || [];
      if (nodes.length > 0) {
        const rootNode = nodes[0];
        const parentId = rootNoteId || (await createNote({ title: rootNode.title || '视频笔记', noteType: 'quick_timetree' })).data.id;
        if (!rootNoteId) setRootNoteId(parentId);
        const created = [];
        for (let i = 1; i < nodes.length; i++) {
          const nd = nodes[i];
          const pId = nd.parentId === '0' || !nd.parentId ? parentId : (created[parseInt(nd.parentId)]?.id || parentId);
          const nr = await createNote({ title: nd.title.slice(0, 30), noteType: 'quick_timetree',
            tags: ['tree_' + parentId, 'parent_' + pId] });
          const newNode = { id: nr.data.id, title: nd.title.slice(0, 30), parentId: pId };
          created.push(newNode);
          setTreeNodes(prev => [...prev, newNode]);
          setVisibleNodeIds(prev => new Set([...prev, newNode.id]));
        }
        if (created.length === 0) {
          const nr = await createNote({ title: rootNode.title.slice(0, 30), noteType: 'quick_timetree',
            tags: ['tree_' + parentId, 'parent_' + parentId] });
          setTreeNodes(prev => [...prev, { id: nr.data.id, title: rootNode.title.slice(0, 30), parentId: parentId }]);
          setVisibleNodeIds(prev => new Set([...prev, nr.data.id]));
        }
      }
      showToast('视频处理完成');
    } catch(e) { console.error(e); showToast('处理失败'); }
    setSaving(false);
    if (e.target) e.target.value = '';
  };
  const handleRemoveNodeNote = async (nodeId, index) => {
    const remaining = (nodeNotes[nodeId] || []).filter((_, idx) => idx !== index);
    const deletedContent = (nodeNotes[nodeId] || [])[index];
    try {
      const { saveNoteBlocks } = await import('../../api/notes');
      await saveNoteBlocks(nodeId, remaining.map((t, idx) => ({ type: 'paragraph', content: t, position: idx, metadata: {} })));
    } catch {}
    setNodeNotes(prev => ({ ...prev, [nodeId]: remaining }));
    if (deletedContent) pushAction('删除笔记',
      async () => { const restored = [...remaining]; restored.splice(index, 0, deletedContent); const { saveNoteBlocks: snb } = await import('../../api/notes'); await snb(nodeId, restored.map((t, idx) => ({ type: 'paragraph', content: t, position: idx, metadata: {} }))); setNodeNotes(prev => ({ ...prev, [nodeId]: restored })); },
      async () => { const { saveNoteBlocks: snb } = await import('../../api/notes'); await snb(nodeId, remaining.map((t, idx) => ({ type: 'paragraph', content: t, position: idx, metadata: {} }))); setNodeNotes(prev => ({ ...prev, [nodeId]: remaining })); }
    );
  };
  const [nodeTags, setNodeTags] = useState({});
  const [nodeNotes, setNodeNotes] = useState({});
  
  const [noteInput, setNoteInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const treeContainerRef = useRef(null);
  const positionsRef = useRef(new Map());
  const layoutKeyRef = useRef("");

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); }, []);

  // 选中节点时，从后端加载其内容
  const [loadingNode, setLoadingNode] = useState(false);
  useEffect(() => {
    if (!selectedNodeId) return;
    setLoadingNode(true);
    fetchNoteDetail(selectedNodeId).then(res => {
      const d = res.data || res;
      const note = d.note || d;
      const blocks = d.blocks || [];
      const notes = blocks
        .filter(b => (b.type === 'paragraph' || b.blockType === 'paragraph') && b.content && b.content.trim())
        .map(b => b.content);
      setNodeNotes(prev => ({ ...prev, [selectedNodeId]: notes }));
      setNodeTags(prev => ({ ...prev, [selectedNodeId]: (note.tags || []).filter(t => !t.startsWith("tree_")) }));
      setLoadingNode(false);
    }).catch(() => setLoadingNode(false));
  }, [selectedNodeId]);

  // 保存笔记到节点（首次添加时自动改名）
  const handleAddNodeNote = async (nodeId, text) => {
    if (!text.trim()) return;
    try {
      const { addNoteBlock } = await import('../../api/notes');
      const blockRes = await addNoteBlock(nodeId, { content: text.trim(), blockType: 'paragraph' });
      const blockId = blockRes?.data?.id;
      const noteText = text.trim();
      const existingNotes = nodeNotes[nodeId] || [];
      setNodeNotes(prev => ({ ...prev, [nodeId]: [...(prev[nodeId] || []), noteText] }));
      pushAction('笔记',
        async () => { if (blockId) try { const { deleteNoteBlock } = await import('../../api/notes'); await deleteNoteBlock(nodeId, blockId); } catch {} setNodeNotes(prev => ({ ...prev, [nodeId]: (prev[nodeId] || []).filter(t => t !== noteText) })); },
        async () => { try { const { addNoteBlock: addB } = await import('../../api/notes'); await addB(nodeId, { content: noteText, blockType: 'paragraph' }); } catch {} setNodeNotes(prev => ({ ...prev, [nodeId]: [...(prev[nodeId] || []), noteText] })); }
      );
      showToast('笔记已保存');
    } catch { showToast('保存失败'); }
  };

  // 切换标签（保留 tree_ 系统标签）
  const handleToggleTag = async (nodeId, tag) => {
    try {
      // 从后端获取当前完整标签（含 tree_ 系统标签）
      const detail = await fetchNoteDetail(nodeId);
      const note = detail?.data?.note || detail?.data || {};
      const existingTags = note.tags || [];
      const userTags = existingTags.filter(t => !t.startsWith('tree_' && !t.startsWith('pos_')) && !t.startsWith('root_display:') && !t.startsWith('parent_'));
      const treeTags = existingTags.filter(t => t.startsWith('tree_'));
      
      const userTagSet = new Set(userTags);
      if (userTagSet.has(tag)) userTagSet.delete(tag); else userTagSet.add(tag);
      
      const updatedUserTags = [...userTagSet];
      await updateNote(nodeId, { tags: [...treeTags, ...updatedUserTags] });
      setNodeTags(prev => ({ ...prev, [nodeId]: updatedUserTags }));
      setIsDirty(true);
    } catch { /* ignore */ }
  };

  // ------ 加载已有树 ------
  useEffect(() => {
    if (!initialNoteId) return;
    setLoading(true);
    let rootTitle = '输入主题';
    // 先加载根节点信息，再加载子节点
    fetchNoteDetail(initialNoteId).then(res => {
      const note = res?.data?.note || res?.data;
      if (note) {
        rootTitle = note.title || '输入主题';
        setTreeTitle(rootTitle);
        setTitleInput(rootTitle);
        setRootNoteId(note.id); rootNoteIdRef.current = note.id;
      }
    }).then(() => {
      return fetchTreeNodes(initialNoteId);
    }).then(nodes => {
      // 如果根节点有 root_display 标签，用它替代 note title
      fetchNoteDetail(initialNoteId).then(res2 => {
        const n2 = res2?.data?.note || res2?.data || {};
        const allTags2 = n2.tags || [];
        const displayTag = allTags2.find(t => t.startsWith('root_display:'));
        if (displayTag) {
          rootTitle = displayTag.slice(13);
        } else if (allTags2.filter(t => !t.startsWith('tree_') && !t.startsWith('parent_') && !t.startsWith('pos_') && !t.startsWith('root_display:')).length === 0) {          // 没有 root_display 标签，自动创建
          updateNote(initialNoteId, { tags: [...allTags2, `root_display:${rootTitle}`] }).catch(() => {});
        }
      }).catch(() => {}).then(() => {
        const rootNode = { id: initialNoteId, title: rootTitle, isTimeTreeRoot: true };
        const merged = [rootNode, ...nodes.map(n => {
          if (n.id === initialNoteId) return rootNode;
          return { id: n.id, title: n.title, parentId: n.parentId, dragX: n.dragX, dragY: n.dragY };
        }).filter(n => n.id !== initialNoteId)];
        setTimeout(() => {
          merged.forEach(n => {
            if (n.dragX != null && n.dragY != null) {
              const pos = positionsRef.current.get(n.id);
              if (pos) { pos.x = n.dragX; pos.y = n.dragY; }
            }
          });
        }, 0);
        setTreeNodes(merged);
        setVisibleNodeIds(new Set(merged.map(n => n.id)));
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, [initialNoteId]);

  // Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // 退出提示
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);


  // ------ 创建新树 ------
  const handleCreateTree = async () => {
    
    if (isCreating || rootNoteIdRef.current) return;
    setIsCreating(true);
    setSaving(true);
    try {
      const res = await createNote({
        title: '时间树笔记',
        noteType: 'quick_timetree',
        tags: ['root_display:输入主题', 'is_root'],
      });
      const note = res.data;
      setRootNoteId(note.id);
      rootNoteIdRef.current = note.id;
      const rootNode = { id: note.id, title: '输入主题', isTimeTreeRoot: true };
      setTreeNodes([rootNode]);
      setVisibleNodeIds(new Set([note.id]));
      setTreeTitle('输入主题');
      showToast('时间树已创建');
    } catch { showToast('创建失败'); }
    setIsCreating(false);
    setSaving(false);
  };

  // ------ 添加子节点 ------
  const handleAddChild = async (parentId) => {
    if (!rootNoteId) { showToast('请先创建时间树'); return; }
    const siblings = treeNodes.filter(n => n.parentId === parentId);
    const position = siblings.length;
    setSaving(true);
    try {
      const res = await createNote({
        title: '新节点',
        noteType: 'quick_timetree',
        tags: [`tree_${rootNoteId}`, `parent_${parentId}`],
        metadata: { parentId, position, treeRootId: rootNoteId },
      });
      const newNode = { id: res.data.id, title: '新节点', parentId, position, treeRootId: rootNoteId };
      const lastPos = Array.from(positionsRef.current.values()).pop();
      if (lastPos) {
        positionsRef.current.set(newNode.id, { x: lastPos.x + 40, y: lastPos.y - 30, node: newNode, nodeRadius: 30, rootRadius: 45 });
      }
      setTreeNodes(prev => [...prev, newNode]);
      setVisibleNodeIds(prev => new Set([...prev, newNode.id]));
      setIsDirty(true);
      pushAction('添加',
        async () => { await deleteNote(newNode.id); setTreeNodes(prev => prev.filter(n => n.id !== newNode.id)); setVisibleNodeIds(prev => { const s = new Set(prev); s.delete(newNode.id); return s; }); },
        async () => { const nr = await createNote({ title: '新节点', noteType: 'quick_timetree', tags: rootNoteId ? ['tree_' + rootNoteId, 'parent_' + parentId] : [] }); const nn = { id: nr.data.id, title: '新节点', parentId, position: treeNodes.filter(x => x.parentId === parentId).length }; setTreeNodes(prev => [...prev, nn]); setVisibleNodeIds(prev => new Set([...prev, nn.id])); }
      );
      showToast('已添加子节点');
    } catch { showToast('添加失败'); }
    setIsCreating(false);
    setSaving(false);
  };

  // ------ AI 填充内容 ------
  const [aiFilling, setAiFilling] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const handleAiFill = async () => {
    if (treeNodes.length === 0) { showToast('树为空'); return; }
    const fillBlocks = [];
    setAiFilling(true);
    showToast('AI 正在生成内容...');
    try {
      const targets = multiSelectNodes.size > 0 ? treeNodes.filter(n => multiSelectNodes.has(n.id)) : treeNodes;
      if (multiSelectNodes.size > 0) showToast('AI 正在为 ' + multiSelectNodes.size + ' 个选中节点生成内容...');
      for (const node of targets) {
        if (!node.title || node.title === '输入主题') continue;
        // 检查是否已有内容（已有 blocks 则跳过）
        const detail = await fetchNoteDetail(node.id);
        const blocks = (detail?.data?.blocks || detail?.blocks || []);
        // 已有内容也重新生成
        // 调用 AI 生成
                // 构建上下文路径
        let ctxNode = node;
        const ctxParts = [];
        while (ctxNode) {
          ctxParts.unshift(ctxNode.title);
          if (ctxNode.isTimeTreeRoot) break;
          ctxNode = treeNodes.find(n => n.id === ctxNode.parentId);
        }
        const rootTitle = ctxParts[0] || '知识';
        const pathStr = ctxParts.join(' → ');
        const contextInfo = '当前主题是"' + rootTitle + '"，节点"' + node.title + '"位于路径: ' + pathStr;
        const prompt = node.isTimeTreeRoot
          ? '请为主题"' + node.title + '"写一个简要概述（100-200字），用##做标题，段落格式。'
          : '语境：' + contextInfo + '。请据此为"' + node.title + '"写一段专业解释（80-150字），用###做标题，段落格式，不要说这是"xxx"的一部分。';
        try {
          const res = await aiGenerate(prompt);
          const text = res?.data?.content || res?.content || '';
          if (text) {
            await addNoteBlock(node.id, { content: text.trim(), blockType: 'paragraph' });
              fillBlocks.push({ id: node.id, blocks: [text.trim()] });
          }
        } catch { /* skip failed nodes */ }
      }
      setMultiSelectNodes(new Set());
      (fillBlocks.length > 0) && pushAction('AI填充',
        async () => { for (const fb of fillBlocks) { for (const bt of fb.blocks) { try { const fd = await fetchNoteDetail(fb.id); const bk = (fd?.data?.blocks || []).find(x => x.content === bt); if (bk) { const { deleteNoteBlock: dnb } = await import('../../api/notes'); await dnb(fb.id, bk.id); } } catch {} } } },
        async () => { for (const fb of fillBlocks) { for (const bt of fb.blocks) { try { const { addNoteBlock: anb } = await import('../../api/notes'); await anb(fb.id, { content: bt, blockType: 'paragraph' }); } catch {} } } }
      );
      showToast('AI 内容生成完成');
    } catch (e) {
      showToast('AI 生成失败');
      console.error(e);
    }
    setAiFilling(false);
  };

  // ------ 重命名节点 ------
  const handleRename = async (nodeId, newTitle) => {
    if (!newTitle.trim()) return;
    try {
      const node = treeNodes.find(n => n.id === nodeId);
      if (node && node.isTimeTreeRoot) {
        // 根节点：用 root_display 标签存显示名，不改笔记标题
        const detail = await fetchNoteDetail(nodeId);
        const note = detail?.data?.note || detail?.data || {};
        const existingTags = (note.tags || []).filter(t => !t.startsWith('root_display:') && !t.startsWith('tree_'));
        await updateNote(nodeId, { tags: [...existingTags, `root_display:${newTitle.trim()}`] });
      } else {
        await updateNote(nodeId, { title: newTitle.trim() });
      }
      const oldTitle = treeNodes.find(n => n.id === nodeId)?.title || '';
      setTreeNodes(prev => prev.map(n => n.id === nodeId ? { ...n, title: newTitle.trim() } : n));
      const rp = positionsRef.current.get(nodeId);
      if (rp) rp.node = { ...rp.node, title: newTitle.trim() };
      setIsDirty(true);
      pushAction('重命名',
        async () => { await updateNote(nodeId, { title: oldTitle }); setTreeNodes(prev => prev.map(n => n.id === nodeId ? { ...n, title: oldTitle } : n)); const rpx = positionsRef.current.get(nodeId); if (rpx) rpx.node = { ...rpx.node, title: oldTitle }; },
        async () => { await updateNote(nodeId, { title: newTitle.trim() }); setTreeNodes(prev => prev.map(n => n.id === nodeId ? { ...n, title: newTitle.trim() } : n)); const rpx = positionsRef.current.get(nodeId); if (rpx) rpx.node = { ...rpx.node, title: newTitle.trim() }; }
      );
      showToast('已重命名');
    } catch { showToast('重命名失败'); }
  };

  // ------ 删除节点（递归）------
  const handleDeleteNode = async (nodeId) => {
    const toDelete = new Set();
    const collect = (id) => {
      toDelete.add(id);
      treeNodes.filter(n => n.parentId === id).forEach(n => collect(n.id));
    };
    collect(nodeId);
    setSaving(true);
    try {
      await Promise.all([...toDelete].map(id => deleteNote(id).catch(() => {})));
      setTreeNodes(prev => prev.filter(n => !toDelete.has(n.id)));
      toDelete.forEach(id => positionsRef.current.delete(id));
      setIsDirty(true);
      const deletedNodes = treeNodes.filter(n => toDelete.has(n.id)).map(n => ({ id: n.id, title: n.title, parentId: n.parentId }));
      const deletedPositions = {};
      toDelete.forEach(id => { const p = positionsRef.current.get(id); if (p) deletedPositions[id] = { x: p.x, y: p.y }; });
      const delNewIds = {};
      pushAction('删除',
        async () => {
          const restored = [];
          for (const dn of deletedNodes) {
            try {
              const r = await createNote({ title: dn.title, noteType: 'quick_timetree', tags: rootNoteId ? ['tree_' + rootNoteId, 'parent_' + (dn.parentId || rootNoteId)] : [] });
              const newId = r.data.id;
              if (dn.id) delNewIds[dn.id] = newId;
              const newNode = { id: newId, title: dn.title, parentId: dn.parentId || rootNoteId };
              if (deletedPositions[dn.id]) positionsRef.current.set(newNode.id, { ...deletedPositions[dn.id], node: newNode, nodeRadius: 30, rootRadius: 45 });
              restored.push(newNode);
            } catch {}
          }
          setTreeNodes(prev => [...prev, ...restored]);
          setVisibleNodeIds(prev => { const s = new Set(prev); restored.forEach(n => s.add(n.id)); return s; });
        },
        async () => {
          const idsToDelete = new Set();
          deletedNodes.forEach(dn => { const targetId = delNewIds[dn.id] || dn.id; idsToDelete.add(targetId); deleteNote(targetId).catch(() => {}); });
          setTreeNodes(prev => prev.filter(n => !idsToDelete.has(n.id)));
          setVisibleNodeIds(prev => { const s = new Set(prev); idsToDelete.forEach(id => s.delete(id)); return s; });
        }
      );
      setVisibleNodeIds(prev => { const n = new Set(prev); toDelete.forEach(id => n.delete(id)); return n; });
      if (selectedNodeId && toDelete.has(selectedNodeId)) setSelectedNodeId(null);
      showToast('已删除');
    } catch { showToast('删除失败'); }
    setIsCreating(false);
    setSaving(false);
  };

  // ------ 保存树 ------
  const handleSave = async () => {
    
    if (!rootNoteId) { if (treeNodes.length > 0) showToast('请先创建时间树'); else showToast('没有可保存的内容'); return; }
    setSaving(true);
    try {
      await updateNote(rootNoteId, { title: treeTitle });
      try { const rd = await fetchNoteDetail(rootNoteId); const rt = rd?.data?.note?.tags || []; if (!rt.includes('is_root')) await updateNote(rootNoteId, { tags: [...rt, 'is_root'] }); } catch {}
      setIsDirty(false);
      showToast('已保存');
    } catch { showToast('保存失败'); }
    setIsCreating(false);
    setSaving(false);
  };

  // ------ 导出：整棵树转为结构化笔记 ------
  const handleExport = () => setShowExportPicker(true);

  const handleExportDone = async (folder) => {
    setShowExportPicker(false);
    if (treeNodes.length === 0) { showToast('树为空，无内容可导出'); return; }
    setSaving(true);
    try {
      const res = await createNote({
        title: treeTitle || '时间树笔记',
        noteType: 'quick_timetree',
        tags: ['source:tree_export'],
        courseId: folder.dirId !== 'root' ? folder.dirId : undefined,
      });
      const exportNoteId = res?.data?.id;
      if (!exportNoteId) { showToast('导出失败'); setSaving(false); return; }
      // 从后端加载所有节点的内容
      const contentMap = {};
      for (const ecn of treeNodes) {
        try {
          const ecd = await fetchNoteDetail(ecn.id);
          const ecb = ecd?.data?.blocks || [];
          if (ecb.length > 0) contentMap[ecn.id] = ecb.map(b => b.content || '').filter(Boolean);
        } catch {}
      }
      const blocks = buildExportBlocks(contentMap);
      // 调用 saveNoteBlocks（PUT /notes/{id}/blocks）
      const { saveNoteBlocks } = await import('../../api/notes');
      await saveNoteBlocks(exportNoteId, blocks);
      showToast('已导出到我的笔记');
    } catch (e) { console.error('导出失败', e); showToast('导出失败'); }
    setIsCreating(false);
    setSaving(false);
  };

  // 递归构建导出内容的 blocks（含节点笔记内容）
  const buildExportBlocks = (contentOverride) => {
    const blocks = [];
    const nodeMap = {};
    treeNodes.forEach(n => { nodeMap[n.id] = { ...n, children: [] }; });
    const roots = [];
    treeNodes.forEach(n => {
      if (n.isTimeTreeRoot || !n.parentId) roots.push(nodeMap[n.id]);
      else { const p = nodeMap[n.parentId]; if (p) p.children.push(nodeMap[n.id]); }
    });
    const walk = (nodes, level) => {
      nodes.forEach(n => {
        if (!visibleNodeIds.has(n.id)) return;
        const headingLevel = Math.min(level + 1, 3);
        const checkChar = '#'.repeat(headingLevel);
        blocks.push({
          type: 'heading',
          content: n.title,
          position: blocks.length,
          metadata: { level: headingLevel },
        });
        // 加入该节点的标签
        const nodeTagList = (nodeTags[n.id] || []).filter(t => !t.startsWith('tree_') && !t.startsWith('root_display:') && !t.startsWith('parent_'));
        if (nodeTagList.length > 0) {
          blocks.push({
            type: 'paragraph',
            content: '标签: ' + nodeTagList.join(' / '),
            position: blocks.length,
            metadata: {},
          });
        }
        // 节点内容
        const nodeContent = (contentOverride && contentOverride[n.id]) || nodeNotes[n.id] || [];
        nodeContent.forEach(noteText => {
          blocks.push({
            type: 'paragraph',
            content: noteText,
            position: blocks.length,
            metadata: {},
          });
        });
        // 子节点递归
        if (n.children.length > 0) walk(n.children, level + 1);
      });
    };
    walk(roots, 0);
    return blocks;
  };

  // ------ 视觉效果（已有的 SVG 树形图、缩放、拖拽）------
  const handleWheel = (e) => { e.preventDefault(); setScale(Math.max(0.3, Math.min(2, scale + (e.deltaY > 0 ? -0.1 : 0.1)))); };
  const clickDetectRef = useRef({ x: 0, y: 0, t: 0 });
  const handleMouseDown = (e) => { clickDetectRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }; setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y }); setIsDragging(false); };
  const handleMouseMove = (e) => { if (e.buttons !== 1 || dragNodeId) return; if (!isDragging && (Math.abs(e.clientX - clickDetectRef.current.x) > 5 || Math.abs(e.clientY - clickDetectRef.current.y) > 5)) setIsDragging(true); if (isDragging) setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp = () => { if (!isDragging && Date.now() - clickDetectRef.current.t < 300) { setSelectedNodeId(null); setRightPanelOpen(false); } setIsDragging(false); };
  const resetView = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };
  const animateTo = (tx, ty) => {
    const d = 500, sx = translate.x, sy = translate.y, dx = tx - sx, dy = ty - sy, st = Date.now();
    const a = () => { const p = Math.min((Date.now() - st) / d, 1), e = 1 - Math.pow(1 - p, 3); setTranslate({ x: sx + dx * e, y: sy + dy * e }); if (p < 1) requestAnimationFrame(a); };
    a();
  };
  const focusOnNode = (nid) => {
    if (!treeContainerRef.current) return;
    const p = positionsRef.current.get(nid);
    if (!p) return;
    animateTo(treeContainerRef.current.clientWidth / 2 - p.x * scale, treeContainerRef.current.clientHeight / 2 - p.y * scale);
  };

  // 树形图布局计算（用稳定尺寸，不受侧边栏影响）
  const containerSizeRef = useRef({ w: 800, h: 600 });
  const calculateLayout = useCallback(() => {
    // 只用第一次的尺寸，避免侧边栏开关导致重排
    if (treeContainerRef.current) {
      const cw = treeContainerRef.current.clientWidth;
      const ch = treeContainerRef.current.clientHeight;
      if (cw > 0 && ch > 0) containerSizeRef.current = { w: cw, h: ch };
    }
    const { w, h } = containerSizeRef.current;
    const vc = visibleNodeIds.size, sf = Math.max(0.5, 1 - Math.min(0.5, (vc - 5) * 0.03));
    const nr = Math.max(18, 30 * sf), rr = Math.max(28, 45 * sf), pad = Math.max(30, 60 * sf);
    const nm = new Map(); treeNodes.forEach(n => nm.set(n.id, { ...n, children: [] }));
    const roots = []; treeNodes.forEach(n => { if (n.isTimeTreeRoot || !n.parentId) roots.push(nm.get(n.id)); else { const p = nm.get(n.parentId); if (p) p.children.push(nm.get(n.id)); } });
    const pos = new Map();
    const calc = (nodes, lv = 0, sx = pad, ex = w - pad) => {
      if (nodes.length === 0) return;
      const sw = (ex - sx) / nodes.length;
      nodes.forEach((n, i) => {
        const index = treeNodes.findIndex(t => t.id === n.id);
        const y = h - pad - (index / (treeNodes.length || 1)) * (h - 2 * pad);
        const x = sx + (i + 0.5) * sw;
        pos.set(n.id, { x, y, node: n, nodeRadius: nr, rootRadius: rr });
        if (n.children.length > 0) calc(n.children, lv + 1, sx + i * sw, sx + (i + 1) * sw);
      });
    };
    calc(roots);
    const key = JSON.stringify(treeNodes.map(n => n.id + n.parentId));
    if (key !== layoutKeyRef.current) {
      layoutKeyRef.current = key;
      // 保留已有节点的拖拽位置，只添加新节点
      const oldPositions = positionsRef.current;
      pos.forEach((v, k) => {
        if (!oldPositions.has(k)) oldPositions.set(k, v);
      });
      positionsRef.current = oldPositions;
    }
    return { positions: pos, width: w, height: h };
  }, [treeNodes, visibleNodeIds]);

  // ------ 渲染连线 ------
  const renderConnections = (_pos) => {
    const lines = [];
    treeNodes.forEach(n => {
      if (n.isTimeTreeRoot || !n.parentId) return;
      if (!positionsRef.current.has(n.id) || !positionsRef.current.has(n.parentId)) return;
      if (!visibleNodeIds.has(n.id) || !visibleNodeIds.has(n.parentId)) return;
      const c = positionsRef.current.get(n.id), p = positionsRef.current.get(n.parentId);
      lines.push(<g key={`l-${n.id}`} style={{ opacity: 0.4 }}>
        <path d={`M ${p.x} ${p.y} C ${p.x} ${(p.y + c.y) / 2}, ${c.x} ${(p.y + c.y) / 2}, ${c.x} ${c.y}`}
          stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" fill="none" />
      </g>);
    });
    return lines;
  };

  // ------ 渲染节点 ------
  const renderNodes = (_pos) => Array.from(positionsRef.current.entries()).map(([nid, p]) => {

    if (!visibleNodeIds.has(nid)) return null;
    const cur = nid === currentNodeId, root = p.node.isTimeTreeRoot, anim = animatingNodeIds.has(nid), sel = nid === selectedNodeId;
    const br = root ? (p.rootRadius || 45) : (p.nodeRadius || 30), cr = anim ? br * 0.1 : br;
    const fs = root ? Math.max(11, 18 * (br / 45)) : Math.max(9, 13 * (br / 30));
    const maxChars = root ? 6 : Math.floor(10 * (br / 30));
    const displayTitle = (p.node.title || '').length > maxChars ? p.node.title.substring(0, maxChars) + '…' : p.node.title || '?';
    return (
      <g key={`n-${nid}`} style={{ cursor: 'pointer' }}
        onClick={e => { e.stopPropagation(); if (e.ctrlKey || e.metaKey) { setMultiSelectNodes(prev => { const s = new Set(prev); if (s.has(nid)) { s.delete(nid); if (s.size === 0) setSelectedNodeId(nid); return s; } else { s.add(nid); return s; } }); setRightPanelOpen(true); } else { setSelectedNodeId(nid); setRightPanelOpen(true); } }}
        onDoubleClick={() => { setRenamingNode(nid); setRenameValue(p.node.title); }}>
        {sel && <circle cx={p.x} cy={p.y} r={cr + 8} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" />}
        {multiSelectNodes.has(nid) && <circle cx={p.x} cy={p.y} r={cr + 11} fill="none" stroke="#10A37F" strokeWidth="3" />}
        {cur && !anim && <circle cx={p.x} cy={p.y} r={cr + 5} fill="none" stroke="rgba(26,26,26,0.08)" strokeWidth="2" />}
        <circle cx={p.x} cy={p.y} r={cr}
          onMouseDown={(e) => handleNodeMouseDown(nid, e)}
          fill={root ? '#0f0f0f' : cur ? '#0f0f0f' : sel ? '#eff6ff' : '#f8f8f8'}
          stroke={root || cur ? '#0f0f0f' : sel ? '#3b82f6' : '#d1d1d1'}
          strokeWidth={root ? 2 : cur ? 2 : sel ? 2 : 1.5}
          style={{ transition: 'r 1s cubic-bezier(0.34,1.56,0.64,1), fill 0.4s ease, stroke 0.4s ease' }} />
        {!anim && <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          fontSize={fs} fontWeight={root || cur ? 600 : 400}
          fill={root || cur ? '#ffffff' : '#1a1a1a'}
          className="select-none pointer-events-none">{displayTitle}</text>}
      </g>
    );
  });

  const { positions, width, height } = calculateLayout();

  // ------ 全屏 ------
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen();
      else if (containerRef.current?.webkitRequestFullscreen) containerRef.current.webkitRequestFullscreen();
      setIsFullscreen(true); setLeftPanelOpen(false); setRightPanelOpen(false);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setIsFullscreen(false);
    }
  };
  useEffect(() => {
    const h = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 140px)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#10A37F] border-t-transparent animate-spin" />
          <div className="text-sm text-[#9ca3af]">加载时间树...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col space-y-4 relative" style={{ height: 'calc(100vh - 140px)' }}>
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-[#1F1F1F]" style={{ backgroundColor: '#10A37F' }}>{toast}</div>}
      {showExportPicker && <SaveFolderPicker fileName={`${treeTitle}.md`} onSave={handleExportDone} onCancel={() => setShowExportPicker(false)} />}

      {/* 顶栏 */}
      <div className="card p-4 flex-shrink-0">
        <div className="flex items-center">
          <button onClick={() => { if (isDirty) { setPendingNav('/quick-notes'); setShowExitConfirm(true); } else { window.location.href = '/quick-notes'; } }} className="p-1.5 rounded-xl hover:bg-[#f3f4f6] transition-colors mr-2">
            <svg className="h-5 w-5 text-[#7B7B7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleUploadFile} />
          <div className="flex items-center gap-2 mr-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input className="input-base !py-2" value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setTreeTitle(titleInput.trim() || '未命名主题'); setIsEditingTitle(false); } }} autoFocus />
                <button className="text-xs font-semibold text-[#1A7A57]"
                  onClick={() => { setTreeTitle(titleInput.trim() || '未命名主题'); setIsEditingTitle(false); if (rootNoteId) handleRename(rootNoteId, titleInput); }}>保存</button>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-[#1F1F1F] cursor-pointer hover:opacity-70"
                onClick={() => { setTitleInput(treeTitle); setIsEditingTitle(true); }}>{treeTitle}</h2>
            )}
          </div>
          <div className="flex items-center gap-1 mr-2">
            <button onClick={() => fileInputRef.current.click()} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#E2EBF7] text-[#2C5282] hover:bg-[#b8cdf0] transition-colors whitespace-nowrap">📹 上传</button>
            <button onClick={toggleRecording} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${isListening ? "bg-[#fce4e4] text-[#c0392b] animate-pulse" : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"}`}>{isListening ? '⏺' : '🎤 录音'}</button>
            <button onClick={handleAiFill} disabled={aiFilling} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#E9E2F7] text-[#5B3FA8] hover:bg-[#D3C6F0] transition-colors whitespace-nowrap">{aiFilling ? '...' : 'AI 填充'}</button>
          </div>
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="flex gap-2">
              {multiSelectNodes.size > 0 && <span className="text-[10px] text-[#5B3FA8] font-medium">已选{multiSelectNodes.size}个</span>}
              {multiSelectNodes.size > 0 && <button onClick={() => setMultiSelectNodes(new Set())} className="p-1 rounded hover:bg-[#f3f4f6] text-[#7B7B7B]" title="清除选中">✕</button>}
              <button onClick={async () => { const targets = multiSelectNodes.size > 0 ? [...multiSelectNodes] : [selectedNodeId || rootNoteId]; const addedNodes = []; for (const tid of targets) { const r = await createNote({ title: '新节点', noteType: 'quick_timetree', tags: rootNoteId ? ['tree_' + rootNoteId, 'parent_' + tid] : [] }); const nn = { id: r.data.id, title: '新节点', parentId: tid }; addedNodes.push(nn); setTreeNodes(prev => [...prev, nn]); setVisibleNodeIds(prev => new Set([...prev, nn.id])); } setIsDirty(true); if (addedNodes.length > 0) { pushAction('批量添加', async () => { for (const an of addedNodes) { try { await deleteNote(an.id); } catch {} } setTreeNodes(prev => prev.filter(x => !addedNodes.find(a => a.id === x.id))); setVisibleNodeIds(prev => { const s = new Set(prev); addedNodes.forEach(a => s.delete(a.id)); return s; }); setVisibleNodeIds(prev => { const s = new Set(prev); addedNodes.forEach(a => s.delete(a.id)); return s; }); }, async () => { for (const an of addedNodes) { const r2 = await createNote({ title: '新节点', noteType: 'quick_timetree', tags: rootNoteId ? ['tree_' + rootNoteId, 'parent_' + an.parentId] : [] }); an.id = r2.data.id; setTreeNodes(prev => [...prev, an]); setVisibleNodeIds(prev => new Set([...prev, an.id])); } }); } if (multiSelectNodes.size > 0) showToast('已为 ' + targets.length + ' 个节点添加子节点'); }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] transition-colors">
                + 添加子节点
              </button>
              {(selectedNodeId && selectedNodeId !== rootNoteId || multiSelectNodes.size > 0) && (
                <button onClick={async () => { const targets = multiSelectNodes.size > 0 ? [...multiSelectNodes] : [selectedNodeId]; const delItems = targets.map(id => treeNodes.find(n => n.id === id)).filter(Boolean).map(n => ({ id: n.id, title: n.title, parentId: n.parentId })); for (const did of targets) { try { await deleteNote(did); } catch {} } setTreeNodes(prev => prev.filter(n => !targets.includes(n.id))); setVisibleNodeIds(prev => { const s = new Set(prev); targets.forEach(id => s.delete(id)); return s; }); setMultiSelectNodes(new Set()); if (delItems.length > 0) { pushAction('批量删除', async () => { const restored = []; for (const di of delItems) { try { const r3 = await createNote({ title: di.title, noteType: 'quick_timetree', tags: rootNoteId ? ['tree_' + rootNoteId, 'parent_' + (di.parentId || rootNoteId)] : [] }); const rn = { id: r3.data.id, title: di.title, parentId: di.parentId }; if (di.id) di._newId = rn.id; restored.push(rn); } catch {} } setTreeNodes(prev => [...prev, ...restored]); restored.forEach(rn => setVisibleNodeIds(prev => new Set([...prev, rn.id]))); }, async () => { const idsToDel = delItems.map(d => d._newId || d.id).filter(Boolean); for (const did of idsToDel) { try { await deleteNote(did); } catch {} } setTreeNodes(prev => prev.filter(x => !idsToDel.includes(x.id))); setVisibleNodeIds(prev => { const s = new Set(prev); idsToDel.forEach(id => s.delete(id)); return s; }); }); } }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#fce4e4] text-[#c0392b] hover:bg-[#f8d0d0] transition-colors">
                  删除节点
                </button>
              )}
            </div>
          </div>
          <div className="flex-none flex items-center justify-end gap-1">
            <button onClick={handleUndo} disabled={undoCount===0} className="p-1.5 rounded-md transition-colors text-[#6b7280] hover:bg-[#e5e7eb]" title="撤销 (Ctrl+Z)">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
          </button>
          <button onClick={handleRedo} disabled={redoCount===0} className="p-1.5 rounded-md transition-colors text-[#6b7280] hover:bg-[#e5e7eb]" title="重做 (Ctrl+Y)">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"/></svg>
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-ghost">{saving ? '保存中...' : '保存'}</button>
            <button onClick={handleExport} className="btn-primary">导出笔记</button>
            
          <button onClick={toggleFullscreen} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-[#e5e7eb] text-[#7B7B7B] hover:bg-[#f5f5f5] transition-colors" title={isFullscreen ? '退出全屏' : '进入全屏'}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isFullscreen ? "M6 18L18 6M6 6l12 12" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 主体 */}
      <div className="flex-1 flex min-h-0 gap-3">
        {/* 左侧目录 */}
        <div className={`flex flex-col py-2 transition-all duration-300 ${leftPanelOpen ? 'w-72' : 'w-12'}`}>
          <button onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-[#e5e7eb] text-[#7B7B7B] hover:bg-[#f5f5f5] transition-colors" title="树结构">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          {leftPanelOpen && (
            <div className="p-5 flex-1 overflow-auto card mt-3">
              <h3 className="font-semibold text-[#1F1F1F] mb-4">树结构目录</h3>
              <TreeDirectory nodes={treeNodes} visibleNodeIds={visibleNodeIds} treeTitle={treeTitle}
                onSelectNode={(id) => { setSelectedNodeId(id); focusOnNode(id); }}
                onRename={handleRename} onDelete={handleDeleteNode} />
            </div>
          )}
        </div>

        {/* 树形图画布 */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div ref={treeContainerRef} className="flex-1 overflow-hidden relative card">
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              {treeNodes.length === 0 && !rootNoteId && (
                <button onClick={handleCreateTree} className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">
                  开始创建时间树
                </button>
              )}
              <button onClick={() => focusOnNode('root')} className="w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-50 flex items-center justify-center text-gray-700 text-xs">⊕</button>
              <div className="h-px bg-gray-200 my-1" />
              <button onClick={() => setScale(p => Math.min(2, p + 0.2))} className="w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-50 flex items-center justify-center text-gray-700">+</button>
              <button onClick={() => setScale(p => Math.max(0.3, p - 0.2))} className="w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-50 flex items-center justify-center text-gray-700">-</button>
              <button onClick={resetView} className="w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-50 flex items-center justify-center text-gray-700 text-xs">↺</button>
            </div>
            {renamingNode && (() => { const rp = positionsRef.current.get(renamingNode); if (!rp) return null; const sx = rp.x * scale + translate.x + treeContainerRef.current?.clientWidth/2 - width/2*scale; const sy = rp.y * scale + translate.y + treeContainerRef.current?.clientHeight/2 - height/2*scale; return (<input className="absolute z-20 px-2 py-1 text-sm bg-white border border-[#10A37F] rounded-xl shadow-lg focus:outline-none" style={{left: sx, top: sy, width: '120px', transform: 'translate(-50%, -50%)'}} value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){handleRename(renamingNode,renameValue.trim()||p.node.title);setRenamingNode(null)}if(e.key==='Escape')setRenamingNode(null)}} onBlur={()=>{if(renameValue.trim())handleRename(renamingNode,renameValue.trim());setRenamingNode(null)}} autoFocus />);})()}
            <svg ref={canvasRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}
              className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
              >
              <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}
                style={{ transition: 'transform 0.3s ease-out' }}>
                {renderConnections(positions)}
                {renderNodes(positions)}
              </g>
            </svg>
          </div>
        </div>

        {/* 右侧详情面板（浮层模式） */}
        <div className="relative">
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="w-10 h-10 rounded-xl bg-white border border-[#e5e7eb] text-[#7B7B7B] hover:bg-[#f5f5f5] transition-colors flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={rightPanelOpen ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>
      </div>
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { setShowExitConfirm(false); setPendingNav(null); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#1F1F1F] mb-2">未保存的更改</h3>
            <p className="text-sm text-[#7B7B7B] mb-5">你有未保存的更改，离开前是否保存？</p>
            <div className="flex gap-3 justify-end">
              <button onClick={async () => { await handleSave(); setShowExitConfirm(false); if (pendingNav) { setTimeout(() => { window.location.href = pendingNav; }, 100); } }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">保存</button>
              <button onClick={() => { setShowExitConfirm(false); if (pendingNav) window.location.href = pendingNav; }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] transition-colors">不保存</button>
              <button onClick={() => { setShowExitConfirm(false); setPendingNav(null); }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}
      {rightPanelOpen && (
        <div className="absolute z-50 flex justify-end pointer-events-none inset-0" style={{paddingTop:"80px"}}>
          <div className="flex-1" />
          <div className="w-80 bg-white shadow-2xl border-l border-[#e5e7eb] overflow-y-auto p-5 pointer-events-auto">
            {selectedNodeId ? (
              <NodeDetail
                nodeId={selectedNodeId}
                node={treeNodes.find(n => n.id === selectedNodeId)}
                nodeTags={nodeTags} nodeNotes={nodeNotes}
                noteInput={noteInput} setNoteInput={setNoteInput}
                setNodeTags={setNodeTags} setNodeNotes={setNodeNotes}
                onAddNote={handleAddNodeNote} onToggleTag={handleToggleTag} onRename={handleRename} onRemoveNote={handleRemoveNodeNote} setNodeNotes={setNodeNotes} setNoteInput={setNoteInput}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#A0A0A0] text-sm min-h-[200px]">选中节点查看详情</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ------ 子组件：树目录 ------
const TreeDirectory = ({ nodes, visibleNodeIds, treeTitle, onSelectNode, onRename, onDelete }) => {
  const nm = new Map(); nodes.forEach(n => nm.set(n.id, { ...n, children: [] }));
  const roots = []; nodes.forEach(n => {
    if (n.isTimeTreeRoot || !n.parentId) roots.push(nm.get(n.id));
    else { const p = nm.get(n.parentId); if (p) p.children.push(nm.get(n.id)); }
  });
  const renderNode = (node, level = 0) => {
    if (!visibleNodeIds.has(node.id)) return null;
    const isRoot = node.isTimeTreeRoot;
    const displayTitle = isRoot ? treeTitle : node.title;
    return (
      <div key={node.id} className="py-0.5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-[#f5f5f5] transition-colors group"
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => onSelectNode(node.id)}>
          {!isRoot && node.children.length > 0 && <svg className="w-4 h-4 text-[#A0A0A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
          {!isRoot && node.children.length === 0 && <div className="w-4" />}
          <span className="text-sm text-[#1F1F1F] flex-1 truncate">{displayTitle}</span>
          {!isRoot && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); const t = prompt('新名称:', node.title); if (t && t.trim()) onRename(node.id, t); }}
                className="p-1 rounded hover:bg-[#10A37F]/30 text-[#7B7B7B] hover:text-[#1F1F1F]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" /></svg>
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(node.id); }}
                className="p-1 rounded hover:bg-[#fce4e4] text-[#7B7B7B] hover:text-[#c0392b]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>
        {node.children.length > 0 && <div>{node.children.map(c => renderNode(c, level + 1))}</div>}
      </div>
    );
  };
  return <div className="space-y-0.5">{roots.map(n => renderNode(n))}</div>;
};

// ------ 子组件：节点详情 ------
const NodeDetail = ({ nodeId, node, nodeTags, nodeNotes, noteInput, setNoteInput, onAddNote, onToggleTag, onRename, onRemoveNote, setNodeNotes }) => {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const availableTags = ['重点', '难点', '疑问', '已理解'];
  const toggleTag = (tag) => onToggleTag(nodeId, tag); //

    const addNote = () => {
    if (!noteInput.trim()) return;
    onAddNote(nodeId, noteInput.trim());
    setNoteInput('');
  };
  const removeNote = (i) => { if (onRemoveNote) onRemoveNote(nodeId, i); };
  if (!node) return null;
  const ct = nodeTags[nodeId] || [], cn = nodeNotes[nodeId] || [];
  const isRoot = node.isTimeTreeRoot;
  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto">
      {/* 标题 */}
      <div className="pb-4 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-2">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input className="input-base !py-1.5 text-sm flex-1" value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { onRename(nodeId, nameInput.trim() || node.title); setEditingName(false); } }}
                onBlur={() => setEditingName(false)} autoFocus />
            </div>
          ) : (
            <h3 className="text-lg font-semibold text-[#1F1F1F] cursor-pointer hover:opacity-70 flex-1"
              onClick={() => { setNameInput(node.title); setEditingName(true); }}>{node.title}
            </h3>
          )}
        </div>
        <p className="text-xs text-[#A0A0A0] mt-1">ID: {node.id?.slice(0, 16)}</p>
      </div>

      {/* 标签 */}
      <div className="flex-shrink-0">
        <h4 className="text-sm font-medium text-[#7B7B7B] mb-2">标签</h4>
        <div className="flex flex-wrap gap-2">
          {availableTags.map(t => (
            <button key={t} onClick={() => toggleTag(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${ct.includes(t) ? 'bg-[#1F1F1F] text-white' : 'bg-black/[0.04] text-[#7B7B7B] hover:bg-black/[0.08]'}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* 笔记 */}
      <div className="flex-shrink-0">
        <h4 className="text-sm font-medium text-[#7B7B7B] mb-2">笔记</h4>
        <div className="flex gap-2 mb-3">
          <input className="flex-1 input-base text-sm" placeholder="添加笔记..." value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNote()} />
          <button onClick={addNote}
            className="px-4 py-2 bg-[#1F1F1F] text-white text-sm rounded-xl hover:opacity-80 transition-opacity">添加</button>
        </div>
        <div className="space-y-2">
          {cn.map((n, i) => (
            <div key={i} className="flex items-start justify-between gap-2 bg-[#f0f4ff] p-3.5 rounded-xl">
              <p className="text-sm text-[#1F1F1F] flex-1">{n}</p>
              <button onClick={() => removeNote(i)} className="text-[#A0A0A0] hover:text-[#c0392b]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeTreeNotes;
