/**
 * 共享 Markdown → HTML 渲染函数
 * 支持：标题、粗体、斜体、删除线、高亮、行内代码、
 *       代码块、表格、有序/无序列表、引用、链接、图片、分割线
 */
export function renderMarkdown(md) {
  if (!md) return { __html: '' };

  // 1) 先保护代码块（```），避免被后续正则误伤
  const codeBlocks = [];
  let html = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trimEnd());
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
  });

  // 2) 保护行内代码
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    inlineCodes.push(code.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    return `%%INLINECODE_${inlineCodes.length - 1}%%`;
  });

  // 3) HTML 转义（不影响已保护的占位符）
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 4) 表格 — 必须在段落处理之前
  html = html.replace(/^\|(.+)\|\s*\n\|[-:\s|]+\|\s*\n((?:\|.+\|\s*\n?)+)/gm, (_, header, body) => {
    const headers = header.split('|').map(h => h.trim()).filter(Boolean);
    const rows = body.trim().split('\n').map(row =>
      row.split('|').map(c => c.trim()).filter(Boolean)
    );
    const thead = `<tr>${headers.map(h => `<th class="px-3 py-2 text-left text-xs font-semibold text-[#1F1F1F] bg-[#F1F5F9] border border-[#94A3B8]">${h}</th>`).join('')}</tr>`;
    const tbody = rows.map(cells =>
      `<tr>${cells.map(c => `<td class="px-3 py-2 text-sm text-[#374151] border border-[#94A3B8]">${c}</td>`).join('')}</tr>`
    ).join('');
    return `<table class="w-full border-collapse border-2 border-[#64748B] rounded-lg overflow-hidden mb-3 mt-2"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  });

  // 5) 标题
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-[#1F1F1F] mt-4 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-[#1F1F1F] mt-5 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-[#1F1F1F] mt-6 mb-3">$1</h1>');

  // 6) 分割线
  html = html.replace(/^[-*_]{3,}$/gm, '<hr class="my-3 border-[#E5E7EB]" />');

  // 7) 引用
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-3 border-[#E9E2F7] pl-3 py-1 my-2 text-[#6B7280] italic">$1</blockquote>');

  // 8) 列表 — 先处理无序，再处理有序
  html = html.replace(/^[\*\-] (.+)$/gm, '<li class="ml-4 list-disc text-sm text-[#374151]">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm text-[#374151]">$1</li>');

  // 9) 粗体、斜体、删除线、高亮
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>');
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic">$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del class="line-through text-[#9CA3AF]">$1</del>');
  html = html.replace(/==(.+?)==/g, '<mark class="bg-[#10A37F]/40 px-0.5 rounded">$1</mark>');

  // 10) 链接 & 图片
  html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-2" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#5B3FA8] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // 11) 还原行内代码
  html = html.replace(/%%INLINECODE_(\d+)%%/g, (_, i) =>
    `<code class="px-1.5 py-0.5 bg-[#F3F4F6] rounded text-sm font-mono text-[#DC2626]">${inlineCodes[i]}</code>`
  );

  // 12) 还原代码块
  html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (_, i) =>
    `<pre class="bg-[#1F2937] text-[#E5E7EB] p-4 rounded-lg mt-2 mb-2 overflow-x-auto"><code class="text-sm font-mono whitespace-pre-wrap">${codeBlocks[i]}</code></pre>`
  );

  // 13) 段落：用空行分隔
  html = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // 已经是块级标签的不再包裹
    if (/^<(h[1-3]|table|pre|blockquote|ul|ol|li|hr|div|img)/.test(trimmed)) return trimmed;
    return `<p class="mb-2 text-sm leading-relaxed text-[#374151]">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return { __html: html };
}
