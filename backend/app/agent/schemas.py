"""Agent 工具定义（Function Calling Schema）。

描述写得越清楚，模型选工具的准确率越高——这部分比代码本身更影响 Agent 智商。
每条描述都包含三件事：
  1. 这个工具做什么
  2. 什么时候该用（触发条件）
  3. 输出有多详细（防止模型误以为拿到了全部内容）
"""

from __future__ import annotations

TOOL_DEFINITIONS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "list_courses",
            "description": (
                "列出用户的全部课程及每门课的笔记数量。"
                "当用户提到某一门课（如'操作系统''高等数学'），或你需要知道用户学了哪些课时，"
                "先调用此工具拿到准确的课程名和 courseId，再用 courseId 去检索笔记。"
                "不要凭猜测使用课程名。"
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_notes",
            "description": (
                "按关键词检索用户的笔记，返回标题和匹配摘要。"
                "当用户询问'我记过什么''帮我找某主题的笔记''关于X的笔记'时使用。"
                "只返回摘要（约200字），若需要完整内容请接着调用 get_note。"
                "查不到时不要编造，如实告知用户。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "检索关键词，例如'进程调度'"},
                    "course_id": {
                        "type": "string",
                        "description": "可选。限定在某门课程内检索，值来自 list_courses",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_note",
            "description": (
                "读取一篇笔记的完整正文。"
                "当已通过 search_notes 找到目标笔记、需要基于正文做分析/总结/出题时使用。"
                "正文过长会被截断，截断时会明确提示。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {"type": "string", "description": "笔记 ID，来自 search_notes 的返回值"},
                },
                "required": ["note_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_overview",
            "description": (
                "获取用户的学习总览：笔记数、记忆卡数量、待复习卡片数、薄弱笔记数量。"
                "当用户问'我学得怎么样''哪里薄弱''该复习什么'，"
                "或你制定复习计划前需要了解整体状况时使用。"
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_due_cards",
            "description": (
                "列出当前到期待复习的记忆卡片（含问题与答案）。"
                "当用户要复习、或制定复习计划需要知道'今天该复习哪些卡'时使用。"
                "最多返回 20 张。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "返回数量上限，默认 10"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_memory_cards",
            "description": (
                "根据指定笔记的正文，用 AI 生成记忆卡片并写入记忆库。"
                "当用户说'把这篇笔记做成卡片''帮我出题背下来'时使用。"
                "注意：该操作会覆盖该笔记原有的活跃卡片，且耗时较长（10-30秒）。"
                "调用前最好先用 search_notes 确认 note_id。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {"type": "string", "description": "笔记 ID"},
                    "max_cards": {"type": "integer", "description": "最多生成几张，默认 5"},
                },
                "required": ["note_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_note",
            "description": (
                "创建一篇新笔记并写入正文。"
                "当用户明确要求'帮我记下来''新建一篇笔记''保存这段内容'时使用。"
                "创建成功后返回新笔记的 ID，可继续对其生成卡片。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "笔记标题"},
                    "content": {"type": "string", "description": "笔记正文，支持 Markdown"},
                    "course_id": {"type": "string", "description": "可选。归属课程 ID"},
                },
                "required": ["title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_feynman",
            "description": (
                "开始一次费曼学习会话：记录学习者用自己的话对某个概念的讲解，供后续追问和评估。"
                "当用户说'我学完了X，帮我检验一下''我想练练讲解X'时使用。"
                "explanation 必须是学习者自己的讲解原话——不要替他编，费曼的价值在于暴露真实理解。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "concept_name": {"type": "string", "description": "要讲解的概念，如'进程与线程的区别'"},
                    "explanation": {"type": "string", "description": "学习者对这个概念的讲解原话"},
                    "note_id": {"type": "string", "description": "可选。关联的笔记 ID"},
                },
                "required": ["concept_name", "explanation"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "feynman_add_question",
            "description": (
                "在进行中的费曼会话里追加一个追问，针对学习者讲解中的漏洞或含糊之处。"
                "一次只追一个问题，小而具体；讲解中有多个漏洞时抓最大的先问。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "session_id": {"type": "string", "description": "费曼会话 ID，来自 run_feynman"},
                    "question": {"type": "string", "description": "追问内容"},
                },
                "required": ["session_id", "question"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "evaluate_feynman",
            "description": (
                "对费曼会话打分评估并结束会话。"
                "score 为 0-100（90+讲得透彻能教别人；70-89基本正确有小漏洞；"
                "50-69框架对但含糊；<50有概念性错误）。"
                "feedback 先肯定讲对的部分，再指出 1-2 个最大漏洞和改进建议。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "session_id": {"type": "string", "description": "费曼会话 ID"},
                    "score": {"type": "integer", "description": "0-100 的评分"},
                    "feedback": {"type": "string", "description": "评估反馈：讲对了什么、漏洞在哪、怎么改进"},
                    "follow_up_questions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "漏洞对应的补强问题列表，如['用一句话解释页表的作用']",
                    },
                },
                "required": ["session_id", "score", "feedback"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ask_thinking_question",
            "description": (
                "针对一篇笔记开启苏格拉底式深度思考会话，并记录一个引导问题。"
                "当用户的理解流于表面、有想不清的问题、或想'深入理解'时使用。"
                "问题要引导用户自己发现矛盾、补齐推理，而不是直接给答案。"
                "发出问题后停下来等用户回答，再决定下一问。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {"type": "string", "description": "笔记 ID，来自 search_notes"},
                    "goal": {"type": "string", "description": "本次思考要达到的目标，如'弄清虚拟内存存在的原因'"},
                    "question": {"type": "string", "description": "引导问题"},
                    "prompt_type": {
                        "type": "string",
                        "enum": ["socratic", "gap_check", "counter_example", "revision"],
                        "description": (
                            "问题类型：socratic 追问推理链 / gap_check 暴露盲区 / "
                            "counter_example 用反例检验 / revision 促使修正表述"
                        ),
                    },
                },
                "required": ["note_id", "goal", "question"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_review",
            "description": (
                "记录一次记忆卡复习结果，并按 SM-2 间隔重复算法排下次复习时间。"
                "用户答完卡片后使用。grade 要按实际表现诚实评级："
                "again 完全忘了/答错（间隔重置）、hard 答对但吃力、good 答对较顺、easy 秒答非常熟。"
                "把'其实忘了'标成 good 会让卡片排得太远、真正忘掉，宁可标 again。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "card_id": {"type": "string", "description": "记忆卡 ID，来自 list_due_cards"},
                    "grade": {
                        "type": "string",
                        "enum": ["again", "hard", "good", "easy"],
                        "description": "复习评级",
                    },
                },
                "required": ["card_id", "grade"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_mastery",
            "description": (
                "查看各笔记的掌握度画像（0-100，按薄弱优先列出），并给出薄弱笔记数量。"
                "当用户问'哪里薄弱''我学得怎么样'，或你需要挑选优先安排复习/费曼练习的内容时使用。"
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_knowledge",
            "description": (
                "知识库语义检索：从用户笔记/导入资料的分块库里，找与问题最相关的原文片段。"
                "回答'X 是什么''资料里怎么解释 Y'这类需要原文依据的问题时优先使用；"
                "与 search_notes（笔记级发现）互补，本工具返回片段级原文摘录，引用时注明出处标题。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "问题或关键词，例如'死锁的四个必要条件'"},
                    "limit": {"type": "integer", "description": "返回片段数上限，默认 5"},
                },
                "required": ["query"],
            },
        },
    },
]


TOOL_NAMES = [item["function"]["name"] for item in TOOL_DEFINITIONS]
