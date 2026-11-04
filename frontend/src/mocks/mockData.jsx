/**
 * Dashboard 概览数据 — 严格匹配 contracts/openapi.yaml DashboardOverviewResponse
 */
export const mockDashboardOverview = {
  data: {
    weeklyGoal: {
      completedHours: 15,
      targetHours: 20,
      percentage: 75
    },
    todayStudyMinutes: 150,
    streakDays: 7,
    tasks: [
      {
        id: 'task_3f8a2b1c7d4e',
        title: '复习《函数的基本性质》记忆卡',
        courseName: '高等数学',
        priority: 'high',
        durationMinutes: 30,
        mode: 'memory',
        countLabel: '12张'
      },
      {
        id: 'task_7d2e9a5f1b6c',
        title: '完成《导数的应用》相关思考推导',
        courseName: '高等数学',
        priority: 'medium',
        durationMinutes: 45,
        mode: 'thinking',
        countLabel: null
      },
      {
        id: 'task_1b6c8e3d0f2a',
        title: '讲解《牛顿第二定律》费曼练习',
        courseName: '物理',
        priority: 'medium',
        durationMinutes: 20,
        mode: 'feynman',
        countLabel: null
      },
      {
        id: 'task_5a9f4d2e7b1c',
        title: '整理《数据结构》第 3 章速记笔记',
        courseName: '数据结构',
        priority: 'low',
        durationMinutes: 35,
        mode: 'quick',
        countLabel: null
      }
    ],
    mastery: {
      mastered: 65,
      reviewing: 25,
      weak: 10
    }
  }
};

/**
 * 仪表盘统计卡片数据
 */
export const mockStats = [
  {
    title: '今日学习',
    value: '45 分钟',
    percentage: 15,
    color: 'blue',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    title: '待复习',
    value: '12 张',
    percentage: -5,
    color: 'orange',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    title: '已掌握',
    value: '120 个',
    percentage: 10,
    color: 'green',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    title: '学习模式',
    value: '4 种',
    percentage: 0,
    color: 'purple',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  }
];

/**
 * 笔记列表
 */
export const mockNotes = [
  {
    id: 1,
    title: '数学笔记：函数的基本性质',
    content: '函数的基本性质包括单调性、奇偶性、周期性和对称性。单调性是指函数在定义域内的增减性；奇偶性是指函数关于原点或y轴对称的性质；周期性是指函数值重复出现的性质；对称性是指函数图像关于某条直线或点对称的性质。',
    date: '2023-04-21 14:30',
    mode: 'quick'
  },
  {
    id: 2,
    title: '物理笔记：牛顿运动定律',
    content: '牛顿第一定律：物体在没有外力作用下，会保持静止或匀速直线运动状态。牛顿第二定律：物体的加速度与所受的合外力成正比，与质量成反比。牛顿第三定律：作用力与反作用力大小相等，方向相反。',
    date: '2023-04-20 16:45',
    mode: 'think'
  },
  {
    id: 3,
    title: '化学笔记：化学键',
    content: '化学键是原子之间的相互作用力，包括离子键、共价键和金属键。离子键是由电子转移形成的，共价键是由电子共享形成的，金属键是由金属阳离子和自由电子形成的。',
    date: '2023-04-19 10:20',
    mode: 'memory'
  },
  {
    id: 4,
    title: '生物笔记：细胞结构',
    content: '细胞是生物体的基本单位，包括细胞膜、细胞质和细胞核。细胞膜控制物质进出细胞，细胞质是细胞内的液体环境，细胞核包含遗传物质。',
    date: '2023-04-18 09:15',
    mode: 'feynman'
  }
];

/**
 * 任务列表
 */
export const mockTasks = [
  {
    id: 1,
    title: '完成数学作业',
    description: '完成课本第100页的习题1-5',
    status: 'completed',
    dueDate: '2023-04-22',
    priority: 'high'
  },
  {
    id: 2,
    title: '复习物理公式',
    description: '复习牛顿运动定律和能量守恒定律',
    status: 'in_progress',
    dueDate: '2023-04-23',
    priority: 'medium'
  },
  {
    id: 3,
    title: '准备化学实验',
    description: '准备明天实验所需的器材和试剂',
    status: 'in_progress',
    dueDate: '2023-04-24',
    priority: 'low'
  }
];

/**
 * 记忆卡片
 */
export const mockMemoryCards = [
  {
    id: 1,
    question: '函数的基本性质包括什么？',
    answer: '单调性、奇偶性、周期性和对称性'
  },
  {
    id: 2,
    question: '牛顿第二定律的数学表达式是什么？',
    answer: 'F = ma'
  },
  {
    id: 3,
    question: '化学键的类型有哪些？',
    answer: '离子键、共价键和金属键'
  }
];

/**
 * 思考模式对话
 */
export const mockThinkModeConversation = [
  {
    role: 'user',
    content: '如何理解牛顿第二定律？'
  },
  {
    role: 'ai',
    content: '牛顿第二定律描述了力、质量和加速度之间的关系。首先，你能回忆一下牛顿第二定律的数学表达式是什么吗？'
  },
  {
    role: 'user',
    content: 'F = ma，其中 F 是力，m 是质量，a 是加速度。'
  },
  {
    role: 'ai',
    content: '很好！现在，你能解释一下这个公式中各个物理量的单位是什么吗？以及它们之间的关系是如何体现的？'
  }
];

/**
 * 费曼练习反馈
 */
export const mockFeynmanFeedback = {
  evaluation: '你的讲解整体不错，覆盖了函数的四个基本性质。但对于单调性的描述可以更详细一些，比如说明如何判断函数的单调性（通过导数或定义）。',
  question: '你能具体说明如何用导数判断函数的单调性吗？',
  suggestions: [
    '增加具体的例子来说明每个性质',
    '讲解单调性时可以提到导数的应用',
    '可以解释周期性和对称性的关系'
  ]
};

// ========== 速记模式 mock 数据 ==========

export const mockQuickNotesTimelineItems = [
  {
    id: 1,
    type: 'system',
    content: '已检测到录音开始',
    timestamp: '08:00:00',
    duration: null
  },
  {
    id: 2,
    type: 'text',
    content: '导数的定义：当自变量的增量趋于零时，函数增量与自变量增量之比的极限。',
    timestamp: '08:02:30',
    tags: []
  },
  {
    id: 3,
    type: 'recording',
    content: '教师讲解导数的几何意义',
    timestamp: '08:08:45',
    endTimestamp: '08:12:30',
    duration: '3:45',
    transcript: '导数在几何上表示函数图像在该点的切线斜率，它描述了函数在该点的变化率。'
  },
  {
    id: 4,
    type: 'system',
    content: '已提取关键词：导数定义、极限、瞬时变化率',
    timestamp: '08:14:20',
    duration: null
  },
  {
    id: 5,
    type: 'text',
    content: '可导一定连续，但连续不一定可导。例如绝对值函数在0点连续但不可导。',
    timestamp: '08:16:50',
    tags: ['重点']
  }
];

export const mockQuickNotesResources = [
  {
    id: 1,
    name: '高等数学_第三章_导数与微分.pptx',
    type: 'PPT',
    size: '2.5 MB'
  },
  {
    id: 2,
    name: '导数的几何意义.pdf',
    type: 'PDF',
    size: '1.8 MB'
  }
];

export const mockQuickNotesStructuredNotes = [
  {
    id: 1,
    title: '导数的定义',
    type: '概念定义',
    content: '设函数 y=f(x) 在点 x0 的某邻域内有定义，当自变量 x 在 x0 处取得增量 Δx 时，相应地函数取得增量 Δy=f(x0+Δx)-f(x0)。如果 Δy 与 Δx 之比当 Δx→0 时的极限存在，则称函数 y=f(x) 在点 x0 处可导，并称这个极限为函数 y=f(x) 在点 x0 处的导数，记作 f\'(x0)。',
    timestamp: '08:02:30',
    source: '文本输入',
    relatedItems: [2],
    tags: []
  },
  {
    id: 2,
    title: '导数的几何意义',
    type: '关键结论',
    content: '导数在几何上表示函数图像在该点的切线斜率，它描述了函数在该点的变化率。',
    timestamp: '08:08:45',
    source: '录音',
    relatedItems: [3],
    tags: []
  },
  {
    id: 3,
    title: '可导与连续的关系',
    type: '关键结论',
    content: '可导一定连续，但连续不一定可导。例如绝对值函数 y=|x| 在 x=0 处连续但不可导，因为左导数和右导数不相等。',
    timestamp: '08:16:50',
    source: '文本输入',
    relatedItems: [5],
    tags: ['重点']
  }
];

export const mockQuickNotesAnnotations = [
  { id: 1, type: '不理解', count: 2 },
  { id: 2, type: '重点', count: 3 },
  { id: 3, type: '考点', count: 1 },
  { id: 4, type: '我的想法', count: 0 },
  { id: 5, type: '待复习', count: 0 }
];

// ========== 速记模式 — 历史列表 ==========

export const mockQuickNotesHistory = {
  data: [
    {
      id: 'qn_001',
      title: '高等数学 — 导数与微分',
      type: 'timeline',
      courseName: '高等数学（上）',
      itemCount: 12,
      duration: '45分钟',
      updatedAt: '2026-06-03T09:30:00Z',
      updatedAtLabel: '3 小时前',
    },
    {
      id: 'qn_002',
      title: '物理 — 牛顿定律课堂记录',
      type: 'timeline',
      courseName: '大学物理',
      itemCount: 8,
      duration: '30分钟',
      updatedAt: '2026-06-02T14:00:00Z',
      updatedAtLabel: '昨天',
    },
    {
      id: 'qn_003',
      title: '数据结构复习要点',
      type: 'regular',
      courseName: '数据结构',
      itemCount: 5,
      duration: null,
      updatedAt: '2026-06-02T10:00:00Z',
      updatedAtLabel: '昨天',
    },
    {
      id: 'qn_004',
      title: '英语四级高频词整理',
      type: 'regular',
      courseName: '英语',
      itemCount: 20,
      duration: null,
      updatedAt: '2026-06-01T16:00:00Z',
      updatedAtLabel: '2 天前',
    },
    {
      id: 'qn_005',
      title: '线性代数 — 矩阵运算',
      type: 'timeline',
      courseName: '高等数学（下）',
      itemCount: 15,
      duration: '60分钟',
      updatedAt: '2026-05-30T08:00:00Z',
      updatedAtLabel: '4 天前',
    },
    {
      id: 'qn_006',
      title: '操作系统概念速记',
      type: 'regular',
      courseName: '操作系统',
      itemCount: 3,
      duration: null,
      updatedAt: '2026-05-28T11:00:00Z',
      updatedAtLabel: '6 天前',
    },
  ],
};

// ========== 普通速记内容 mock ==========

export const mockRegularNoteContent = {
  data: {
    id: 'qn_003',
    title: '数据结构复习要点',
    type: 'regular',
    content: `# 数据结构复习要点

## 数组与链表

- **数组**：连续内存，随机访问 O(1)，插入删除 O(n)
- **链表**：非连续内存，随机访问 O(n)，插入删除 O(1)

## 栈与队列

- **栈**：后进先出（LIFO），应用：函数调用、括号匹配
- **队列**：先进先出（FIFO），应用：BFS、任务调度

## 树

- 二叉树、平衡二叉树（AVL）、红黑树
- 遍历：前序、中序、后序、层序

## 图

- 表示：邻接矩阵、邻接表
- 遍历：DFS、BFS
- 最短路径：Dijkstra、Floyd

> 重点：复杂度分析 + 代码实现
`,
    updatedAt: '2026-06-02T10:00:00Z',
  },
};

// ========== 资源转笔记 mock 数据 ==========

export const mockResourceToNotesFiles = [
  {
    id: 1,
    name: '高等数学_第三章_导数与微分.pdf',
    type: 'pdf',
    size: '2.5 MB',
    progress: 100
  },
  {
    id: 2,
    name: '物理_牛顿运动定律.mp4',
    type: 'video',
    size: '15.8 MB',
    progress: 100
  },
  {
    id: 3,
    name: '数据结构_第三章_链表.pptx',
    type: 'ppt',
    size: '8.3 MB',
    progress: 100
  }
];

export const mockResourceToNotesAiResult = {
  title: '高等数学_第三章_导数与微分',
  chapters: [
    {
      title: '3.1 导数的定义',
      content: '导数是函数在某一点的变化率，定义为当自变量的增量趋于零时，函数增量与自变量增量之比的极限。'
    },
    {
      title: '3.2 导数的几何意义',
      content: '导数在几何上表示函数图像在该点的切线斜率。'
    },
    {
      title: '3.3 函数的连续性',
      content: '连续函数是指函数在某一点的极限值等于该点的函数值。可导函数一定连续，但连续函数不一定可导。'
    },
    {
      title: '3.4 微分的概念',
      content: '微分是函数增量的线性主部，用于近似计算函数的增量。'
    }
  ],
  coreConcepts: [
    '导数的定义',
    '导数的几何意义',
    '函数的连续性',
    '可导与连续的关系',
    '微分的概念'
  ],
  notes: [
    {
      title: '导数的定义',
      content: '设函数y=f(x)在点x0的某邻域内有定义，当自变量x在x0处取得增量Δx时，相应地函数取得增量Δy=f(x0+Δx)-f(x0)。如果Δy与Δx之比当Δx→0时的极限存在，则称函数y=f(x)在点x0处可导，并称这个极限为函数y=f(x)在点x0处的导数，记作f\'(x0)。'
    },
    {
      title: '可导与连续的关系',
      content: '如果函数y=f(x)在点x0处可导，则函数在该点一定连续。但如果函数在点x0处连续，却不一定在该点可导。例如，函数y=|x|在x=0处连续，但不可导。'
    },
    {
      title: '微分的几何意义',
      content: '微分dy=f\'(x)Δx在几何上表示曲线y=f(x)在点(x,f(x))处的切线纵坐标的增量。'
    }
  ]
};

// ========== 思考模式 mock 数据 ==========

export const mockThinkingModeContent = '在监督学习中，监督学习是通过已标注的数据，利用算法让模型逐步拟合数据。并且，通过机器学习能数据及真实学的模型的数据。\n\n在反向传播中，我们会根据预测值和真实值之间的误差，利用梯度下降来更新模型参数，从而使模型逐步拟合数据。';

export const mockThinkingModeMessages = [
  {
    role: 'ai',
    content: '这里错在...你来尝试修改一下发给我看看',
    type: 'error'
  },
  {
    role: 'user',
    content: '（这里我想写：利用反向传播计算梯度，再利用梯度下降更新参数）'
  },
  {
    role: 'ai',
    content: '完全正确！笔记此处已修正，请确认',
    type: 'success',
    actions: ['保留', '撤销']
  },
  {
    role: 'ai',
    content: '是否需要将本次纠错整理为错题本？',
    type: 'question',
    actions: ['需要', '不需要']
  }
];

// ========== 记忆模式 mock 数据 ==========

export const mockMemoryModeNotes = [
  { id: 1, name: '高等数学笔记', source: '速记模式' },
  { id: 2, name: '数据结构复习', source: '思考模式' },
  { id: 3, name: '物理定律总结', source: '费曼模式' },
  { id: 4, name: '机器学习基础', source: '思考模式' }
];

export const mockMemoryModeNoteContent = '在监督学习中，监督学习是通过已标注的数据，利用算法让模型逐步拟合数据。并且，通过机器学习能数据及真实学的模型的数据。在反向传播中，我们会根据预测值和真实值之间的误差，利用梯度下降来更新模型参数，从而使模型逐步拟合数据。\n\n反向传播算法是神经网络训练的核心算法，它通过计算损失函数对每个参数的梯度，然后利用梯度下降法更新参数。这个过程从输出层开始，逐层向前计算梯度，因此得名反向传播。\n\n梯度下降是一种优化算法，用于最小化损失函数。它通过沿着损失函数的负梯度方向更新参数，从而逐步找到损失函数的最小值。';

export const mockMemoryModeCards = [
  {
    id: 1,
    type: '概念定义',
    content: '反向传播的定义是什么？',
    answer: '反向传播是神经网络训练的核心算法，它通过计算损失函数对每个参数的梯度，然后利用梯度下降法更新参数。',
    sourcePosition: '第2段',
    difficulty: '中等',
    status: '待确认'
  },
  {
    id: 2,
    type: '填空卡片',
    content: '梯度下降是一种________算法，用于最小化损失函数。',
    answer: '优化',
    sourcePosition: '第3段',
    difficulty: '简单',
    status: '已保留'
  },
  {
    id: 3,
    type: '辨析卡片',
    content: '反向传播是从输入层开始计算梯度的，对吗？',
    answer: '不对，反向传播是从输出层开始，逐层向前计算梯度。',
    sourcePosition: '第2段',
    difficulty: '中等',
    status: '需优化'
  }
];

export const mockMemoryModeData = {
  totalCards: 20,
  typeDistribution: {
    '概念定义': 5,
    '填空卡片': 8,
    '辨析卡片': 4,
    '翻转问答': 3
  },
  estimatedTime: '30分钟',
  todayReview: 5,
  nextReview: '2026-04-22 09:00',
  weeklySchedule: [
    { day: '周一', count: 3 },
    { day: '周二', count: 2 },
    { day: '周三', count: 4 },
    { day: '周四', count: 1 },
    { day: '周五', count: 5 },
    { day: '周六', count: 3 },
    { day: '周日', count: 2 }
  ]
};

// ========== 费曼模式 mock 数据 ==========

export const mockFeynmanTopics = [
  {
    id: 1,
    title: '为什么连续不一定可导',
    difficulty: '中等',
    duration: '10分钟',
    lastScore: 75,
    status: '待重讲'
  },
  {
    id: 2,
    title: '牛顿第二定律的适用条件',
    difficulty: '简单',
    duration: '8分钟',
    lastScore: 90,
    status: '已通过'
  },
  {
    id: 3,
    title: '红黑树如何控制树高',
    difficulty: '困难',
    duration: '15分钟',
    lastScore: 60,
    status: '未讲'
  }
];

export const mockFeynmanQuestions = [
  {
    id: 1,
    type: '概念追问',
    content: '我不理解，为什么绝对值函数在 0 点不可导？',
    answered: false
  },
  {
    id: 2,
    type: '因果追问',
    content: '你刚才提到了极限，但没有解释导数定义。',
    answered: false
  },
  {
    id: 3,
    type: '边界条件追问',
    content: '连续函数在所有点都可导吗？',
    answered: false
  }
];

export const mockFeynmanEvaluation = {
  logic: 75,
  accuracy: 80,
  clarity: 70,
  examples: 65,
  response: 60,
  gaps: [
    '未解释左导数和右导数的概念',
    '缺少具体的不可导例子分析',
    '未说明可导的充分必要条件'
  ],
  recommendations: [
    '回到思考模式复习导数定义',
    '查看速记笔记中的相关章节',
    '在记忆模式中加强相关概念的记忆'
  ]
};

// ========== 笔记管理 mock 数据（匹配 openapi.yaml Note / NoteDetail schemas）==========

export const mockNotesList = {
  data: [
    {
      id: 'note_a1b2c3d4e5f6',
      ownerId: 'user_001',
      title: '高等数学 — 导数与微分笔记',
      courseId: 'course_math_001',
      tags: ['高等数学', '导数'],
      status: 'active',
      noteType: 'simple',
      createdAt: '2026-05-08T10:30:00Z',
      updatedAt: '2026-05-10T14:20:00Z'
    },
    {
      id: 'note_f6e5d4c3b2a1',
      ownerId: 'user_001',
      title: '数据结构 — 链表与树',
      courseId: 'course_cs_001',
      tags: ['数据结构', '链表'],
      status: 'active',
      noteType: 'simple',
      createdAt: '2026-05-07T08:00:00Z',
      updatedAt: '2026-05-09T11:00:00Z'
    },
    {
      id: 'note_1a2b3c4d5e6f',
      ownerId: 'user_001',
      title: '物理 — 牛顿运动定律',
      courseId: 'course_phys_001',
      tags: ['物理', '力学'],
      status: 'draft',
      createdAt: '2026-05-06T16:00:00Z',
      updatedAt: '2026-05-06T16:00:00Z'
    },
    {
      id: 'note_7g8h9i0j1k2l',
      ownerId: 'user_001',
      title: '机器学习基础笔记',
      courseId: 'course_ai_001',
      tags: ['AI', '机器学习'],
      status: 'active',
      createdAt: '2026-05-12T14:00:00Z',
      updatedAt: '2026-05-15T09:00:00Z'
    },
    {
      id: 'note_3m4n5o6p7q8r',
      ownerId: 'user_001',
      title: '操作系统 — 进程与线程',
      courseId: 'course_os_001',
      tags: ['操作系统', '核心概念'],
      status: 'active',
      createdAt: '2026-05-08T10:00:00Z',
      updatedAt: '2026-05-14T16:00:00Z'
    },
    {
      id: 'note_9s0t1u2v3w4x',
      ownerId: 'user_001',
      title: '计算机网络 — TCP/IP协议',
      courseId: 'course_net_001',
      tags: ['网络', '协议'],
      status: 'active',
      createdAt: '2026-05-03T08:00:00Z',
      updatedAt: '2026-05-12T11:00:00Z'
    },
    {
      id: 'note_5y6z7a8b9c0d',
      ownerId: 'user_001',
      title: '线性代数 — 矩阵与行列式',
      courseId: 'course_math_002',
      tags: ['数学', '线性代数'],
      status: 'active',
      createdAt: '2026-05-18T09:00:00Z',
      updatedAt: '2026-05-20T14:00:00Z'
    },
    {
      id: 'note_1e2f3g4h5i6j',
      ownerId: 'user_001',
      title: '英语四级 — 高频词汇整理',
      courseId: 'course_eng_001',
      tags: ['英语', '词汇'],
      status: 'draft',
      createdAt: '2026-05-16T07:00:00Z',
      updatedAt: '2026-05-19T10:00:00Z'
    },
    { id: 'f_limit', ownerId: 'user_001', title: '极限', courseId: 'course_math_001', tags: ['高等数学'], status: 'active', createdAt: '2026-05-11T00:00:00Z', updatedAt: '2026-05-11T00:00:00Z' },
    { id: 'f_derivative', ownerId: 'user_001', title: '导数与微分', courseId: 'course_math_001', tags: ['高等数学'], status: 'active', createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-10T00:00:00Z' },
    { id: 'f_integral', ownerId: 'user_001', title: '不定积分', courseId: 'course_math_001', tags: ['高等数学'], status: 'active', createdAt: '2026-05-09T00:00:00Z', updatedAt: '2026-05-09T00:00:00Z' },
    { id: 'f_memory_os', ownerId: 'user_001', title: '内存管理', courseId: 'course_os_001', tags: ['操作系统'], status: 'active', createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-15T00:00:00Z' },
    { id: 'f_deadlock', ownerId: 'user_001', title: '死锁问题', courseId: 'course_os_001', tags: ['操作系统'], status: 'active', createdAt: '2026-05-12T00:00:00Z', updatedAt: '2026-05-12T00:00:00Z' },
    { id: 'f_rbtree', ownerId: 'user_001', title: '红黑树', courseId: 'course_cs_001', tags: ['数据结构'], status: 'active', createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-10T00:00:00Z' },
    { id: 'f_btree', ownerId: 'user_001', title: 'B树与B+树', courseId: 'course_cs_001', tags: ['数据结构'], status: 'active', createdAt: '2026-05-09T00:00:00Z', updatedAt: '2026-05-09T00:00:00Z' },
    { id: 'f_tcp', ownerId: 'user_001', title: 'TCP三次握手', courseId: 'course_net_001', tags: ['计算机网络'], status: 'active', createdAt: '2026-05-11T00:00:00Z', updatedAt: '2026-05-11T00:00:00Z' },
    { id: 'note_process_thread', ownerId: 'user_001', title: '进程与线程', courseId: 'course_os_001', tags: ['操作系统'], status: 'active', createdAt: '2026-05-11T00:00:00Z', updatedAt: '2026-05-11T00:00:00Z' },
  ],
  pagination: { page: 1, pageSize: 20, total: 17 }
};

export const mockNoteDetail = {
  data: {
    id: 'note_a1b2c3d4e5f6',
    ownerId: 'user_001',
    title: '高等数学 — 导数与微分笔记',
    courseId: 'course_math_001',
    tags: ['高等数学', '导数'],
    status: 'active',
    createdAt: '2026-05-08T10:30:00Z',
    updatedAt: '2026-05-10T14:20:00Z',
    blocks: [
      {
        id: 'block_001',
        noteId: 'note_a1b2c3d4e5f6',
        blockType: 'heading',
        content: '导数的定义',
        position: 1
      },
      {
        id: 'block_002',
        noteId: 'note_a1b2c3d4e5f6',
        blockType: 'paragraph',
        content: '导数是函数在某一点的变化率，定义为当自变量的增量趋于零时，函数增量与自变量增量之比的极限。',
        position: 2
      },
      {
        id: 'block_003',
        noteId: 'note_a1b2c3d4e5f6',
        blockType: 'heading',
        content: '可导与连续的关系',
        position: 3
      },
      {
        id: 'block_004',
        noteId: 'note_a1b2c3d4e5f6',
        blockType: 'paragraph',
        content: '可导函数一定连续，但连续函数不一定可导。例如 y=|x| 在 x=0 处连续但不可导。',
        position: 4
      }
    ],
    relations: []
  }
};

// ========== 共享社区 mock 数据（匹配 openapi.yaml SharedAsset schemas）==========

export const mockSharedAssets = {
  data: [
    {
      id: 'asset_001',
      ownerId: 'user_002',
      title: '线性代数知识框架',
      description: '包含行列式、矩阵、特征值等核心概念的完整知识结构',
      assetType: 'knowledge_graph',
      authorName: '张同学',
      collectionCount: 24,
      createdAt: '2026-05-05T09:00:00Z',
      tags: ['线性代数', '知识框架']
    },
    {
      id: 'asset_002',
      ownerId: 'user_003',
      title: '导数定义思维链',
      description: '从导数定义出发的苏格拉底式对话记录',
      assetType: 'thinking_chain',
      authorName: '李同学',
      collectionCount: 18,
      createdAt: '2026-05-06T14:00:00Z',
      tags: ['导数', '思维训练']
    },
    {
      id: 'asset_003',
      ownerId: 'user_004',
      title: '数据结构复习模板',
      description: '涵盖数组、链表、栈、队列、树、图的复习卡片模板',
      assetType: 'review_template',
      authorName: '王同学',
      collectionCount: 35,
      createdAt: '2026-05-07T11:00:00Z',
      tags: ['数据结构', '复习模板']
    }
  ],
  pagination: { page: 1, pageSize: 20, total: 3 }
};

// ========== 课程管理 mock 数据（匹配 openapi.yaml Course / CourseListResponse schemas）==========

export const mockCoursesList = {
  data: [
    {
      id: 'course_math_001',
      name: '高等数学（上）',
      subject: '数学',
      description: '包含函数、极限、导数、积分等基础内容',
      ownerId: 'user_001',
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-05-01T00:00:00Z'
    },
    {
      id: 'course_cs_001',
      name: '数据结构',
      subject: '计算机科学',
      description: '学习常见数据结构及其算法实现',
      ownerId: 'user_001',
      createdAt: '2026-04-15T00:00:00Z',
      updatedAt: '2026-05-05T00:00:00Z'
    },
    {
      id: 'course_phys_001',
      name: '大学物理',
      subject: '物理',
      description: '力学、热学、电磁学基础',
      ownerId: 'user_001',
      createdAt: '2026-03-20T00:00:00Z',
      updatedAt: '2026-04-25T00:00:00Z'
    }
  ],
  pagination: { page: 1, pageSize: 20, total: 3 }
};

// ========== 用户设置 mock 数据（匹配 openapi.yaml User / UserPreferences schemas）==========

export const mockCurrentUser = {
  data: {
    id: 'user_001',
    username: '学生用户',
    email: 'student@example.com',
    role: 'student'
  }
};

export const mockUserPreferences = {
  data: {
    theme: 'system',
    language: 'zh-CN',
    dailyReviewReminder: true,
    reminderTime: '20:00',
    aiGuidanceLevel: 'balanced'
  }
};

// ========== 思考模式 API mock 降级数据 ==========

export const mockThinkingSessionResponse = {
  data: {
    id: 'think_sess_001',
    noteId: 'note_a1b2c3d4e5f6',
    status: 'active',
    messages: [],
    createdAt: '2026-05-11T10:00:00Z'
  }
};

// ========== 记忆库 mock 数据 ==========

export const mockMemoryLibrary = {
  data: [
    {
      noteId: 'note_a1b2c3d4e5f6',
      noteTitle: '高等数学 — 导数与微分笔记',
      courseName: '高等数学（上）',
      status: 'active',
      totalCards: 12,
      reviewedCards: 4,
      dueCards: 8,
      nextReviewAt: '2026-06-03T08:00:00Z',
      daysUntilNext: 0,
      cycle: 'standard',
      lastReviewAt: '2026-06-01T14:00:00Z',
      createdAt: '2026-05-15T09:00:00Z',
    },
    {
      noteId: 'note_f6e5d4c3b2a1',
      noteTitle: '数据结构 — 链表与树',
      courseName: '数据结构',
      status: 'completed',
      totalCards: 8,
      reviewedCards: 8,
      dueCards: 0,
      nextReviewAt: '2026-06-15T10:00:00Z',
      daysUntilNext: 12,
      cycle: 'longterm',
      lastReviewAt: '2026-06-02T10:00:00Z',
      createdAt: '2026-05-10T08:00:00Z',
    },
    {
      noteId: 'note_1a2b3c4d5e6f',
      noteTitle: '物理 — 牛顿运动定律',
      courseName: '大学物理',
      status: 'none',
      totalCards: 0,
      reviewedCards: 0,
      dueCards: 0,
      nextReviewAt: null,
      daysUntilNext: null,
      cycle: null,
      lastReviewAt: null,
      createdAt: '2026-05-20T16:00:00Z',
    },
    {
      noteId: 'note_7g8h9i0j1k2l',
      noteTitle: '机器学习基础笔记',
      courseName: 'AI 导论',
      status: 'active',
      totalCards: 20,
      reviewedCards: 15,
      dueCards: 5,
      nextReviewAt: '2026-06-04T09:00:00Z',
      daysUntilNext: 1,
      cycle: 'cram',
      lastReviewAt: '2026-06-03T09:00:00Z',
      createdAt: '2026-05-12T14:00:00Z',
    },
  ],
};

// ========== 记忆卡片生成 mock 响应 ==========

export const mockGeneratedCardsResponse = {
  data: {
    noteId: 'note_a1b2c3d4e5f6',
    cards: [
      { id: 'card_gen_001', type: '概念定义', front: '导数的定义是什么？', back: '导数是函数在某一点的变化率，定义为当自变量的增量趋于零时，函数增量与自变量增量之比的极限。', difficulty: '中等', status: '待确认' },
      { id: 'card_gen_002', type: '填空卡片', front: '导数在几何上表示函数图像在该点的________。', back: '切线斜率', difficulty: '简单', status: '待确认' },
      { id: 'card_gen_003', type: '辨析卡片', front: '连续一定可导，但可导不一定连续，对吗？', back: '不对。可导一定连续，但连续不一定可导。例如 y=|x| 在 x=0 处连续但不可导。', difficulty: '中等', status: '待确认' },
      { id: 'card_gen_004', type: '翻转问答', front: '什么是微分的概念？', back: '微分 dy=f\'(x)dx 表示函数增量的线性主部，用于近似计算函数的增量。', difficulty: '困难', status: '待确认' },
    ],
  },
};

// ========== 记忆模式 API mock 降级数据 ==========

export const mockMemoryCardsResponse = {
  data: [
    {
      id: 'card_001',
      noteId: 'note_a1b2c3d4e5f6',
      question: '导数的定义是什么？',
      answer: '导数是函数在某一点的变化率，定义为当自变量的增量趋于零时，函数增量与自变量增量之比的极限。',
      cardType: '概念定义',
      difficulty: 'medium',
      status: 'active',
      nextReviewAt: '2026-05-12T10:00:00Z'
    },
    {
      id: 'card_002',
      noteId: 'note_a1b2c3d4e5f6',
      question: '梯度下降是一种________算法，用于最小化损失函数。',
      answer: '优化',
      cardType: '填空卡片',
      difficulty: 'easy',
      status: 'active',
      nextReviewAt: '2026-05-13T10:00:00Z'
    },
    {
      id: 'card_003',
      noteId: 'note_f6e5d4c3b2a1',
      question: '反向传播是从输入层开始计算梯度的，对吗？',
      answer: '不对，反向传播是从输出层开始，逐层向前计算梯度。',
      cardType: '辨析卡片',
      difficulty: 'medium',
      status: 'active',
      nextReviewAt: '2026-05-12T14:00:00Z'
    }
  ],
  pagination: { page: 1, pageSize: 20, total: 3 }
};

// ========== 费曼模式 API mock 降级数据 ==========

export const mockFeynmanSessionResponse = {
  data: {
    id: 'feyn_sess_001',
    noteId: 'note_a1b2c3d4e5f6',
    topic: '导数的定义与几何意义',
    status: 'active',
    questions: [],
    createdAt: '2026-05-11T11:00:00Z'
  }
};

// ========== 笔记管理 — 文件系统式知识库 ==========

// 知识目录树
export const mockKnowledgeTree = {
  id: 'root',
  name: '我的课程',
  children: [
    {
      id: 'course_os', name: '操作系统', icon: 'os',
      children: [
        { id: 'note_process_thread', name: '进程与线程.md', type: 'note', tags: ['核心概念'], mastery: 85, updatedAt: '2026-05-11' },
        { id: 'note_memory_mgmt', name: '内存管理.md', type: 'note', tags: ['重点'], mastery: 72, updatedAt: '2026-05-10' },
        { id: 'note_file_system', name: '文件系统.md', type: 'note', tags: [], mastery: 60, updatedAt: '2026-05-08' },
        { id: 'note_deadlock', name: '死锁问题.md', type: 'note', tags: ['难点'], mastery: 45, updatedAt: '2026-05-05' },
        { id: 'f_memory_os', name: '内存管理.md', type: 'note', tags: ['核心概念'], mastery: 65, updatedAt: '2026-05-15' },
        { id: 'f_deadlock', name: '死锁问题.md', type: 'note', tags: ['难点'], mastery: 40, updatedAt: '2026-05-12' },
        { id: 'note_3m4n5o6p7q8r', name: '操作系统 — 进程与线程.md', type: 'note', tags: ['核心概念'], mastery: 80, updatedAt: '2026-05-14' },
        { id: 'folder_os_thinking', name: '思考链', icon: 'thinking', children: [
          { id: 'think_process_sync', name: '进程同步推导.md', type: 'note', tags: ['思考'], mastery: 78, updatedAt: '2026-05-09' },
        ]},
        { id: 'folder_os_memory', name: '记忆卡片', icon: 'memory', children: [
          { id: 'card_os_001', name: '进程与线程对比', type: 'card', tags: ['记忆'], mastery: 90, updatedAt: '2026-05-11' },
        ]},
      ]
    },
    {
      id: 'course_ds', name: '数据结构', icon: 'ds',
      children: [
        { id: 'note_rb_tree', name: '红黑树.md', type: 'note', tags: ['难点'], mastery: 55, updatedAt: '2026-05-07' },
        { id: 'note_btree', name: 'B树与B+树.md', type: 'note', tags: [], mastery: 68, updatedAt: '2026-05-06' },
        { id: 'note_graph', name: '图论基础.md', type: 'note', tags: [], mastery: 80, updatedAt: '2026-05-04' },
        { id: 'f_rbtree', name: '红黑树.md', type: 'note', tags: ['难点'], mastery: 50, updatedAt: '2026-05-10' },
        { id: 'f_btree', name: 'B树与B+树.md', type: 'note', tags: [], mastery: 60, updatedAt: '2026-05-09' },
        { id: 'note_f6e5d4c3b2a1', name: '数据结构 — 链表与树.md', type: 'note', tags: ['数据结构', '链表'], mastery: 75, updatedAt: '2026-05-13' },
      ]
    },
    {
      id: 'course_net', name: '计算机网络', icon: 'net',
      children: [
        { id: 'note_tcp', name: 'TCP三次握手.md', type: 'note', tags: ['面试重点'], mastery: 92, updatedAt: '2026-05-09' },
        { id: 'note_ip', name: 'IP协议详解.md', type: 'note', tags: [], mastery: 75, updatedAt: '2026-05-03' },
        { id: 'f_tcp', name: 'TCP三次握手.md', type: 'note', tags: ['面试重点'], mastery: 85, updatedAt: '2026-05-11' },
        { id: 'note_9s0t1u2v3w4x', name: '计算机网络 — TCP/IP协议.md', type: 'note', tags: ['网络', '协议'], mastery: 70, updatedAt: '2026-05-12' },
      ]
    },
    {
      id: 'course_ai', name: 'AI 导论', icon: 'ai',
      children: [
        { id: 'note_ml_basics', name: '机器学习基础.md', type: 'note', tags: ['入门'], mastery: 88, updatedAt: '2026-05-11' },
        { id: 'note_7g8h9i0j1k2l', name: '机器学习基础笔记.md', type: 'note', tags: ['AI', '机器学习'], mastery: 70, updatedAt: '2026-05-15' },
      ]
    },
    {
      id: 'course_math', name: '高等数学', icon: 'ds',
      children: [
        { id: 'note_a1b2c3d4e5f6', name: '高等数学 — 导数与微分笔记.md', type: 'note', tags: ['高等数学', '导数'], mastery: 80, updatedAt: '2026-05-10' },
        { id: 'f_limit', name: '极限.md', type: 'note', tags: ['核心概念', '基础'], mastery: 88, updatedAt: '2026-05-11' },
        { id: 'f_derivative', name: '导数与微分.md', type: 'note', tags: ['核心概念'], mastery: 75, updatedAt: '2026-05-10' },
        { id: 'f_integral', name: '不定积分.md', type: 'note', tags: ['核心概念'], mastery: 62, updatedAt: '2026-05-09' },
        { id: 'note_5y6z7a8b9c0d', name: '线性代数 — 矩阵与行列式.md', type: 'note', tags: ['数学', '线性代数'], mastery: 68, updatedAt: '2026-05-20' },
      ]
    },
    {
      id: 'course_phys', name: '大学物理', icon: 'net',
      children: [
        { id: 'note_1a2b3c4d5e6f', name: '物理 — 牛顿运动定律.md', type: 'note', tags: ['物理', '力学'], mastery: 55, updatedAt: '2026-05-06' },
      ]
    },
    {
      id: 'course_eng', name: '英语', icon: 'os',
      children: [
        { id: 'note_1e2f3g4h5i6j', name: '英语四级 — 高频词汇整理.md', type: 'note', tags: ['英语', '词汇'], mastery: 50, updatedAt: '2026-05-19' },
      ]
    },
    {
      id: 'course_uncategorized', name: '未分类', icon: 'ds',
      children: [
        { id: 'f_limit', name: '极限.md', type: 'note', tags: ['核心概念'], mastery: 70, updatedAt: '2026-05-11' },
        { id: 'f_derivative', name: '导数与微分.md', type: 'note', tags: ['核心概念'], mastery: 65, updatedAt: '2026-05-10' },
        { id: 'f_integral', name: '不定积分.md', type: 'note', tags: ['核心概念'], mastery: 55, updatedAt: '2026-05-09' },
        { id: 'f_memory_os', name: '内存管理.md', type: 'note', tags: ['操作系统'], mastery: 50, updatedAt: '2026-05-15' },
        { id: 'f_deadlock', name: '死锁问题.md', type: 'note', tags: ['操作系统'], mastery: 40, updatedAt: '2026-05-12' },
        { id: 'f_rbtree', name: '红黑树.md', type: 'note', tags: ['数据结构'], mastery: 45, updatedAt: '2026-05-10' },
        { id: 'f_btree', name: 'B树与B+树.md', type: 'note', tags: ['数据结构'], mastery: 50, updatedAt: '2026-05-09' },
        { id: 'f_tcp', name: 'TCP三次握手.md', type: 'note', tags: ['计算机网络'], mastery: 70, updatedAt: '2026-05-11' },
        { id: 'note_process_thread', name: '进程与线程.md', type: 'note', tags: ['核心概念'], mastery: 80, updatedAt: '2026-05-11' },
      ]
    },
  ]
};

// 《进程与线程.md》完整 AI 解析笔记
export const mockNoteProcessThread = {
  id: 'note_process_thread',
  title: '进程与线程',
  course: '操作系统',
  tags: ['核心概念', '面试重点'],
  mastery: 85,
  updatedAt: '2026-05-11 14:30',
  aiStatus: 'parsed',
  blocks: [
    { id: 'b1', type: 'heading', level: 1, content: '进程与线程' },
    { id: 'b2', type: 'heading', level: 2, content: '一、进程（Process）' },
    { id: 'b3', type: 'heading', level: 3, content: '定义' },
    { id: 'b4', type: 'paragraph', content: '进程是操作系统进行资源分配和调度的基本单位。每个进程拥有独立的地址空间、PCB（进程控制块）、打开的文件描述符和 CPU 运行状态。', highlights: ['资源分配', '调度', 'PCB'] },
    { id: 'b5', type: 'heading', level: 3, content: '进程的五状态模型' },
    { id: 'b6', type: 'paragraph', content: '进程在其生命周期中会在以下五种状态之间切换：创建（New）→ 就绪（Ready）→ 运行（Running）→ 阻塞（Blocked）→ 终止（Terminated）。状态切换由操作系统调度器根据 I/O 请求、时间片耗尽、优先级抢占等事件触发。' },
    { id: 'b7', type: 'heading', level: 2, content: '二、线程（Thread）' },
    { id: 'b8', type: 'heading', level: 3, content: '定义' },
    { id: 'b9', type: 'paragraph', content: '线程是 CPU 调度的最小单位。同一进程中的线程共享内存空间、文件资源和代码段，但拥有独立的栈空间和寄存器状态。这种共享机制使线程间通信成本远低于进程间通信（IPC）。', highlights: ['CPU调度', '共享内存', '独立栈'] },
    { id: 'b10', type: 'heading', level: 2, content: '三、进程与线程的核心区别' },
    { id: 'b11', type: 'table', headers: ['对比维度', '进程', '线程'], rows: [
      ['资源拥有', '独立地址空间和资源', '共享进程资源'],
      ['切换开销', '大（需切换虚拟内存空间）', '小（仅切换寄存器和栈）'],
      ['通信方式', 'IPC（管道/消息队列/共享内存）', '直接读写共享内存'],
      ['创建销毁', '慢，需分配PCB和地址空间', '快，只需分配栈和TCB'],
      ['独立性', '进程间相互隔离', '同一进程内线程互相影响'],
    ]},
    { id: 'b12', type: 'heading', level: 2, content: '四、经典问题：为什么线程切换更快？' },
    { id: 'b13', type: 'ai_summary', content: '线程切换无需切换整个虚拟内存空间。进程切换时，CPU 需要保存当前进程的完整上下文（页表、地址空间、打开文件等），加载新进程的上下文。而同一进程内的线程共享地址空间，切换时只需保存和恢复寄存器状态与栈指针，因此上下文切换成本远低于进程切换。这也是为什么高并发服务（如 Nginx、Node.js）倾向使用多线程/协程模型。' },
    { id: 'b14', type: 'heading', level: 2, content: '五、思考链 — AI 引导推导' },
    { id: 'b15', type: 'thinking', question: '为什么多线程程序更容易产生并发问题？', userAnswer: '因为多个线程共享同一块内存区域，当多个线程同时读写同一个变量时，如果没有同步机制，就会产生数据竞争。', aiFollowUp: '共享资源具体会导致哪两类典型问题？你能分别举例吗？', userAnswer2: '竞态条件（Race Condition）：两个线程同时修改一个计数器，最终结果取决于执行顺序。死锁（Deadlock）：线程A持有锁1等锁2，线程B持有锁2等锁1，互相等待。', aiFeedback: '正确。补充一点：除了竞态和死锁，还有活锁（Livelock）和饥饿（Starvation）。建议在后续复习中对比这四种并发问题的区别。' },
    { id: 'b16', type: 'heading', level: 2, content: '六、AI 自动生成记忆卡片' },
    { id: 'b17', type: 'memory_cards', cards: [
      { q: '进程和线程的核心区别是什么？', a: '进程是资源分配的基本单位，拥有独立地址空间；线程是CPU调度的基本单位，共享进程资源。' },
      { q: '为什么线程切换比进程切换更快？', a: '线程共享进程的虚拟内存空间，切换时无需更换页表和完整上下文，只需切换寄存器和栈。' },
      { q: '进程的五种状态分别是？', a: '创建（New）、就绪（Ready）、运行（Running）、阻塞（Blocked）、终止（Terminated）。' },
      { q: '多线程共享哪些资源？独立拥有哪些资源？', a: '共享：代码段、堆内存、文件描述符、全局变量。独立：栈空间、程序计数器、寄存器状态。' },
    ]},
    { id: 'b18', type: 'heading', level: 2, content: '七、相关概念' },
    { id: 'b19', type: 'relations', items: [
      { label: '前置依赖', target: '内存管理.md', reason: '理解进程地址空间需要内存管理基础知识' },
      { label: '后续延伸', target: '死锁问题.md', reason: '多线程并发是死锁问题的前置场景' },
      { label: '横向对比', target: 'TCP三次握手.md', reason: '对比操作系统和网络协议中的"状态机"概念' },
    ]},
  ]
};

// 推荐复习项
// ========== 《高等数学-极限》AI 解析笔记 ==========
export const mockNoteLimit = {
  id: 'f_limit',
  title: '极限',
  course: '高等数学',
  tags: ['核心概念', '基础'],
  mastery: 88,
  updatedAt: '2026-05-11 16:20',
  aiStatus: 'parsed',
  blocks: [
    { id:'l1', type:'heading', level:1, content:'极限' },
    { id:'l2', type:'heading', level:2, content:'一、极限的直观理解' },
    { id:'l3', type:'paragraph', content:'极限描述的是函数值无限接近某个确定值的过程。不是"等于"，而是"趋近于"。比如当 x 趋近于 0 时，sin(x)/x 的值趋近于 1。', highlights:['无限接近','趋近于','不是等于'] },
    { id:'l4', type:'heading', level:2, content:'二、ε-δ 严格定义' },
    { id:'l5', type:'paragraph', content:'对于任意给定的 ε > 0，存在 δ > 0，使得当 0 < |x - x₀| < δ 时，有 |f(x) - L| < ε。这个定义的精妙之处在于：无论你要求多么接近，我都能找到一个足够小的区间，使函数值落在你的要求范围内。', highlights:['ε-δ定义','任意给定','存在'] },
    { id:'l6', type:'heading', level:2, content:'三、左极限与右极限' },
    { id:'l7', type:'paragraph', content:'左极限：x 从左侧趋近 x₀ 时 f(x) 的极限。右极限：x 从右侧趋近 x₀ 时 f(x) 的极限。函数在 x₀ 处极限存在的充要条件是：左右极限都存在且相等。', highlights:['左极限','右极限','充要条件'] },
    { id:'l8', type:'ai_summary', content:'极限的本质是函数值无限接近某个确定值。理解极限的关键在于接受"趋近但不等于"的思想。这是整个微积分的基石——导数定义为差商的极限，积分定义为黎曼和的极限。极限不仅是一个计算工具，更是一种"无限逼近"的思维方式。' },
    { id:'l9', type:'heading', level:2, content:'四、核心公式' },
    { id:'l10', type:'formula', content:'lim(x→0) sin(x)/x = 1' },
    { id:'l11', type:'formula', content:'lim(x→∞) (1 + 1/x)^x = e' },
    { id:'l12', type:'heading', level:2, content:'五、学生标注' },
    { id:'l13', type:'annotation', content:'这里容易和连续混淆。极限存在不意味着函数连续——还需要极限值等于函数值。' },
    { id:'l14', type:'heading', level:2, content:'六、AI 思考链' },
    { id:'l15', type:'thinking', question:'为什么函数在一点的极限存在，但函数在该点不一定连续？', userAnswer:'因为连续需要满足三个条件：函数在该点有定义、极限存在、极限值等于函数值。极限存在只是其中一条。比如可去间断点，极限存在但函数值不等于极限值。', aiFollowUp:'很好。那你能举出一个极限存在但函数在这一点没有定义的例子吗？', userAnswer2:'比如 f(x) = sin(x)/x 在 x=0 处没有定义，但 lim(x→0) sin(x)/x = 1。', aiFeedback:'完全正确！这个例子非常好。注意这里极限存在但函数未定义，当然不连续。补充一点：还有跳跃间断点的情况，左右极限都存在但不相等。' },
    { id:'l16', type:'heading', level:2, content:'七、关联知识' },
    { id:'l17', type:'relations', items:[
      { label:'后续延伸', target:'连续.md', reason:'连续的定义直接依赖极限' },
      { label:'后续延伸', target:'导数与微分.md', reason:'导数定义为差商的极限' },
      { label:'后续延伸', target:'洛必达法则.md', reason:'洛必达法则用于计算未定式极限' },
    ]},
    { id:'l18', type:'heading', level:2, content:'八、记忆卡片' },
    { id:'l19', type:'memory_cards', cards:[
      { q:'极限的ε-δ定义的核心思想是什么？', a:'对于任意给定的精度要求(ε)，总存在一个足够小的邻域(δ)，使函数值落在精度范围内。' },
      { q:'极限存在和函数连续是什么关系？', a:'极限存在是连续的必要不充分条件。连续还需要极限值等于函数值。' },
      { q:'lim(x→0) sin(x)/x 等于多少？', a:'等于 1。这是最重要的极限公式之一。' },
    ]},
  ]
};

// 更新 NoteWorkspace 使用极限笔记（如果打开的是 f_limit 文件）
// 各笔记通用模板
const makeNote = (id, title, course, blocks) => ({ id, title, course, tags: [], mastery: 0, updatedAt: '2026-05-11', aiStatus: 'parsed', blocks });

export const mockNoteDerivative = makeNote('f_derivative', '导数与微分', '高等数学', [
  { id:'d1', type:'heading', level:1, content:'导数与微分' },
  { id:'d2', type:'heading', level:2, content:'一、导数的定义' },
  { id:'d3', type:'paragraph', content:'导数描述函数在某一点的变化率。设函数 y=f(x) 在点 x₀ 处可导，则导数定义为：f\'(x₀)=lim(Δx→0)[f(x₀+Δx)-f(x₀)]/Δx。导数的几何意义是曲线在该点切线的斜率。', highlights:['变化率','切线斜率'] },
  { id:'d4', type:'heading', level:2, content:'二、基本求导公式' },
  { id:'d5', type:'paragraph', content:'(C)\'=0, (xⁿ)\'=nxⁿ⁻¹, (sinx)\'=cosx, (cosx)\'=-sinx, (eˣ)\'=eˣ, (lnx)\'=1/x。熟记这些基本公式是后续学习的基础。' },
  { id:'d6', type:'heading', level:2, content:'三、微分的概念' },
  { id:'d7', type:'paragraph', content:'微分 dy=f\'(x)dx 表示函数增量的线性主部。微分与导数的关系：dy=f\'(x)dx，即微分等于导数乘以自变量的微分。' },
  { id:'d8', type:'ai_summary', content:'导数是微积分的核心概念，描述了函数的局部变化率。掌握基本求导公式和求导法则（和差积商、链式法则）是后续学习积分、微分方程的基础。' },
]);

export const mockNoteIntegral = makeNote('f_integral', '不定积分', '高等数学', [
  { id:'i1', type:'heading', level:1, content:'不定积分' },
  { id:'i2', type:'heading', level:2, content:'一、原函数与不定积分' },
  { id:'i3', type:'paragraph', content:'如果 F\'(x)=f(x)，则称 F(x) 是 f(x) 的一个原函数。f(x) 的所有原函数称为 f(x) 的不定积分，记作 ∫f(x)dx = F(x) + C，其中 C 为任意常数。' },
  { id:'i4', type:'heading', level:2, content:'二、基本积分公式' },
  { id:'i5', type:'paragraph', content:'∫xⁿdx = xⁿ⁺¹/(n+1) + C (n≠-1), ∫(1/x)dx = ln|x| + C, ∫eˣdx = eˣ + C, ∫sinx dx = -cosx + C, ∫cosx dx = sinx + C。' },
  { id:'i6', type:'heading', level:2, content:'三、换元积分法' },
  { id:'i7', type:'paragraph', content:'第一换元法（凑微分）：将被积函数凑成 f[φ(x)]φ\'(x) 的形式。第二换元法：令 x=ψ(t)，将积分转化为对新变量 t 的积分。' },
  { id:'i8', type:'ai_summary', content:'不定积分是求导的逆运算。核心技巧是换元法和分部积分法。记住基本积分公式，灵活运用凑微分技巧是解题关键。' },
]);

export const mockNoteProcess = makeNote('f_process', '进程与线程', '操作系统', [
  { id:'p1', type:'heading', level:1, content:'进程与线程' },
  { id:'p2', type:'heading', level:2, content:'一、进程的定义' },
  { id:'p3', type:'paragraph', content:'进程是操作系统进行资源分配和调度的基本单位。每个进程拥有独立的地址空间、PCB（进程控制块）、打开的文件描述符和CPU运行状态。', highlights:['资源分配','调度','PCB'] },
  { id:'p4', type:'heading', level:2, content:'二、线程的定义' },
  { id:'p5', type:'paragraph', content:'线程是CPU调度的最小单位。同一进程中的线程共享内存空间、文件资源和代码段，但拥有独立的栈空间和寄存器状态。', highlights:['CPU调度','共享内存','独立栈'] },
  { id:'p6', type:'heading', level:2, content:'三、核心区别' },
  { id:'p7', type:'table', headers:['对比维度','进程','线程'], rows:[['资源拥有','独立地址空间','共享进程资源'],['切换开销','大','小'],['通信方式','IPC','共享内存'],['创建销毁','慢','快']] },
  { id:'p8', type:'ai_summary', content:'进程是资源分配单位，线程是CPU调度单位。线程切换更快因为共享地址空间无需切换页表。多线程编程需要注意同步问题。' },
]);

export const mockNoteMemory = makeNote('f_memory_os', '内存管理', '操作系统', [
  { id:'m1', type:'heading', level:1, content:'内存管理' },
  { id:'m2', type:'heading', level:2, content:'一、虚拟内存' },
  { id:'m3', type:'paragraph', content:'虚拟内存使得每个进程拥有独立的虚拟地址空间，通过页表将虚拟地址映射到物理地址。这使得进程可以使用的内存超过实际物理内存大小。' },
  { id:'m4', type:'heading', level:2, content:'二、分页与分段' },
  { id:'m5', type:'paragraph', content:'分页将内存划分为固定大小的页框，分段则按逻辑单元划分。现代操作系统多采用段页式结合的方式。' },
  { id:'m6', type:'heading', level:2, content:'三、页面置换算法' },
  { id:'m7', type:'paragraph', content:'FIFO（先进先出）、LRU（最近最久未使用）、Clock算法。LRU效果最好但实现复杂，Clock是实际系统中最常用的近似LRU算法。' },
]);

export const mockNoteDeadlock = makeNote('f_deadlock', '死锁问题', '操作系统', [
  { id:'dl1', type:'heading', level:1, content:'死锁问题' },
  { id:'dl2', type:'heading', level:2, content:'一、死锁的定义' },
  { id:'dl3', type:'paragraph', content:'死锁是指两个或多个进程互相等待对方释放资源，导致所有进程都无法继续执行的状态。' },
  { id:'dl4', type:'heading', level:2, content:'二、死锁的四个必要条件' },
  { id:'dl5', type:'paragraph', content:'互斥条件、请求与保持条件、不可剥夺条件、循环等待条件。四个条件必须同时满足才会发生死锁。' },
  { id:'dl6', type:'heading', level:2, content:'三、银行家算法' },
  { id:'dl7', type:'paragraph', content:'银行家算法通过预先判断资源分配后系统是否仍处于安全状态来避免死锁。需要知道每个进程的最大资源需求。' },
]);

export const mockNoteRBTree = makeNote('f_rbtree', '红黑树', '数据结构', [
  { id:'r1', type:'heading', level:1, content:'红黑树' },
  { id:'r2', type:'heading', level:2, content:'一、红黑树的五个性质' },
  { id:'r3', type:'paragraph', content:'1.节点是红色或黑色 2.根节点是黑色 3.叶子节点(NIL)是黑色 4.红色节点的子节点必须是黑色 5.从任一节点到其每个叶子的路径包含相同数量的黑色节点。' },
  { id:'r4', type:'heading', level:2, content:'二、时间复杂度' },
  { id:'r5', type:'paragraph', content:'查找、插入、删除均为O(log n)。红黑树通过旋转和变色维持平衡，确保树高不超过2log(n+1)。' },
  { id:'r6', type:'heading', level:2, content:'三、与AVL树的比较' },
  { id:'r7', type:'paragraph', content:'AVL树更严格平衡（高度差≤1），查找更快但插入删除开销更大。红黑树在写多读少的场景中更优。' },
]);

export const mockNoteBTree = makeNote('f_btree', 'B树与B+树', '数据结构', [
  { id:'bt1', type:'heading', level:1, content:'B树与B+树' },
  { id:'bt2', type:'heading', level:2, content:'一、B树的定义' },
  { id:'bt3', type:'paragraph', content:'B树是一种多路平衡搜索树，每个节点可以有多个关键字和子节点。m阶B树满足：每个节点最多m个子节点，除根外至少有⌈m/2⌉个子节点。' },
  { id:'bt4', type:'heading', level:2, content:'二、B+树的特点' },
  { id:'bt5', type:'paragraph', content:'B+树的所有数据存储在叶子节点，非叶子节点只存索引。叶子节点通过链表连接，支持高效的范围查询。MySQL的InnoDB引擎使用B+树作为索引结构。' },
]);

export const mockNoteTCP = makeNote('f_tcp', 'TCP三次握手', '计算机网络', [
  { id:'t1', type:'heading', level:1, content:'TCP三次握手' },
  { id:'t2', type:'heading', level:2, content:'一、握手过程' },
  { id:'t3', type:'paragraph', content:'第一次：客户端发送SYN=1, seq=x → 第二次：服务器回复SYN=1, ACK=1, seq=y, ack=x+1 → 第三次：客户端发送ACK=1, seq=x+1, ack=y+1。连接建立。' },
  { id:'t4', type:'heading', level:2, content:'二、为什么是三次？' },
  { id:'t5', type:'paragraph', content:'三次握手是为了防止已失效的连接请求到达服务器。如果只有两次握手，服务器收到失效的SYN后就会建立连接，浪费资源。第三次握手让服务器确认客户端确实想要连接。' },
  { id:'t6', type:'heading', level:2, content:'三、四次挥手' },
  { id:'t7', type:'paragraph', content:'断开连接需要四次挥手，因为TCP是全双工的：FIN→ACK, FIN→ACK。客户端和服务器各发送一次FIN，各回复一次ACK。' },
]);

// 笔记ID映射
const NOTE_MAP = {
  f_limit: () => ({ ...mockNoteLimit, id: 'f_limit' }),
  f_derivative: () => ({ ...mockNoteDerivative, id: 'f_derivative' }),
  f_integral: () => ({ ...mockNoteIntegral, id: 'f_integral' }),
  f_process: () => ({ ...mockNoteProcess, id: 'f_process' }),
  f_memory_os: () => ({ ...mockNoteMemory, id: 'f_memory_os' }),
  f_deadlock: () => ({ ...mockNoteDeadlock, id: 'f_deadlock' }),
  f_rbtree: () => ({ ...mockNoteRBTree, id: 'f_rbtree' }),
  f_btree: () => ({ ...mockNoteBTree, id: 'f_btree' }),
  f_tcp: () => ({ ...mockNoteTCP, id: 'f_tcp' }),
  note_process_thread: () => ({ ...mockNoteProcessThread, id: 'note_process_thread' }),
  note_a1b2c3d4e5f6: () => ({ ...mockNoteDerivative, id: 'note_a1b2c3d4e5f6', title: '高等数学 — 导数与微分笔记' }),
  note_f6e5d4c3b2a1: () => ({ id: 'note_f6e5d4c3b2a1', title: '数据结构 — 链表与树', course: '数据结构', tags: ['数据结构', '链表'], mastery: 0, updatedAt: '2026-05-09', aiStatus: 'parsed', blocks: [] }),
  note_1a2b3c4d5e6f: () => ({ id: 'note_1a2b3c4d5e6f', title: '物理 — 牛顿运动定律', course: '大学物理', tags: ['物理', '力学'], mastery: 0, updatedAt: '2026-05-06', aiStatus: 'draft', blocks: [] }),
};

export const getNoteById = (id) => {
  if (NOTE_MAP[id]) return NOTE_MAP[id]();
  return { id, title: '未知笔记', course: '', tags: [], mastery: 0, updatedAt: '', aiStatus: 'draft', blocks: [] };
};

export const mockReviewSuggestions = [
  { id: 1, noteId: 'note_deadlock', title: '死锁问题', reason: '掌握度仅 45%，建议本周复习', urgency: 'high' },
  { id: 2, noteId: 'note_rb_tree', title: '红黑树', reason: '上次复习距今已超过 7 天', urgency: 'medium' },
  { id: 3, noteId: 'note_process_thread', title: '进程与线程', reason: '记忆曲线预测明天将进入遗忘临界点', urgency: 'medium' },
];

// ========== 速记模式 — 演示脚本数据（QuickNotes.jsx ?demo=1 使用）==========

export const mockQuickNotesDemoSteps = [
  { label: '点击「开始记录」', action: 'start', item: { id: 'demo_1', type: 'system', content: '速记已就绪，点击下方按钮开始记录', timestamp: '00:00:00' } },
  { label: '点击「开始录音」', action: 'rec_start', item: { id: 'demo_2', type: 'recording_start', content: '开始学习', timestamp: '00:00:00' } },
  { label: '发送一段文字', action: 'text', item: { id: 'demo_3', type: 'text', content: '进程是操作系统进行资源分配和调度的基本单位，每个进程拥有独立的地址空间和PCB（进程控制块）。线程是CPU调度的最小单位，同一进程内的线程共享内存和文件资源，但拥有独立的栈空间。', timestamp: '00:03:15' } },
  { label: '录音自动转写（1）', action: 'asr', item: { id: 'demo_4', type: 'recording', content: '教师讲解进程概念', timestamp: '00:05:30', duration: '2:15', transcript: '今天我们来讲操作系统的核心概念——进程。进程是什么呢？简单来说，进程就是一个正在运行的程序。但进程不仅仅是程序代码，它还包含了程序计数器、寄存器、堆栈等运行时信息。操作系统通过进程控制块，也就是PCB，来管理每个进程的这些信息。每个进程都有自己独立的地址空间，这保证了进程之间不会互相干扰。' } },
  { label: '上传 Word 文件', action: 'file', item: { id: 'demo_5', type: 'file', content: '已上传 操作系统-进程管理.docx', fileName: '操作系统-进程管理.docx', timestamp: '00:08:45', extractedText: '第3章 进程管理\n\n3.1 进程的概念\n进程是操作系统中最基本、最重要的概念之一。进程是程序的一次执行过程，是系统进行资源分配和调度的基本单位。\n\n3.2 进程的状态\n进程在其生命周期中会在五种状态间转换：创建态（New）、就绪态（Ready）、运行态（Running）、阻塞态（Blocked）、终止态（Terminated）。\n\n3.3 进程与线程的区别\n进程是资源分配的基本单位，线程是CPU调度的基本单位。进程拥有独立的地址空间，线程共享进程的地址空间。进程间切换开销大，线程间切换开销小。\n\n3.4 死锁\n死锁是指两个或多个进程无限期地等待对方释放资源的状态。死锁的四个必要条件：互斥条件、请求与保持条件、不可剥夺条件、循环等待条件。\n\n3.5 银行家算法\n银行家算法是一种避免死锁的经典算法，由Dijkstra提出。核心思想：在分配资源前，先判断系统是否会进入不安全状态。' } },
  { label: '录音自动转写（2）', action: 'asr', item: { id: 'demo_6', type: 'recording', content: '教师讲解进程状态转换', timestamp: '00:12:00', duration: '3:00', transcript: '接下来我们看看进程的状态转换。一个进程从创建到终止，会经历多个状态。当一个进程被创建后，首先进入就绪态，等待操作系统调度。当CPU被分配给这个进程，它就进入运行态。如果在运行过程中需要等待I/O操作，比如读取磁盘文件，进程就会进入阻塞态。等I/O完成后，进程回到就绪态，等待下一次被调度。还有一个重要的概念是抢占——当更高优先级的进程就绪时，当前运行的进程可能被抢占，回到就绪态。' } },
  { label: '发送一段文字', action: 'text', item: { id: 'demo_7', type: 'text', content: '死锁的四个必要条件：互斥条件、请求与保持条件、不可剥夺条件、循环等待条件。避免死锁的方法包括破坏这四个条件之一，以及使用银行家算法进行死锁避免。', timestamp: '00:16:30' } },
  { label: '点击「结束学习」生成 AI 笔记', action: 'ai', item: { id: 'demo_8', type: 'recording_end', content: '结束学习', timestamp: '00:18:00' } },
];

export const mockQuickNotesDemoStructured = [
  { id: 'sn_1', title: '进程的定义', type: '概念定义', content: '进程是操作系统进行资源分配和调度的基本单位。它是程序的一次执行过程，包含程序代码、程序计数器、寄存器、堆栈等运行时信息。操作系统通过进程控制块（PCB）管理每个进程的状态和资源。每个进程拥有独立的地址空间，保证进程间互不干扰。', timestamp: '00:03:15', source: '文本输入 + 00:05 录音', tags: ['重点'] },
  { id: 'sn_2', title: '进程的五状态模型', type: '概念定义', content: '进程在其生命周期中经历五种状态：创建态（New）→ 就绪态（Ready）→ 运行态（Running）→ 阻塞态（Blocked）→ 终止态（Terminated）。状态切换由操作系统调度器根据I/O请求、时间片耗尽、优先级抢占等事件触发。运行中的进程若需等待I/O则转入阻塞态，I/O完成后回到就绪态等待下次调度。', timestamp: '00:12:00', source: '00:12 录音 + 上传文件', tags: ['重点'] },
  { id: 'sn_3', title: '进程与线程的核心区别', type: '推导步骤', content: '进程是资源分配的基本单位，拥有独立地址空间，进程间通信需要IPC机制；线程是CPU调度的最小单位，同进程线程共享内存和文件资源但各自拥有独立栈空间。线程切换无需更换页表，开销远小于进程切换。这也是为什么高并发服务（如Nginx）倾向使用多线程模型。', timestamp: '00:03:15', source: '文本输入 + 上传文件 3.3节', tags: ['考点'] },
  { id: 'sn_4', title: '死锁的四个必要条件', type: '教师强调', content: '死锁必须同时满足四个条件：1）互斥条件——资源只能被一个进程独占；2）请求与保持——进程持有资源的同时请求新资源；3）不可剥夺——资源不能被强制释放；4）循环等待——存在进程资源的环形等待链。考试重点：破坏任一条件即可预防死锁。', timestamp: '00:16:30', source: '文本输入 + 上传文件 3.4节', tags: ['考点', '重点'] },
  { id: 'sn_5', title: '银行家算法', type: '关键结论', content: '银行家算法是Dijkstra提出的经典死锁避免算法。核心思想：在每次资源分配前，预先判断分配后系统是否会进入不安全状态。如果安全则分配，不安全则拒绝。算法需要提前知道每个进程的最大资源需求，适用于资源种类和数量固定的场景。', timestamp: '00:16:30', source: '上传文件 3.5节', tags: [] },
];
