import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import katex from 'katex';
import { SaveFolderPicker } from '../../shared/components';
import { uploadFile, uploadUrl, startParse, getParseProgress, deleteFile as apiDeleteFile } from '../../api/resourceNotes';
import { createNote, addNoteBlock } from '../../api/notes';
import { PageHeader, Button, Icon } from '../../shared/ui';
import { useAgent } from '../agent/AgentContext';

const ICON_RESOURCE = 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5';
const ICON_CHAT = 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z';

/**
 * 资源转笔记页面主组件
 *
 * 完整流程：
 * 1. 选择文件/粘贴链接 → 上传到后端 → 获取 fileId
 * 2. 点击"开始解析" → POST /parse → 获取 taskId
 * 3. 轮询 GET /progress/{taskId} → 更新进度条
 * 4. 完成后展示 Markdown 结果 → 保存至笔记
 */
const ResourceToNotes = () => {
  const { askAI } = useAgent();
  const navigate = useNavigate();
  const askAboutResource = () => {
    askAI('我刚导入了一些学习资源，帮我看看可以怎么把它们整理成结构化笔记、重点复习哪些内容');
    navigate('/agent');
  };

  // ---------- 文件列表（含后端 fileId） ----------
  const [files, setFiles] = useState([]);

  // ---------- 解析状态 ----------
  // idle | uploading | parsing | completed | failed
  const [parsingStatus, setParsingStatus] = useState('idle');
  const [parseProgress, setParseProgress] = useState(0);
  const [parsePhase, setParsePhase] = useState('');

  // ---------- 解析结果（后端返回的 Markdown 字符串） ----------
  const [aiResult, setAiResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // ---------- URL 输入 ----------
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');

  // ---------- 编辑结果 (需求3) ----------
  const [editedResult, setEditedResult] = useState(null);  // 用户编辑后的 Markdown
  const [viewMode, setViewMode] = useState('preview');      // 'preview' | 'edit'

  // ---------- 删除确认 (需求1) ----------
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState(null);

  // ---------- Toast & 保存 ----------
  const [toast, setToast] = useState('');
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // ---------- Refs ----------
  const fileInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const pollingRef = useRef(null); // 轮询定时器

  // Toast 自动消失
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // 组件卸载时清除轮询
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ---------- 文件类型配色 ----------
  const typeColors = {
    pdf:       { bg: 'bg-[#fce4e4]', text: 'text-[#c0392b]' },
    video:     { bg: 'bg-[#E2EBF7]', text: 'text-[#2C5282]' },
    ppt:       { bg: 'bg-[#F7ECD9]', text: 'text-[#8A5A1A]' },
    audio:     { bg: 'bg-[#E9E2F7]', text: 'text-[#5B3FA8]' },
    webpage:   { bg: 'bg-[#D7EFE4]', text: 'text-[#1A7A57]' },
    docx:      { bg: 'bg-[#D6E8FF]', text: 'text-[#2a5a8a]' },
    markdown:  { bg: 'bg-[#F0E8FF]', text: 'text-[#5a3a7a]' },
    html:      { bg: 'bg-[#FFE8D6]', text: 'text-[#8a5a2a]' },
  };

  // ---------- 推断文件类型 ----------
  const inferType = (filename) => {
    const n = filename.toLowerCase();
    if (n.endsWith('.pdf')) return 'pdf';
    if (n.endsWith('.ppt') || n.endsWith('.pptx')) return 'ppt';
    if (n.endsWith('.doc') || n.endsWith('.docx')) return 'docx';
    if (n.endsWith('.md')) return 'markdown';
    if (n.endsWith('.html') || n.endsWith('.htm')) return 'html';
    if (n.match(/\.(mp4|avi|mov|mkv|webm)$/)) return 'video';
    if (n.match(/\.(mp3|wav|flac|m4a|ogg)$/)) return 'audio';
    return 'other';
  };

  // ---------- 文件上传（调用后端） ----------
  const handlePdfUpload  = () => { fileInputRef.current?.click(); };
  const handleMediaUpload = () => { mediaInputRef.current?.click(); };

  /** 选择文件后上传到后端 */
  const handleFileChange = async (e, type) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const selectedFiles = Array.from(fileList);

    // 先添加到本地列表，标记"上传中"
    const localFiles = selectedFiles.map((f, i) => ({
      id:       `local_${Date.now()}_${i}`,
      fileId:   null,           // 后端返回后填充
      name:     f.name,
      type:     inferType(f.name) || type,
      size:     `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      file:     f,              // 原始 File 对象
      uploading: true,
    }));
    setFiles(p => [...p, ...localFiles]);

    // 逐个上传到后端
    for (const lf of localFiles) {
      try {
        const result = await uploadFile(lf.file);
        setFiles(p => p.map(x =>
          x.id === lf.id
            ? { ...x, fileId: result.fileId, uploading: false }
            : x
        ));
      } catch (err) {
        console.error('上传失败:', lf.name, err);
        setFiles(p => p.map(x =>
          x.id === lf.id
            ? { ...x, uploading: false, uploadError: err.message }
            : x
        ));
        setToast(`${lf.name} 上传失败: ${err.message}`);
      }
    }
  };

  // ---------- 网页链接（上传到后端） ----------
  const handleUrlSubmit = async () => {
    if (!urlValue.trim()) return;
    const url = urlValue.startsWith('http') ? urlValue.trim() : `https://${urlValue.trim()}`;
    setUrlValue('');
    setShowUrlInput(false);

    const localId = `local_${Date.now()}`;
    setFiles(p => [...p, {
      id: localId, fileId: null, name: `网页: ${url}`,
      type: 'webpage', size: '—', file: null, uploading: true,
    }]);

    try {
      const result = await uploadUrl(url);
      setFiles(p => p.map(x =>
        x.id === localId
          ? { ...x, fileId: result.fileId, uploading: false, name: `网页: ${result.filename}` }
          : x
      ));
      setToast('网页链接已添加');
    } catch (err) {
      console.error('提交链接失败:', err);
      setFiles(p => p.map(x =>
        x.id === localId
          ? { ...x, uploading: false, uploadError: err.message }
          : x
      ));
      setToast(`链接提交失败: ${err.message}`);
    }
  };

  // ---------- 删除文件 (需求1) ----------
  const handleDeleteFile = async (fileId, fileName) => {
    setConfirmDeleteFileId(null);
    try {
      await apiDeleteFile(fileId);
      setFiles(p => p.filter(x => x.fileId !== fileId));
      setToast(`已删除: ${fileName}`);
    } catch (err) {
      console.error('删除文件失败:', err);
      setToast(`删除失败: ${err.message}`);
    }
  };

  // ---------- 开始解析（调用后端） ----------
  const handleStartParse = async () => {
    // 筛选已成功上传的文件
    const readyFiles = files.filter(f => f.fileId && !f.uploading);
    if (readyFiles.length === 0) {
      setToast('请先上传文件或添加链接');
      return;
    }

    const fileIds = readyFiles.map(f => f.fileId);

    // 清除旧结果
    setAiResult(null);
    setErrorMessage('');
    setParsingStatus('parsing');
    setParseProgress(0);
    setParsePhase('正在提交解析任务...');

    try {
      // 1. 提交解析任务
      const parseResp = await startParse(fileIds);
      const taskId = parseResp.data?.taskId || parseResp.taskId;
      if (!taskId) throw new Error('未获取到任务 ID');

      setParsePhase('正在读取文件...');

      // 2. 轮询进度（含失败计数，连续 5 次失败后停止）
      let failCount = 0;
      pollingRef.current = setInterval(async () => {
        try {
          const progress = await getParseProgress(taskId);
          failCount = 0; // 成功则重置计数

          setParseProgress(progress.progress ?? 0);
          setParsePhase(progress.phase || '');

          if (progress.status === 'completed') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setParsingStatus('completed');
            setParseProgress(100);
            setParsePhase('解析完成');
            if (progress.result) {
              setAiResult(progress.result);
              setEditedResult(progress.result);  // 初始化可编辑内容
              setViewMode('preview');
            }
            setToast('AI 解析完成');
          } else if (progress.status === 'failed') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setParsingStatus('failed');
            setErrorMessage(progress.error || '未知错误');
            setToast(`解析失败: ${progress.error || '未知错误'}`);
          }
        } catch (err) {
          failCount++;
          console.error(`查询进度失败 (${failCount}/5):`, err);
          if (failCount >= 5) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setParsingStatus('failed');
            setErrorMessage(`轮询失败（连续 ${failCount} 次）: ${err.message}`);
            setToast('进度查询失败，请检查后端服务是否正常');
          }
        }
      }, 1500);

    } catch (err) {
      console.error('提交解析任务失败:', err);
      setParsingStatus('failed');
      setErrorMessage(`提交解析失败: ${err.message}`);
      setToast(`提交解析失败: ${err.message}`);
    }
  };

  // ---------- 保存至笔记 ----------
  const handleSaveToNotes = () => setShowSavePicker(true);

  /** 真正调用后端创建笔记，并写入 AI 解析内容 */
  const handleSaveDone = async (result) => {
    setShowSavePicker(false);

    try {
      // 生成笔记标题（取第一个文件的文件名）
      const firstFile = files.find(f => f.fileId && !f.uploading);
      const title = firstFile
        ? `AI笔记-${firstFile.name.replace(/\.[^.]+$/, '')}`
        : 'AI解析笔记';

      // 判定 courseId：只有真实课程 ID 才传（排除 root 和虚拟文件夹 d_xxx）
      const courseId = (result.dirId && result.dirId !== 'root' && !result.dirId.startsWith('d_'))
        ? result.dirId
        : undefined;

      // 1. 创建笔记
      const noteResp = await createNote({
        title,
        courseId,
        tags: ['resource-import'],
      });
      const noteId = noteResp.data?.id || noteResp.id;
      if (!noteId) throw new Error('创建笔记失败：未获取到笔记 ID');

      // 2. 将 Markdown 内容按 ## 拆分，写入笔记块（使用编辑后的内容）
      const contentToSave = editedResult || aiResult;
      const sections = contentToSave.split(/(?=^## )/m).filter(Boolean);
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (!section) continue;
        const isHeading = /^## /.test(section);
        await addNoteBlock(noteId, {
          content: section,
          blockType: isHeading ? 'ai_summary' : 'paragraph',
        });
      }

      setSaveResult({ noteId, path: result.path });
      setToast('已保存至我的笔记');
    } catch (err) {
      console.error('保存笔记失败:', err);
      setToast(`保存失败: ${err.message}`);
    }
  };

  // ---------- 结果容器 ref ----------
  const resultRef = useRef(null);

  // ---------- Markdown → HTML 渲染（含 KaTeX 数学公式） ----------
  const renderMarkdown = useCallback((md) => {
    if (!md) return '';

    // 辅助：用 KaTeX 渲染公式为 HTML
    const renderMath = (formula, displayMode) => {
      try {
        return katex.renderToString(formula, {
          displayMode,
          throwOnError: false,
          strict: false,
        });
      } catch (e) {
        return displayMode
          ? `<div class="math-error">$${formula}$</div>`
          : `<span class="math-error">$${formula}$</span>`;
      }
    };

    // 1. 提取并保护数学公式（先 $$ 后 $，渲染为 HTML）
    const mathBlocks = [];
    const PLACEHOLDER = '%%MATH%%';

    let html = md
      // $$...$$ 显示公式 → 用 KaTeX 渲染
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, f) => {
        mathBlocks.push(renderMath(f.trim(), true));
        return `${PLACEHOLDER}${mathBlocks.length - 1}%%`;
      })
      // $...$ 行内公式 → 用 KaTeX 渲染
      .replace(/\$(.+?)\$/g, (_, f) => {
        mathBlocks.push(renderMath(f.trim(), false));
        return `${PLACEHOLDER}${mathBlocks.length - 1}%%`;
      });

    // 2. HTML 转义
    html = html
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 3. Markdown → HTML
    html = html
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-100 rounded-xl p-4 my-3 overflow-x-auto text-xs"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-[#c0392b]">$1</code>')
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-[#1F1F1F] mt-5 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-[#1F1F1F] mt-6 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-[#1F1F1F] mt-6 mb-3">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-5 text-sm text-[#7B7B7B] list-disc">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 text-sm text-[#7B7B7B] list-decimal">$1</li>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[#10A37F] pl-4 my-3 text-sm text-[#7B7B7B] italic">$1</blockquote>')
      .replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')
      .replace(/\n\n/g, '</p><p class="text-sm text-[#7B7B7B] leading-relaxed my-2">')
      .replace(/\n/g, '<br />');

    html = '<p class="text-sm text-[#7B7B7B] leading-relaxed my-2">' + html + '</p>';

    // 4. 恢复数学公式
    for (let i = 0; i < mathBlocks.length; i++) {
      html = html.replace(`${PLACEHOLDER}${i}%%`, mathBlocks[i]);
    }

    return html;
  }, []);

  // ==================== JSX ====================
  return (
    <div className="space-y-6">
      {/* ---------- Toast ---------- */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-[#1F1F1F] shadow-md"
          style={{ backgroundColor: '#10A37F' }}
        >
          {toast}
          {saveResult && (
            <button
              onClick={() => (window.location.href = '/note-management')}
              className="ml-2 underline font-bold"
            >
              立即打开
            </button>
          )}
        </div>
      )}

      {/* ---------- 删除确认弹窗 (需求1) ---------- */}
      {confirmDeleteFileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-3xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-[#1F1F1F] mb-2">确认删除</h3>
            <p className="text-sm text-[#7B7B7B] mb-5">
              确定要删除此文件吗？此操作不可撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteFileId(null)}
                className="px-5 h-10 rounded-2xl text-sm font-medium text-[#7B7B7B] hover:bg-gray-100 transition-all"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const fileToDelete = files.find(f => f.id === confirmDeleteFileId);
                  handleDeleteFile(fileToDelete?.fileId, fileToDelete?.name || '文件');
                }}
                className="px-5 h-10 rounded-2xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 保存弹窗 ---------- */}
      {showSavePicker && (
        <SaveFolderPicker
          fileName="AI解析笔记.md"
          onSave={handleSaveDone}
          onCancel={() => setShowSavePicker(false)}
        />
      )}

      {/* ---------- 隐藏的文件输入 ---------- */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.ppt,.pptx,.doc,.docx,.md,.html,.htm"
        multiple
        className="hidden"
        onChange={e => handleFileChange(e, 'pdf')}
      />
      <input
        ref={mediaInputRef}
        type="file"
        accept="video/*,audio/*"
        multiple
        className="hidden"
        onChange={e => handleFileChange(e, 'video')}
      />

      {/* ---------- 标题 ---------- */}
      <PageHeader
        icon={ICON_RESOURCE}
        title="资源转笔记"
        description="上传 PDF / PPT / 音视频，让 AI 解析成结构化笔记"
        actions={
          <Button variant="ghost" onClick={askAboutResource}>
            <Icon d={ICON_CHAT} className="h-4 w-4" />
            问 AI
          </Button>
        }
      />

      {/* ---------- 上传区域 ---------- */}
      <div className="card p-8">
        <h2 className="font-semibold text-[#1F1F1F] mb-5">上传资源</h2>
        <div
          className="border-2 border-dashed rounded-3xl p-10 text-center mb-6"
          style={{
            borderColor: 'rgba(0,0,0,0.08)',
            backgroundColor: 'rgba(0,0,0,0.012)',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto mb-4"
            fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1}
            style={{ color: '#A0A0A0' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-[#7B7B7B] mb-5 font-medium">
            拖拽文件到此处或点击下方按钮上传
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={handlePdfUpload} className="btn-primary">
              上传文档 (PDF/PPT/Word/MD/HTML)
            </button>
            <button
              onClick={handleMediaUpload}
              className={`px-5 h-11 rounded-3xl text-sm font-medium transition-all duration-200
                ${showUrlInput
                  ? 'opacity-40 pointer-events-none'
                  : 'bg-[#E2EBF7] text-[#2C5282] hover:bg-[#C7DCF2] hover:-translate-y-0.5 active:scale-[0.98]'}`}
            >
              导入音视频
            </button>
            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className={`px-5 h-11 rounded-3xl text-sm font-semibold transition-all duration-200
                ${showUrlInput
                  ? 'bg-[#10A37F]/30 text-[#1F1F1F] ring-2 ring-[#10A37F]/50'
                  : 'bg-[#D7EFE4] text-[#1A7A57] hover:bg-[#BFE5D9] hover:-translate-y-0.5 active:scale-[0.98]'}`}
            >
              粘贴网页链接 {showUrlInput ? '✓' : ''}
            </button>
          </div>
        </div>

        {/* ---------- 网页链接输入 ---------- */}
        {showUrlInput && (
          <div
            className="flex gap-2 mb-4 p-4 rounded-2xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.015)' }}
          >
            <input
              className="input-base flex-1"
              placeholder="输入网页链接..."
              value={urlValue}
              onChange={e => setUrlValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
              autoFocus
            />
            <button onClick={handleUrlSubmit} className="btn-primary">
              提交
            </button>
            <button
              onClick={() => { setShowUrlInput(false); setUrlValue(''); }}
              className="px-5 h-11 rounded-3xl text-sm font-medium text-[#7B7B7B] hover:bg-black/[0.04] hover:text-[#1F1F1F] transition-all duration-200"
            >
              取消
            </button>
          </div>
        )}

        {/* ---------- 已上传文件列表 ---------- */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-[#1F1F1F]">已上传文件</h3>
          <span className="text-xs text-[#A0A0A0] font-medium">
            {files.length} 个文件
          </span>
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-[#A0A0A0] text-center py-6">暂无文件，请上传或粘贴链接</p>
        ) : (
          <div className="space-y-2">
            {files.map(file => {
              const tc = typeColors[file.type] || typeColors.pdf;
              const hasError = !!file.uploadError;
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 rounded-2xl"
                  style={{ backgroundColor: hasError ? 'rgba(255,0,0,0.04)' : 'rgba(0,0,0,0.015)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tc.bg} ${tc.text}`}>
                      {/* 图标省略——与你现有代码一致，此处保留框架 */}
                      {file.type === 'pdf' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      )}
                      {file.type === 'video' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                      )}
                      {file.type === 'ppt' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      )}
                      {file.type === 'audio' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                      )}
                      {file.type === 'webpage' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>
                      )}
                      {file.type === 'docx' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      )}
                      {file.type === 'markdown' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
                      )}
                      {file.type === 'html' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#1F1F1F]">{file.name}</p>
                      <p className="text-xs text-[#A0A0A0] font-medium">
                        {file.type.toUpperCase()} · {file.size}
                        {file.uploading && <span className="ml-2 text-[#2C5282]">上传中...</span>}
                        {hasError && <span className="ml-2 text-red-500">上传失败</span>}
                      </p>
                    </div>
                  </div>
                  {/* 删除按钮 (需求1) */}
                  {!file.uploading && (
                    <button
                      onClick={() => setConfirmDeleteFileId(file.id)}
                      className="p-2 rounded-xl text-[#A0A0A0] hover:text-red-500 hover:bg-red-50 transition-all duration-200 shrink-0"
                      title="删除文件"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- 开始解析按钮 ---------- */}
      <div className="flex justify-center">
        <button
          onClick={handleStartParse}
          disabled={
            files.length === 0 ||
            files.some(f => f.uploading) ||
            parsingStatus === 'parsing'
          }
          className={`px-8 h-12 rounded-3xl text-sm font-semibold transition-all duration-200 ${
            files.length === 0 || files.some(f => f.uploading) || parsingStatus === 'parsing'
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'btn-primary hover:-translate-y-0.5 active:scale-[0.98]'
          }`}
        >
          {parsingStatus === 'parsing' ? '解析中...' : '开始解析'}
        </button>
      </div>

      {/* ---------- AI 解析进度滑块 ---------- */}
      {parsingStatus !== 'idle' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#1F1F1F]">AI 解析进度</h2>
            <span className="text-sm font-semibold" style={{ color: '#5C7A10' }}>
              {parseProgress}%
            </span>
          </div>
          {/* 进度条 */}
          <div className="progress-bar h-2.5 mb-2">
            <div
              className="progress-fill transition-all duration-300"
              style={{ width: `${parseProgress}%`, backgroundColor: parsingStatus === 'failed' ? '#e74c3c' : '#10A37F' }}
            />
          </div>
          {/* 阶段文字 */}
          <p className="text-xs text-[#7B7B7B] font-medium">{parsePhase}</p>
        </div>
      )}

      {/* ---------- AI 解析结果（可编辑 Markdown + 预览，需求3） ---------- */}
      {parsingStatus === 'completed' && aiResult && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <h2 className="font-semibold text-[#1F1F1F] mr-3">AI 解析结果</h2>
              {/* 编辑 / 预览切换 */}
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 h-7 rounded-xl text-xs font-medium transition-all ${
                  viewMode === 'preview'
                    ? 'bg-[#10A37F]/30 text-[#1F1F1F]'
                    : 'text-[#7B7B7B] hover:bg-gray-100'
                }`}
              >
                预览
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 h-7 rounded-xl text-xs font-medium transition-all ${
                  viewMode === 'edit'
                    ? 'bg-[#10A37F]/30 text-[#1F1F1F]'
                    : 'text-[#7B7B7B] hover:bg-gray-100'
                }`}
              >
                编辑
              </button>
              {editedResult !== aiResult && (
                <button
                  onClick={() => { setEditedResult(aiResult); setToast('已恢复原文'); }}
                  className="px-3 h-7 rounded-xl text-xs font-medium text-[#7B7B7B] hover:bg-gray-100 transition-all"
                  title="恢复原文"
                >
                  恢复原文
                </button>
              )}
            </div>
            <button onClick={handleSaveToNotes} className="btn-primary !h-8 !text-xs">
              保存至我的笔记
            </button>
          </div>

          {viewMode === 'preview' ? (
            <div
              ref={resultRef}
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(editedResult || aiResult) }}
            />
          ) : (
            <textarea
              value={editedResult || ''}
              onChange={e => setEditedResult(e.target.value)}
              className="w-full min-h-[400px] p-4 rounded-2xl text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[#10A37F]/50"
              style={{
                backgroundColor: 'rgba(0,0,0,0.02)',
                border: '1px solid rgba(0,0,0,0.08)',
                color: '#1F1F1F',
              }}
              spellCheck={false}
            />
          )}
        </div>
      )}

      {/* ---------- 解析失败提示 (需求2: 友好错误提示) ---------- */}
      {parsingStatus === 'failed' && (
        <div className="card p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-500 font-medium">解析失败</p>
          </div>
          {errorMessage && (
            <>
              <p className="text-xs text-[#7B7B7B] mt-1 max-w-md mx-auto">{errorMessage}</p>
              {/* 如果是反爬相关错误，给出替代方案建议 */}
              {(errorMessage.includes('检测到自动化访问') || errorMessage.includes('拒绝提供内容')) && (
                <div className="mt-3 p-3 rounded-2xl mx-auto max-w-md" style={{ backgroundColor: 'rgba(16,163,127,0.15)' }}>
                  <p className="text-xs text-[#5C7A10] font-medium">
                    替代方案：① 尝试将页面保存为本地 HTML 文件后上传解析；② 手动复制网页中的关键内容，以纯文本或 Markdown 格式粘贴后上传。
                  </p>
                </div>
              )}
            </>
          )}
          <button
            onClick={() => { setParsingStatus('idle'); setErrorMessage(''); setParseProgress(0); setAiResult(null); setEditedResult(null); }}
            className="mt-3 text-xs font-semibold underline"
            style={{ color: '#5C7A10' }}
          >
            重新上传文件
          </button>
        </div>
      )}
    </div>
  );
};

export default ResourceToNotes;
