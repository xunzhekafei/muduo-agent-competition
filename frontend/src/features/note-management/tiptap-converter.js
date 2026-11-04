/**
 * TipTap ←→ 后端 NoteBlock 格式互转
 *
 * 后端 NoteBlock 类型与 TipTap 节点类型的映射：
 *   paragraph      → paragraph
 *   heading        → heading（level 从 metadata.level 来）
 *   quote          → blockquote
 *   todo           → taskList + taskItem
 *   code           → codeBlock
 *   table          → table + tableRow + tableCell + tableHeader
 *   ai_summary     → paragraph（携带 dataBlockType="ai_summary"）
 *   thinking       → paragraph（携带 dataBlockType="thinking"）
 *   memory_cards   → paragraph（携带 dataBlockType="memory_cards"）
 *   formula        → paragraph（携带 dataBlockType="formula"）
 *   annotation     → paragraph（携带 dataBlockType="annotation"）
 *   relations      → paragraph（携带 dataBlockType="relations"）
 */

const CUSTOM_BLOCK_TYPES = new Set([
  'ai_summary', 'thinking', 'memory_cards',
  'formula', 'annotation', 'relations',
]);

export function blocksToTipTap(blocks) {
  if (!blocks || blocks.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
  const content = blocks
    .filter(b => b && b.content !== undefined)
    .map(b => blockToNode(b));
  return { type: 'doc', content };
}

function blockToNode(block) {
  const type = block.blockType || block.type || block.block_type || 'paragraph';
  switch (type) {
    case 'heading': {
      const level = block.level || 2;
      return {
        type: 'heading',
        attrs: { level },
        content: inlineContent(block.content),
      };
    }
    case 'quote':
      return {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: inlineContent(block.content) }],
      };
    case 'code':
      return {
        type: 'codeBlock',
        attrs: { language: null },
        content: block.content ? [{ type: 'text', text: block.content }] : [],
      };
    case 'todo': {
      const checked = block.content.startsWith('- [x]');
      const text = block.content.replace(/^- \[[x ]\]\s*/, '');
      return {
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { checked },
          content: [{ type: 'paragraph', content: inlineContent(text) }],
        }],
      };
    }
    case 'table': {
      const headers = block.headers || [];
      const rows = block.rows || [];
      const tableContent = [];
      if (headers.length > 0) {
        tableContent.push({
          type: 'tableRow',
          content: headers.map(h => ({
            type: 'tableHeader',
            content: [{ type: 'paragraph', content: inlineContent(h) }],
          })),
        });
      }
      rows.forEach(row => {
        const cells = (row || []).map(c => ({
          type: 'tableCell',
          content: [{ type: 'paragraph', content: inlineContent(c || '') }],
        }));
        if (cells.length > 0) {
          tableContent.push({ type: 'tableRow', content: cells });
        }
      });
      return { type: 'table', content: tableContent };
    }
    default:
      const node = { type: 'paragraph', attrs: {}, content: inlineContent(block.content) };
      if (CUSTOM_BLOCK_TYPES.has(type)) {
        node.attrs.dataBlockType = type;
        node.attrs.originalMetadata = extractMetadata(block);
      }
      return node;
  }
}

function inlineContent(text) {
  if (!text) return [];
  return [{ type: 'text', text: String(text) }];
}

function extractMetadata(block) {
  const meta = {};
  ['level','highlights','headers','rows','question','userAnswer',
   'aiFollowUp','userAnswer2','aiFeedback','cards','items'].forEach(f => {
    if (block[f]) meta[f] = block[f];
  });
  return meta;
}

export function tipTapToBlocks(doc, oldBlocks = []) {
  if (!doc || !doc.content) return [];
  const oldByPos = {};
  (oldBlocks || []).forEach(b => { oldByPos[b.position] = b; });
  const blocks = [];
  let pos = 0;
  doc.content.forEach(node => {
    const converted = nodeToBlocks(node, pos, oldByPos[pos]);
    if (converted) {
      if (Array.isArray(converted)) {
        const filtered = converted.filter(c => c.content && c.content.trim());
        filtered.forEach(c => { c.position = pos++; blocks.push(c); });
      } else if (converted.content && converted.content.trim()) {
        converted.position = pos++;
        blocks.push(converted);
      } else {
        pos++;
      }
    }
  });
  return blocks;
}

function nodeToBlocks(node, position, oldBlock) {
  if (!node || node.type === 'text') return null;
  const oldId = oldBlock?.id || null;
  switch (node.type) {
    case 'paragraph': {
      const text = extractText(node);
      const dataBlockType = node.attrs?.dataBlockType;
      const meta = {};
      if (dataBlockType && CUSTOM_BLOCK_TYPES.has(dataBlockType)) {
        const origMeta = node.attrs?.originalMetadata || {};
        Object.assign(meta, origMeta);
        return { id: oldId, content: text, blockType: dataBlockType, metadata: meta };
      }
      return { id: oldId, content: text, blockType: 'paragraph', metadata: {} };
    }
    case 'heading': {
      const level = node.attrs?.level || 2;
      return { id: oldId, content: extractText(node), blockType: 'heading', metadata: { level } };
    }
    case 'blockquote': {
      return { id: oldId, content: extractText(node), blockType: 'quote', metadata: {} };
    }
    case 'codeBlock': {
      return { id: oldId, content: extractText(node), blockType: 'code', metadata: {} };
    }
    case 'taskList': {
      const items = (node.content || []).map((item, i) => {
        const checked = item.attrs?.checked || false;
        const text = extractText(item);
        const prefix = checked ? '- [x] ' : '- [ ] ';
        return { id: i === 0 ? oldId : null, content: prefix + text, blockType: 'todo', metadata: {} };
      });
      return items;
    }
    case 'table': {
      const headers = [];
      const rows = [];
      const children = node.content || [];
      children.forEach((row, rowIdx) => {
        if (row.type !== 'tableRow') return;
        const cells = (row.content || []).map(cell => extractText(cell));
        const isHeader = (row.content || []).some(c => c.type === 'tableHeader');
        if (rowIdx === 0 && isHeader) { headers.push(...cells); return; }
        rows.push(cells);
      });
      return {
        id: oldId,
        content: `[表格 ${headers.length}列 × ${rows.length}行]`,
        blockType: 'table',
        metadata: { headers, rows },
      };
    }
    default:
      return null;
  }
}

function extractText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  let text = '';
  if (node.content) node.content.forEach(c => { text += extractText(c); });
  return text;
}

function getBlockMeta(block) {
  if (block.metadata && typeof block.metadata === 'object' && Object.keys(block.metadata).length > 0) {
    return block.metadata;
  }
  const metaFields = ['level','highlights','headers','rows','question',
    'userAnswer','aiFollowUp','userAnswer2','aiFeedback','cards','items'];
  const meta = {};
  metaFields.forEach(f => {
    if (block[f] !== undefined && block[f] !== null) meta[f] = block[f];
  });
  return meta;
}

export function diffBlocks(newBlocks, oldBlocks = []) {
  const ops = [];
  const oldMap = {};
  (oldBlocks || []).forEach(b => { oldMap[b.position] = b; });
  const handled = new Set();
  newBlocks.forEach((nb, idx) => {
    const ob = oldMap[idx];
    if (ob) {
      handled.add(ob.id);
      const oldMeta = getBlockMeta(ob);
      const newMeta = getBlockMeta(nb);
      const changed = ob.content !== nb.content ||
        (ob.blockType || ob.type) !== nb.blockType ||
        JSON.stringify(oldMeta) !== JSON.stringify(newMeta);
      if (changed) ops.push({ action: 'update', block: nb, oldBlock: ob });
    } else {
      ops.push({ action: 'create', block: nb, oldBlock: null });
    }
  });
  (oldBlocks || []).forEach(ob => {
    if (!handled.has(ob.id)) ops.push({ action: 'delete', block: null, oldBlock: ob });
  });
  return ops;
}
