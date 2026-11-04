/**
 * 前端共享枚举常量 — 严格匹配 contracts/enums.md
 * 所有组件和 API wrapper 必须使用这些常量，不得使用临时字符串。
 */

// 用户角色
export const USER_ROLES = { STUDENT: 'student', TEACHER: 'teacher', ADMIN: 'admin' };

// 资源类型
export const RESOURCE_TYPES = { PDF: 'pdf', PPT: 'ppt', MARKDOWN: 'markdown', IMAGE: 'image', AUDIO: 'audio', VIDEO: 'video', WEBPAGE: 'webpage', TEXT: 'text', OTHER: 'other' };

// 资源解析状态
export const RESOURCE_STATUS = { UPLOADED: 'uploaded', PARSING: 'parsing', PARSED: 'parsed', FAILED: 'failed', ARCHIVED: 'archived' };

// AI 任务类型
export const AI_TASK_TYPES = { RESOURCE_PARSE: 'resource_parse', OCR: 'ocr', ASR: 'asr', LLM_SUMMARY: 'llm_summary', MEMORY_CARD_GENERATION: 'memory_card_generation', FEYNMAN_EVALUATION: 'feynman_evaluation', KNOWLEDGE_GRAPH_UPDATE: 'knowledge_graph_update', COMMUNITY_INDEXING: 'community_indexing' };

// AI 任务状态
export const AI_TASK_STATUS = { QUEUED: 'queued', RUNNING: 'running', SUCCEEDED: 'succeeded', FAILED: 'failed', CANCELED: 'canceled' };

// 导入导出任务状态（同 AI 任务状态）
export const IMPORT_EXPORT_STATUS = AI_TASK_STATUS;

// 导出格式
export const EXPORT_FORMATS = { PDF: 'pdf', MARKDOWN: 'markdown', JSON: 'json' };

// 笔记状态
export const NOTE_STATUS = { DRAFT: 'draft', ACTIVE: 'active', ARCHIVED: 'archived' };
export const NOTE_STATUS_LABEL = { draft: '草稿', active: '活跃', archived: '已归档' };

// 笔记块类型（与 contracts/enums.md 和 backend schemas/enums.py 对齐，共 12 种）
export const NOTE_BLOCK_TYPES = {
  PARAGRAPH: 'paragraph', HEADING: 'heading', QUOTE: 'quote', TODO: 'todo', CODE: 'code',
  TABLE: 'table', AI_SUMMARY: 'ai_summary', THINKING: 'thinking', MEMORY_CARDS: 'memory_cards',
  FORMULA: 'formula', ANNOTATION: 'annotation', RELATIONS: 'relations',
};
export const NOTE_BLOCK_LABEL = {
  paragraph: '段落', heading: '标题', quote: '引用', todo: '待办', code: '代码',
  table: '表格', ai_summary: 'AI 生成', thinking: '思考内容', memory_cards: '记忆卡片',
  formula: '公式', annotation: '标注', relations: '双链关系',
};

// 笔记来源类型（对应后端的 note_type）
export const NOTE_TYPES = {
  MANUAL: 'manual',
  QUICK_TIMELINE: 'quick_timeline',
  RESOURCE_IMPORT: 'resource_import',
  THINKING: 'thinking',
  QUICK_TEXT: 'quick_text',
  FEYNMAN: 'feynman',
};
export const NOTE_TYPE_LABEL = {
  manual: '我的笔记',
  quick_timetree: '时间树速记',
  quick_timeline: '课堂速记',
  resource_import: '资源导入',
  thinking: '思考记录',
  quick_text: '我的速记',
  feynman: '费曼',
};
// 用于目录树分组的顺序（空分组不显示）
export const NOTE_TYPE_GROUP_ORDER = [
  { key: 'quick_timeline', label: '课堂速记' },
  { key: 'quick_text', label: '我的速记' },
  { key: 'resource_import', label: '资源导入' },
  { key: 'thinking', label: '思考记录' },
  { key: 'manual', label: '我的笔记' },
];

// 笔记关系类型
export const NOTE_RELATION_TYPES = { BACKLINK: 'backlink', REFERENCE: 'reference', PREREQUISITE: 'prerequisite', RELATED: 'related' };
export const NOTE_RELATION_LABEL = { backlink: '反向链接', reference: '引用关系', prerequisite: '前置依赖', related: '关联' };

// Dashboard 任务优先级
export const TASK_PRIORITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };
export const TASK_PRIORITY_LABEL = { low: '低', medium: '中', high: '高' };

// Dashboard 任务模式
export const TASK_MODE = { QUICK: 'quick', THINKING: 'thinking', MEMORY: 'memory', FEYNMAN: 'feynman' };
export const TASK_MODE_LABEL = { quick: '速记', thinking: '思考', memory: '记忆', feynman: '费曼' };
export const TASK_MODE_PATH = { quick: '/quick-notes', thinking: '/thinking-mode', memory: '/memory-mode', feynman: '/feynman-mode' };

// 学习模式颜色
export const MODE_COLORS = { blue: 'blue', green: 'green', orange: 'orange', purple: 'purple' };

// 记忆卡片类型
export const MEMORY_CARD_TYPES = { CONCEPT: '概念定义', FILL_BLANK: '填空卡片', DISCRIMINATE: '辨析卡片', FLIP_QA: '翻转问答' };

// 记忆卡片难度
export const CARD_DIFFICULTY = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' };
export const CARD_DIFFICULTY_LABEL = { easy: '简单', medium: '中等', hard: '困难' };

// 思考模式 AI 引导强度（匹配 UserPreferences.aiGuidanceLevel）
export const AI_GUIDANCE_LEVEL = { STRICT: 'strict', BALANCED: 'balanced', GENTLE: 'gentle' };
export const AI_GUIDANCE_LABEL = { strict: '严格（多追问）', balanced: '均衡', gentle: '温和（少追问）' };

// 主题
export const THEME = { SYSTEM: 'system', LIGHT: 'light', DARK: 'dark' };
export const THEME_LABEL = { system: '跟随系统', light: '浅色', dark: '深色' };

// 共享资产类型（与 contracts/enums.md 对齐）
export const SHARED_ASSET_TYPES = { NOTE: 'note', KNOWLEDGE_GRAPH: 'knowledge_graph', THINKING_CHAIN: 'thinking_chain', FEYNMAN_SESSION: 'feynman_session', REVIEW_TEMPLATE: 'review_template' };
export const SHARED_ASSET_LABEL = { note: '笔记', knowledge_graph: '知识图谱', thinking_chain: '思考链路', feynman_session: '费曼对话', review_template: '复习模板' };

// 页面标题映射（用于 Topbar）
export const PAGE_TITLES = {
  '/dashboard': '学习中枢',
  '/resource-to-notes': '资源转笔记',
  '/quick-notes': '速记模式',
  '/quick-notes/timeline': '时间流速记',
  '/quick-notes/simple': '普通速记',
  '/quick-notes/time-tree': '时间树速记',
  '/quick-notes/history': '速记模式',
  '/thinking-mode': '思考模式',
  '/memory-mode': '记忆模式',
  '/feynman-mode': '费曼模式',
  '/note-management': '笔记管理',
  '/community': '共享社区',
  '/settings': '系统设置'
};

// 四大学习模式图标路径（侧边栏同款，纯字符串，在 JSX 中使用 <path d={...} />）
export const MODE_ICONS = {
  quick:    'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
  thinking: 'M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
  memory:   'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  feynman:  'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
};

// 四大学习模式静态配置（Dashboard 使用，图标与侧边栏一致）
export const LEARNING_MODES = [
  { key: 'quick', title: '速记模式', description: '支持课堂中的图、文、音多模态输入，自动生成结构化笔记', color: 'blue', path: '/quick-notes' },
  { key: 'thinking', title: '思考模式', description: 'AI 不直接给答案，而是通过苏格拉底式追问引导学生深入理解', color: 'green', path: '/thinking-mode' },
  { key: 'memory', title: '记忆模式', description: '把笔记自动转成记忆卡片，通过间隔重复和思维导图强化长期记忆', color: 'orange', path: '/memory-mode' },
  { key: 'feynman', title: '费曼模式', description: '用户向 AI 讲解所学知识点，系统识别逻辑漏洞并追问', color: 'purple', path: '/feynman-mode' },
];
