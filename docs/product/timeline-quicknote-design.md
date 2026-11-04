# 时间流速记 — AI 实时解析设计文档

## 一、整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 QuickNotes.jsx                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 文本输入  │  │ 录音模块  │  │ 文件上传  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       └──────────────┼──────────────┘                    │
│                      ▼                                   │
│            ┌─────────────────┐                          │
│            │  TimelineStore  │  ← 统管所有条目           │
│            │  (累积上下文)     │                          │
│            └────────┬────────┘                          │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │  防抖控制器   │  ← 3s 无新输入则触发       │
│              └──────┬──────┘                            │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │  AI 解析器   │  ← 拼 prompt → 调后端 →    │
│              │              │     解析结果 → 更新面板     │
│              └──────┬──────┘                            │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │  结构化面板   │  ← 实时渲染 AI 笔记        │
│              └─────────────┘                            │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │  保存/加载   │  ← 持久化到后端              │
│              └─────────────┘                            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    后端 FastAPI                           │
│                                                         │
│  POST /quick-notes/upload      ← 文件解析（PDF/Word/MD）  │
│  POST /quick-notes/transcribe  ← 音频转写（ASR）          │
│  POST /quick-notes/save        ← 保存速记状态              │
│  GET  /quick-notes/{id}        ← 加载速记状态              │
│  POST /quick-notes/ai-parse    ← AI 结构化总结             │
└─────────────────────────────────────────────────────────┘
```

## 二、前端文件结构

```
frontend/src/features/quick-notes/
├── QuickNotes.jsx              ← 主组件（精简，只做组合）
├── hooks/
│   ├── useTimelineStore.js     ← 时间流条目状态管理
│   ├── useAudioRecorder.js     ← 录音控制（开始/暂停/切片）
│   └── useAiParser.js          ← AI 解析 + 防抖逻辑
├── components/
│   ├── TimelineStream.jsx      ← 时间流列表渲染
│   ├── StructuredPanel.jsx     ← AI 结构化笔记面板
│   ├── AudioControls.jsx       ← 录音按钮 + 时长
│   ├── FileUploader.jsx        ← 文件上传组件
│   └── TextInput.jsx           ← 底部文本输入
└── services/
    └── quickNoteApi.js         ← 后端 API 调用封装
```

## 三、后端接口设计

### 3.1 文件上传解析

```
POST /api/v1/quick-notes/upload
Content-Type: multipart/form-data

Input:  file (pdf/docx/md)
Output: { content: "提取的文字内容" }

处理：
  .pdf  → pdfplumber / PyPDF2 提取文字
  .docx → python-docx 提取文字
  .md   → 直接读 UTF-8
```

### 3.2 音频转写

```
POST /api/v1/quick-notes/transcribe
Content-Type: multipart/form-data

Input:  audio (webm/wav)
Output: { transcript: "转写文字" }

处理：
  MVP: mock provider 返回占位文本
  生产: 接入阿里云/讯飞/Whisper adapter
```

### 3.3 保存速记

```
POST /api/v1/quick-notes/save
Content-Type: application/json

Input:  {
  id: "qn_xxx" | null,    ← null 表示新建
  title: "未命名笔记",
  timelineItems: [...],    ← 完整时间流
  structuredNotes: [...]   ← AI 结构化结果
}
Output: { id: "qn_xxx", savedAt: "..." }
```

### 3.4 加载速记

```
GET /api/v1/quick-notes/{id}

Output: {
  id: "qn_xxx",
  title: "...",
  timelineItems: [...],
  structuredNotes: [...],
  createdAt: "...",
  updatedAt: "..."
}
```

### 3.5 AI 结构化总结

```
POST /api/v1/quick-notes/ai-parse
Content-Type: application/json

Input:  { items: [{type, content, timestamp}] }
Output: { notes: [{title, type, content}] }

处理：
  1. 把所有条目拼成 "课堂记录" 上下文
  2. 构造 prompt → 调 DeepSeek
  3. 解析 JSON 返回
```

### 3.6 AI 总结 Prompt

```
你是一个教育AI助手。下面是一堂课的实时记录片段，包含文字笔记、
录音转写和上传文件内容。请整理为结构化笔记。

要求：
1. 提取 2-6 个知识点
2. 每个知识点包含 title（标题）、type（概念定义/关键结论/推导步骤/例题分析/教师强调）、content（100-300字解释）
3. 已有笔记如与新内容相关，在已有基础上补充而非重复创建
4. 只输出 JSON 数组，不要加解释

已有笔记（如有）：
{existing_notes}

课堂记录：
{timeline_context}
```

## 四、核心流程

### 4.1 文本输入

```
用户打字 → Enter
  → 加入 TimelineStore {type:'text', content:'...', timestamp}
  → 防抖计时器重置
  → 3s后无新输入 → AI 解析
```

### 4.2 实时录音（重叠切片，防断联）

```
点击录音 → 开始录制
  → 首段延迟 70s 切第一片（多给 10s 让 ASR 有足够上下文）
  → 此后每 60s 切一片，但每片往前多取 15s（重叠区间）
     Slice 1: 0s ~ 70s
     Slice 2: 55s ~ 130s  (重叠 15s)
     Slice 3: 115s ~ 190s (重叠 15s)
     ...
  → 每片 blob → POST /transcribe → transcript
  → 加入 TimelineStore {type:'recording', transcript, timestamp, duration}
  → 触发防抖 → AI 解析

结束录音 → 最后 0~结束 → 再切一片 → 转写 → 加入时间流
```

**为什么重叠切片？**
- 避免词语在 60s 边界被截断导致 ASR 识别失败
- 重叠部分的两份转写送给 AI 后，AI 自然识别为重复语义并去重
- 不需要后端做额外去重处理，AI 的上下文理解能力足够

### 4.3 上传文件

```
选择文件 → POST /upload → 提取文字 content
  → 加入 TimelineStore {type:'file', content, fileName, timestamp}
  → 触发防抖 → AI 解析
```

### 4.4 AI 解析（防抖 3 秒）

```
任意新条目加入时间流
  → clearTimeout(debounceTimer)
  → debounceTimer = setTimeout(() => {
      1. 收集所有 timelineItems 文字
      2. 拼成上下文文本（带时间戳标注）
      3. 连同已有 structuredNotes 一起发 POST /ai-parse
      4. 解析返回 → 按 title 合并到 structuredNotes（新则新增，旧则更新）
      5. 刷新右侧面板
    }, 3000)
```

### 4.5 保存速记

```
点击保存
  → POST /save {
      id: savedNoteId,
      title: noteName,
      timelineItems,
      structuredNotes
    }
  → 得到 noteId → 更新 savedNoteId
  → 显示 "已保存" + 更新时间戳
  → 主页历史列表刷新后可看到此速记
```

### 4.6 继续编辑（从历史进入）

```
主页点击某条历史速记
  → GET /quick-notes/{id}
  → 恢复 timelineItems + structuredNotes + noteName
  → 用户可以继续添加文字/录音/文件
  → AI 解析继续增量更新结构化笔记
```

## 五、重叠切片示意

```
音频时间轴 (total: 190s)
├──────────┼──────────┼──────────┤
0s        60s        120s       180s

Slice 1: [0s ======== 70s]                   首段 70s
Slice 2:        [55s ======== 130s]          重叠 55~70s (15s)
Slice 3:                  [115s ======== 190s] 重叠 115~130s (15s)

转写结果（发给 AI 的三段文本）：
  Slice 1 transcript: "...导数的定义是函数在某一点的变化率，定义为..."
  Slice 2 transcript: "...函数在某一点的变化率，定义为当自变量的增量趋于零时..."
  Slice 3 transcript: "...趋于零时，函数增量与自变量增量之比的极限..."
                         ↑ 重叠区保证了词语"趋于零时"在两份转写中都完整出现
```

## 六、数据流示意

```
时间线（TimelineStore 内部）：
┌──────┬──────────┬─────────────────────────────────┐
│ 时间  │ 类型     │ 内容                             │
├──────┼──────────┼─────────────────────────────────┤
│08:00 │ system   │ 速记已就绪                        │
│08:02 │ text     │ 导数的定义：f'(x)=lim...           │
│08:05 │ file     │ notes.pdf → "导数章节..."         │
│08:08 │ recording│ 教师讲解 → ASR转写: "导数在..."    │
│08:12 │ text     │ 可导一定连续，连续不一定可导        │
│08:15 │ system   │ 学习结束                          │
└──────┴──────────┴─────────────────────────────────┘

每次 AI 解析时，全部条目拼接为：
"[08:02] 学生笔记：导数的定义...
 [08:05] 上传文件 notes.pdf：导数章节...
 [08:08] 录音转写：导数在几何上表示...
 [08:12] 学生笔记：可导一定连续..."

→ 发给 DeepSeek → 返回结构化笔记：
[
  {title:"导数的定义", type:"概念定义", content:"..."},
  {title:"导数的几何意义", type:"关键结论", content:"..."},
  {title:"可导与连续的关系", type:"辨析卡片", content:"..."}
]
```

## 六、关键决策

| 决策 | 方案 | 理由 |
|---|---|---|
| 速记存储 | 后端 notes 表 + `note_type='timeline'` | 统一存储，历史查询简单 |
| AI 调用 | 防抖 3s 后一次全量上下文 | 避免频繁调 API，保证结果一致性 |
| 实时转写 | 录音 60s 切片 + mock ASR | 边录边出转写文字，不需要等待 |
| 结构化合并 | 按 title 去重 + 更新内容 | 增量解析不产生重复条目 |
| 继续编辑 | 加载完整状态恢复 | 用户可以分多次完成一条速记 |

## 七、开发顺序

```
Step 1  后端 infrastructure:
        - 创建 app/modules/quick_notes/ 模块
        - POST /upload (文件解析)
        - POST /transcribe (ASR)
        - POST /save + GET /{id} (持久化)

Step 2  前端 hooks:
        - useTimelineStore (状态管理)
        - useAudioRecorder (录音切片)
        - useAiParser (防抖 + 调 API)

Step 3  前端组件:
        - TimelineStream (时间流渲染)
        - StructuredPanel (AI 结果展示)
        - AudioControls + FileUploader + TextInput

Step 4  联调 + 保存/加载:
        - 一键保存 → 历史列表可见
        - 从历史进入 → 继续编辑
```
