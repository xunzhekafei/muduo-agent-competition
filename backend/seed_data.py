"""Seed the database with frontend mock data.

Run from the backend directory:
    python seed_data.py
"""

from datetime import date, datetime, timezone

from app.core.security import hash_password
from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.session import build_engine, get_session_factory
from app.modules.community.models import SharedAssetModel
from app.modules.courses.models import CourseModel, LearningSpaceModel
from app.modules.dashboard.models import LearningActivityModel, StudyLogModel
from app.modules.feynman.models import FeynmanSessionModel
from app.modules.memory.models import MemoryCardModel
from app.modules.notes.models import NoteBlockModel, NoteModel
from app.modules.thinking.models import ThinkingSessionModel
from app.modules.users.models import UserModel, UserPreferenceModel
from app.schemas.enums import (
    DashboardTaskMode,
    FeynmanSessionStatus,
    MemoryCardStatus,
    NoteBlockType,
    NoteStatus,
    SharedAssetType,
    ThinkingSessionStatus,
    UserRole,
    Visibility,
)


def utc_now():
    return datetime.now(timezone.utc)


OWNER_ID = "user_001"


def seed():
    engine = build_engine("sqlite+pysqlite:///./muduo_dev.sqlite3")
    import app.db.models  # noqa: F401  ensure all models are registered

    Base.metadata.create_all(bind=engine)

    session_factory = get_session_factory()
    with session_factory() as db:
        _seed_user(db)
        _seed_courses(db)
        _seed_learning_spaces(db)
        _seed_notes(db)
        _seed_memory_cards(db)
        _seed_shared_assets(db)
        _seed_thinking_feynman_sessions(db)
        _seed_activities(db)
        _seed_study_logs(db)
        db.commit()
        print("Seed completed successfully.")


def _seed_user(db):
    user = db.get(UserModel, OWNER_ID)
    if user is not None:
        print("User already exists, skipping.")
        return
    user = UserModel(
        id=OWNER_ID,
        name="学生用户",
        email="student@example.com",
        password_hash=hash_password("muduo123456"),
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.flush()
    pref = UserPreferenceModel(user_id=OWNER_ID)
    db.add(pref)
    print("Created user_001.")


def _seed_courses(db):
    courses = [
        {
            "id": "course_math_001",
            "name": "高等数学（上）",
            "subject": "数学",
            "description": "包含函数、极限、导数、积分等基础内容",
        },
        {
            "id": "course_cs_001",
            "name": "数据结构",
            "subject": "计算机科学",
            "description": "学习常见数据结构及其算法实现",
        },
        {
            "id": "course_phys_001",
            "name": "大学物理",
            "subject": "物理",
            "description": "力学、热学、电磁学基础",
        },
        {
            "id": "course_os",
            "name": "操作系统",
            "subject": "计算机科学",
            "description": "进程管理、内存管理、文件系统等核心概念",
        },
        {
            "id": "course_net",
            "name": "计算机网络",
            "subject": "计算机科学",
            "description": "TCP/IP协议栈、网络分层架构",
        },
        {
            "id": "course_ai",
            "name": "AI 导论",
            "subject": "计算机科学",
            "description": "机器学习与深度学习基础",
        },
    ]
    for c in courses:
        existing = db.get(CourseModel, c["id"])
        if existing:
            continue
        course = CourseModel(
            id=c["id"],
            owner_id=OWNER_ID,
            name=c["name"],
            subject=c["subject"],
            description=c["description"],
        )
        db.add(course)
    db.flush()
    print(f"Seeded {len(courses)} courses.")


def _seed_learning_spaces(db):
    spaces = [
        {
            "id": "space_math_thinking",
            "course_id": "course_math_001",
            "parent_id": None,
            "name": "思考链",
            "position": 0,
        },
        {
            "id": "space_os_cards",
            "course_id": "course_os",
            "parent_id": None,
            "name": "记忆卡片",
            "position": 0,
        },
    ]
    for s in spaces:
        existing = db.get(LearningSpaceModel, s["id"])
        if existing:
            continue
        space = LearningSpaceModel(
            id=s["id"],
            owner_id=OWNER_ID,
            course_id=s["course_id"],
            parent_id=s["parent_id"],
            name=s["name"],
            position=s["position"],
        )
        db.add(space)
    db.flush()
    print(f"Seeded {len(spaces)} learning spaces.")


def _seed_notes(db):
    notes_data = _build_notes_data()
    for nd in notes_data:
        existing = db.get(NoteModel, nd["id"])
        if existing:
            continue
        note = NoteModel(
            id=nd["id"],
            owner_id=OWNER_ID,
            title=nd["title"],
            course_id=nd.get("course_id"),
            note_type=nd.get("note_type", "manual"),
            status=nd.get("status", NoteStatus.ACTIVE),
            mastery=nd.get("mastery"),
            tags=nd.get("tags", []),
        )
        db.add(note)
        db.flush()

        for i, bd in enumerate(nd.get("blocks", [])):
            block = NoteBlockModel(
                id=bd["id"],
                note_id=nd["id"],
                block_type=bd["block_type"],
                content=bd["content"],
                position=bd.get("position", i),
                block_metadata=bd.get("block_metadata", {}),
            )
            db.add(block)
    db.flush()
    print(f"Seeded {len(notes_data)} notes with blocks.")


def _seed_memory_cards(db):
    cards = _build_memory_cards()
    for c in cards:
        existing = db.get(MemoryCardModel, c["id"])
        if existing:
            continue
        card = MemoryCardModel(
            id=c["id"],
            owner_id=OWNER_ID,
            source_note_id=c.get("source_note_id"),
            front=c["front"],
            back=c["back"],
            tags=c["tags"],
            status=c["status"],
            due_at=utc_now(),
        )
        db.add(card)
    db.flush()
    print(f"Seeded {len(cards)} memory cards.")


def _seed_shared_assets(db):
    assets = [
        {
            "id": "asset_001",
            "title": "线性代数知识框架",
            "asset_type": SharedAssetType.KNOWLEDGE_GRAPH,
            "source_id": "note_a1b2c3d4e5f6",
            "description": "包含行列式、矩阵、特征值等核心概念的完整知识结构",
            "tags": ["线性代数", "知识框架"],
        },
        {
            "id": "asset_002",
            "title": "导数定义思维链",
            "asset_type": SharedAssetType.THINKING_CHAIN,
            "source_id": "note_a1b2c3d4e5f6",
            "description": "从导数定义出发的苏格拉底式对话记录",
            "tags": ["导数", "思维训练"],
        },
        {
            "id": "asset_003",
            "title": "数据结构复习模板",
            "asset_type": SharedAssetType.REVIEW_TEMPLATE,
            "source_id": "note_f6e5d4c3b2a1",
            "description": "涵盖数组、链表、栈、队列、树、图的复习卡片模板",
            "tags": ["数据结构", "复习模板"],
        },
    ]
    for a in assets:
        existing = db.get(SharedAssetModel, a["id"])
        if existing:
            continue
        asset = SharedAssetModel(
            id=a["id"],
            owner_id=OWNER_ID,
            title=a["title"],
            asset_type=a["asset_type"],
            source_id=a["source_id"],
            visibility=Visibility.PUBLIC,
            description=a["description"],
            tags=a["tags"],
        )
        db.add(asset)
    db.flush()
    print(f"Seeded {len(assets)} shared assets.")


def _build_notes_data():
    """Build all note data matching frontend mocks."""
    return [
        # === Notes from mockNotesList ===
        {
            "id": "note_a1b2c3d4e5f6",
            "title": "高等数学 — 导数与微分笔记",
            "course_id": "course_math_001",
            "tags": ["高等数学", "导数"],
            "status": NoteStatus.ACTIVE,
            "blocks": [
                _block("block_001", NoteBlockType.HEADING, "导数的定义", 1, {"level": 1}),
                _block(
                    "block_002",
                    NoteBlockType.PARAGRAPH,
                    "导数是函数在某一点的变化率，定义为当自变量的增量趋于零时，函数增量与自变量增量之比的极限。",
                    2,
                ),
                _block("block_003", NoteBlockType.HEADING, "可导与连续的关系", 3, {"level": 1}),
                _block(
                    "block_004",
                    NoteBlockType.PARAGRAPH,
                    "可导函数一定连续，但连续函数不一定可导。例如 y=|x| 在 x=0 处连续但不可导。",
                    4,
                ),
            ],
        },
        {
            "id": "note_f6e5d4c3b2a1",
            "title": "数据结构 — 链表与树",
            "course_id": "course_cs_001",
            "tags": ["数据结构", "链表"],
            "status": NoteStatus.ACTIVE,
            "blocks": [],
        },
        {
            "id": "note_1a2b3c4d5e6f",
            "title": "物理 — 牛顿运动定律",
            "course_id": "course_phys_001",
            "tags": ["物理", "力学"],
            "status": NoteStatus.DRAFT,
            "blocks": [],
        },
        # === Notes from knowledge tree & detailed content ===
        _note_limit(),
        _note_derivative(),
        _note_integral(),
        _note_process_thread(),
        _note_memory_mgmt(),
        _note_deadlock(),
        _note_rb_tree(),
        _note_btree(),
        _note_tcp(),
    ]


def _block(block_id, block_type, content, position, metadata=None):
    return {
        "id": block_id,
        "block_type": block_type,
        "content": content,
        "position": position,
        "block_metadata": metadata or {},
    }


# === Individual note builders ===


def _note_limit():
    return {
        "id": "f_limit",
        "title": "极限",
        "course_id": "course_math_001",
        "note_type": "thinking",
        "tags": ["核心概念", "基础"],
        "mastery": 88,
        "status": NoteStatus.ACTIVE,
        "blocks": [
            _block("l1", NoteBlockType.HEADING, "极限", 1, {"level": 1}),
            _block("l2", NoteBlockType.HEADING, "一、极限的直观理解", 2, {"level": 2}),
            _block(
                "l3",
                NoteBlockType.PARAGRAPH,
                '极限描述的是函数值无限接近某个确定值的过程。不是"等于"，而是"趋近于"。比如当 x 趋近于 0 时，sin(x)/x 的值趋近于 1。',
                3,
                {"highlights": ["无限接近", "趋近于", "不是等于"]},
            ),
            _block("l4", NoteBlockType.HEADING, "二、ε-δ 严格定义", 4, {"level": 2}),
            _block(
                "l5",
                NoteBlockType.PARAGRAPH,
                "对于任意给定的 ε > 0，存在 δ > 0，使得当 0 < |x - x₀| < δ 时，有 |f(x) - L| < ε。这个定义的精妙之处在于：无论你要求多么接近，我都能找到一个足够小的区间，使函数值落在你的要求范围内。",
                5,
                {"highlights": ["ε-δ定义", "任意给定", "存在"]},
            ),
            _block("l6", NoteBlockType.HEADING, "三、左极限与右极限", 6, {"level": 2}),
            _block(
                "l7",
                NoteBlockType.PARAGRAPH,
                "左极限：x 从左侧趋近 x₀ 时 f(x) 的极限。右极限：x 从右侧趋近 x₀ 时 f(x) 的极限。函数在 x₀ 处极限存在的充要条件是：左右极限都存在且相等。",
                7,
                {"highlights": ["左极限", "右极限", "充要条件"]},
            ),
            _block(
                "l8",
                NoteBlockType.AI_SUMMARY,
                '极限的本质是函数值无限接近某个确定值。理解极限的关键在于接受"趋近但不等于"的思想。这是整个微积分的基石——导数定义为差商的极限，积分定义为黎曼和的极限。极限不仅是一个计算工具，更是一种"无限逼近"的思维方式。',
                8,
            ),
            _block("l9", NoteBlockType.HEADING, "四、核心公式", 9, {"level": 2}),
            _block("l10", NoteBlockType.FORMULA, "lim(x→0) sin(x)/x = 1", 10),
            _block("l11", NoteBlockType.FORMULA, "lim(x→∞) (1 + 1/x)^x = e", 11),
            _block("l12", NoteBlockType.HEADING, "五、学生标注", 12, {"level": 2}),
            _block(
                "l13",
                NoteBlockType.ANNOTATION,
                "这里容易和连续混淆。极限存在不意味着函数连续——还需要极限值等于函数值。",
                13,
            ),
            _block("l14", NoteBlockType.HEADING, "六、AI 思考链", 14, {"level": 2}),
            _block(
                "l15",
                NoteBlockType.THINKING,
                "为什么函数在一点的极限存在，但函数在该点不一定连续？",
                15,
                {
                    "question": "为什么函数在一点的极限存在，但函数在该点不一定连续？",
                    "userAnswer": "因为连续需要满足三个条件：函数在该点有定义、极限存在、极限值等于函数值。极限存在只是其中一条。比如可去间断点，极限存在但函数值不等于极限值。",
                    "aiFollowUp": "很好。那你能举出一个极限存在但函数在这一点没有定义的例子吗？",
                    "userAnswer2": "比如 f(x) = sin(x)/x 在 x=0 处没有定义，但 lim(x→0) sin(x)/x = 1。",
                    "aiFeedback": "完全正确！这个例子非常好。注意这里极限存在但函数未定义，当然不连续。补充一点：还有跳跃间断点的情况，左右极限都存在但不相等。",
                },
            ),
            _block("l16", NoteBlockType.HEADING, "七、关联知识", 16, {"level": 2}),
            _block(
                "l17",
                NoteBlockType.RELATIONS,
                "",
                17,
                {
                    "items": [
                        {"label": "后续延伸", "target": "连续.md", "reason": "连续的定义直接依赖极限"},
                        {"label": "后续延伸", "target": "导数与微分.md", "reason": "导数定义为差商的极限"},
                        {"label": "后续延伸", "target": "洛必达法则.md", "reason": "洛必达法则用于计算未定式极限"},
                    ]
                },
            ),
            _block("l18", NoteBlockType.HEADING, "八、记忆卡片", 18, {"level": 2}),
            _block(
                "l19",
                NoteBlockType.MEMORY_CARDS,
                "",
                19,
                {
                    "cards": [
                        {
                            "q": "极限的ε-δ定义的核心思想是什么？",
                            "a": "对于任意给定的精度要求(ε)，总存在一个足够小的邻域(δ)，使函数值落在精度范围内。",
                        },
                        {
                            "q": "极限存在和函数连续是什么关系？",
                            "a": "极限存在是连续的必要不充分条件。连续还需要极限值等于函数值。",
                        },
                        {
                            "q": "lim(x→0) sin(x)/x 等于多少？",
                            "a": "等于 1。这是最重要的极限公式之一。",
                        },
                    ]
                },
            ),
        ],
    }


def _note_derivative():
    return {
        "id": "f_derivative",
        "title": "导数与微分",
        "course_id": "course_math_001",
        "tags": [],
        "mastery": 75,
        "status": NoteStatus.ACTIVE,
        "blocks": [
            _block("d1", NoteBlockType.HEADING, "导数与微分", 1, {"level": 1}),
            _block("d2", NoteBlockType.HEADING, "一、导数的定义", 2, {"level": 2}),
            _block(
                "d3",
                NoteBlockType.PARAGRAPH,
                "导数描述函数在某一点的变化率。设函数 y=f(x) 在点 x₀ 处可导，则导数定义为：f'(x₀)=lim(Δx→0)[f(x₀+Δx)-f(x₀)]/Δx。导数的几何意义是曲线在该点切线的斜率。",
                3,
                {"highlights": ["变化率", "切线斜率"]},
            ),
            _block("d4", NoteBlockType.HEADING, "二、基本求导公式", 4, {"level": 2}),
            _block(
                "d5",
                NoteBlockType.PARAGRAPH,
                "(C)'=0, (xⁿ)'=nxⁿ⁻¹, (sinx)'=cosx, (cosx)'=-sinx, (eˣ)'=eˣ, (lnx)'=1/x。熟记这些基本公式是后续学习的基础。",
                5,
            ),
            _block("d6", NoteBlockType.HEADING, "三、微分的概念", 6, {"level": 2}),
            _block(
                "d7",
                NoteBlockType.PARAGRAPH,
                "微分 dy=f'(x)dx 表示函数增量的线性主部。微分与导数的关系：dy=f'(x)dx，即微分等于导数乘以自变量的微分。",
                7,
            ),
            _block(
                "d8",
                NoteBlockType.AI_SUMMARY,
                "导数是微积分的核心概念，描述了函数的局部变化率。掌握基本求导公式和求导法则（和差积商、链式法则）是后续学习积分、微分方程的基础。",
                8,
            ),
        ],
    }


def _note_integral():
    return {
        "id": "f_integral",
        "title": "不定积分",
        "course_id": "course_math_001",
        "tags": [],
        "mastery": 60,
        "status": NoteStatus.ACTIVE,
        "blocks": [
            _block("i1", NoteBlockType.HEADING, "不定积分", 1, {"level": 1}),
            _block("i2", NoteBlockType.HEADING, "一、原函数与不定积分", 2, {"level": 2}),
            _block(
                "i3",
                NoteBlockType.PARAGRAPH,
                "如果 F'(x)=f(x)，则称 F(x) 是 f(x) 的一个原函数。f(x) 的所有原函数称为 f(x) 的不定积分，记作 ∫f(x)dx = F(x) + C，其中 C 为任意常数。",
                3,
            ),
            _block("i4", NoteBlockType.HEADING, "二、基本积分公式", 4, {"level": 2}),
            _block(
                "i5",
                NoteBlockType.PARAGRAPH,
                "∫xⁿdx = xⁿ⁺¹/(n+1) + C (n≠-1), ∫(1/x)dx = ln|x| + C, ∫eˣdx = eˣ + C, ∫sinx dx = -cosx + C, ∫cosx dx = sinx + C。",
                5,
            ),
            _block("i6", NoteBlockType.HEADING, "三、换元积分法", 6, {"level": 2}),
            _block(
                "i7",
                NoteBlockType.PARAGRAPH,
                "第一换元法（凑微分）：将被积函数凑成 f[φ(x)]φ'(x) 的形式。第二换元法：令 x=ψ(t)，将积分转化为对新变量 t 的积分。",
                7,
            ),
            _block(
                "i8",
                NoteBlockType.AI_SUMMARY,
                "不定积分是求导的逆运算。核心技巧是换元法和分部积分法。记住基本积分公式，灵活运用凑微分技巧是解题关键。",
                8,
            ),
        ],
    }


def _note_process_thread():
    return {
        "id": "note_process_thread",
        "title": "进程与线程",
        "course_id": "course_os",
        "note_type": "thinking",
        "tags": ["核心概念", "面试重点"],
        "mastery": 85,
        "status": NoteStatus.ACTIVE,
        "blocks": [
            _block("b1", NoteBlockType.HEADING, "进程与线程", 1, {"level": 1}),
            _block("b2", NoteBlockType.HEADING, "一、进程（Process）", 2, {"level": 2}),
            _block("b3", NoteBlockType.HEADING, "定义", 3, {"level": 3}),
            _block(
                "b4",
                NoteBlockType.PARAGRAPH,
                "进程是操作系统进行资源分配和调度的基本单位。每个进程拥有独立的地址空间、PCB（进程控制块）、打开的文件描述符和 CPU 运行状态。",
                4,
                {"highlights": ["资源分配", "调度", "PCB"]},
            ),
            _block("b5", NoteBlockType.HEADING, "进程的五状态模型", 5, {"level": 3}),
            _block(
                "b6",
                NoteBlockType.PARAGRAPH,
                "进程在其生命周期中会在以下五种状态之间切换：创建（New）→ 就绪（Ready）→ 运行（Running）→ 阻塞（Blocked）→ 终止（Terminated）。状态切换由操作系统调度器根据 I/O 请求、时间片耗尽、优先级抢占等事件触发。",
                6,
            ),
            _block("b7", NoteBlockType.HEADING, "二、线程（Thread）", 7, {"level": 2}),
            _block("b8", NoteBlockType.HEADING, "定义", 8, {"level": 3}),
            _block(
                "b9",
                NoteBlockType.PARAGRAPH,
                "线程是 CPU 调度的最小单位。同一进程中的线程共享内存空间、文件资源和代码段，但拥有独立的栈空间和寄存器状态。这种共享机制使线程间通信成本远低于进程间通信（IPC）。",
                9,
                {"highlights": ["CPU调度", "共享内存", "独立栈"]},
            ),
            _block("b10", NoteBlockType.HEADING, "三、进程与线程的核心区别", 10, {"level": 2}),
            _block(
                "b11",
                NoteBlockType.TABLE,
                "",
                11,
                {
                    "headers": ["对比维度", "进程", "线程"],
                    "rows": [
                        ["资源拥有", "独立地址空间和资源", "共享进程资源"],
                        ["切换开销", "大（需切换虚拟内存空间）", "小（仅切换寄存器和栈）"],
                        ["通信方式", "IPC（管道/消息队列/共享内存）", "直接读写共享内存"],
                        ["创建销毁", "慢，需分配PCB和地址空间", "快，只需分配栈和TCB"],
                        ["独立性", "进程间相互隔离", "同一进程内线程互相影响"],
                    ],
                },
            ),
            _block("b12", NoteBlockType.HEADING, "四、经典问题：为什么线程切换更快？", 12, {"level": 2}),
            _block(
                "b13",
                NoteBlockType.AI_SUMMARY,
                "线程切换无需切换整个虚拟内存空间。进程切换时，CPU 需要保存当前进程的完整上下文（页表、地址空间、打开文件等），加载新进程的上下文。而同一进程内的线程共享地址空间，切换时只需保存和恢复寄存器状态与栈指针，因此上下文切换成本远低于进程切换。这也是为什么高并发服务（如 Nginx、Node.js）倾向使用多线程/协程模型。",
                13,
            ),
            _block("b14", NoteBlockType.HEADING, "五、思考链 — AI 引导推导", 14, {"level": 2}),
            _block(
                "b15",
                NoteBlockType.THINKING,
                "为什么多线程程序更容易产生并发问题？",
                15,
                {
                    "question": "为什么多线程程序更容易产生并发问题？",
                    "userAnswer": "因为多个线程共享同一块内存区域，当多个线程同时读写同一个变量时，如果没有同步机制，就会产生数据竞争。",
                    "aiFollowUp": "共享资源具体会导致哪两类典型问题？你能分别举例吗？",
                    "userAnswer2": "竞态条件（Race Condition）：两个线程同时修改一个计数器，最终结果取决于执行顺序。死锁（Deadlock）：线程A持有锁1等锁2，线程B持有锁2等锁1，互相等待。",
                    "aiFeedback": "正确。补充一点：除了竞态和死锁，还有活锁（Livelock）和饥饿（Starvation）。建议在后续复习中对比这四种并发问题的区别。",
                },
            ),
            _block("b16", NoteBlockType.HEADING, "六、AI 自动生成记忆卡片", 16, {"level": 2}),
            _block(
                "b17",
                NoteBlockType.MEMORY_CARDS,
                "",
                17,
                {
                    "cards": [
                        {
                            "q": "进程和线程的核心区别是什么？",
                            "a": "进程是资源分配的基本单位，拥有独立地址空间；线程是CPU调度的基本单位，共享进程资源。",
                        },
                        {
                            "q": "为什么线程切换比进程切换更快？",
                            "a": "线程共享进程的虚拟内存空间，切换时无需更换页表和完整上下文，只需切换寄存器和栈。",
                        },
                        {
                            "q": "进程的五种状态分别是？",
                            "a": "创建（New）、就绪（Ready）、运行（Running）、阻塞（Blocked）、终止（Terminated）。",
                        },
                        {
                            "q": "多线程共享哪些资源？独立拥有哪些资源？",
                            "a": "共享：代码段、堆内存、文件描述符、全局变量。独立：栈空间、程序计数器、寄存器状态。",
                        },
                    ]
                },
            ),
            _block("b18", NoteBlockType.HEADING, "七、相关概念", 18, {"level": 2}),
            _block(
                "b19",
                NoteBlockType.RELATIONS,
                "",
                18,
                {
                    "items": [
                        {"label": "前置依赖", "target": "内存管理.md", "reason": "理解进程地址空间需要内存管理基础知识"},
                        {"label": "后续延伸", "target": "死锁问题.md", "reason": "多线程并发是死锁问题的前置场景"},
                        {"label": "横向对比", "target": "TCP三次握手.md", "reason": '对比操作系统和网络协议中的"状态机"概念'},
                    ]
                },
            ),
        ],
    }


def _note_memory_mgmt():
    return {
        "id": "f_memory_os",
        "title": "内存管理",
        "course_id": "course_os",
        "note_type": "resource_import",
        "tags": [],
        "mastery": 72,
        "status": NoteStatus.ACTIVE,
        "blocks": [
            _block("m1", NoteBlockType.HEADING, "内存管理", 1, {"level": 1}),
            _block("m2", NoteBlockType.HEADING, "一、虚拟内存", 2, {"level": 2}),
            _block(
                "m3",
                NoteBlockType.PARAGRAPH,
                "虚拟内存使得每个进程拥有独立的虚拟地址空间，通过页表将虚拟地址映射到物理地址。这使得进程可以使用的内存超过实际物理内存大小。",
                3,
            ),
            _block("m4", NoteBlockType.HEADING, "二、分页与分段", 4, {"level": 2}),
            _block(
                "m5",
                NoteBlockType.PARAGRAPH,
                "分页将内存划分为固定大小的页框，分段则按逻辑单元划分。现代操作系统多采用段页式结合的方式。",
                5,
            ),
            _block("m6", NoteBlockType.HEADING, "三、页面置换算法", 6, {"level": 2}),
            _block(
                "m7",
                NoteBlockType.PARAGRAPH,
                "FIFO（先进先出）、LRU（最近最久未使用）、Clock算法。LRU效果最好但实现复杂，Clock是实际系统中最常用的近似LRU算法。",
                7,
            ),
        ],
    }


def _note_deadlock():
    return {
        "id": "f_deadlock",
        "title": "死锁问题",
        "course_id": "course_os",
        "note_type": "quick_timeline",
        "tags": [],
        "mastery": 45,
        "status": NoteStatus.ACTIVE,
        "blocks": [
            _block("dl1", NoteBlockType.HEADING, "死锁问题", 1, {"level": 1}),
            _block("dl2", NoteBlockType.HEADING, "一、死锁的定义", 2, {"level": 2}),
            _block(
                "dl3",
                NoteBlockType.PARAGRAPH,
                "死锁是指两个或多个进程互相等待对方释放资源，导致所有进程都无法继续执行的状态。",
                3,
            ),
            _block("dl4", NoteBlockType.HEADING, "二、死锁的四个必要条件", 4, {"level": 2}),
            _block(
                "dl5",
                NoteBlockType.PARAGRAPH,
                "互斥条件、请求与保持条件、不可剥夺条件、循环等待条件。四个条件必须同时满足才会发生死锁。",
                5,
            ),
            _block("dl6", NoteBlockType.HEADING, "三、银行家算法", 6, {"level": 2}),
            _block(
                "dl7",
                NoteBlockType.PARAGRAPH,
                "银行家算法通过预先判断资源分配后系统是否仍处于安全状态来避免死锁。需要知道每个进程的最大资源需求。",
                7,
            ),
        ],
    }


def _note_rb_tree():
    return {
        "id": "f_rbtree",
        "title": "红黑树",
        "course_id": "course_cs_001",
        "tags": [],
        "mastery": 55,
        "status": NoteStatus.ACTIVE,
        "blocks": [
            _block("r1", NoteBlockType.HEADING, "红黑树", 1, {"level": 1}),
            _block("r2", NoteBlockType.HEADING, "一、红黑树的五个性质", 2, {"level": 2}),
            _block(
                "r3",
                NoteBlockType.PARAGRAPH,
                "1.节点是红色或黑色 2.根节点是黑色 3.叶子节点(NIL)是黑色 4.红色节点的子节点必须是黑色 5.从任一节点到其每个叶子的路径包含相同数量的黑色节点。",
                3,
            ),
            _block("r4", NoteBlockType.HEADING, "二、时间复杂度", 4, {"level": 2}),
            _block(
                "r5",
                NoteBlockType.PARAGRAPH,
                "查找、插入、删除均为O(log n)。红黑树通过旋转和变色维持平衡，确保树高不超过2log(n+1)。",
                5,
            ),
            _block("r6", NoteBlockType.HEADING, "三、与AVL树的比较", 6, {"level": 2}),
            _block(
                "r7",
                NoteBlockType.PARAGRAPH,
                "AVL树更严格平衡（高度差≤1），查找更快但插入删除开销更大。红黑树在写多读少的场景中更优。",
                7,
            ),
        ],
    }


def _note_btree():
    return {
        "id": "f_btree",
        "title": "B树与B+树",
        "course_id": "course_cs_001",
        "note_type": "resource_import",
        "tags": [],
        "mastery": 68,
        "status": NoteStatus.ACTIVE,
        "blocks": [
            _block("bt1", NoteBlockType.HEADING, "B树与B+树", 1, {"level": 1}),
            _block("bt2", NoteBlockType.HEADING, "一、B树的定义", 2, {"level": 2}),
            _block(
                "bt3",
                NoteBlockType.PARAGRAPH,
                "B树是一种多路平衡搜索树，每个节点可以有多个关键字和子节点。m阶B树满足：每个节点最多m个子节点，除根外至少有⌈m/2⌉个子节点。",
                3,
            ),
            _block("bt4", NoteBlockType.HEADING, "二、B+树的特点", 4, {"level": 2}),
            _block(
                "bt5",
                NoteBlockType.PARAGRAPH,
                "B+树的所有数据存储在叶子节点，非叶子节点只存索引。叶子节点通过链表连接，支持高效的范围查询。MySQL的InnoDB引擎使用B+树作为索引结构。",
                5,
            ),
        ],
    }


def _note_tcp():
    return {
        "id": "f_tcp",
        "title": "TCP三次握手",
        "course_id": "course_net",
        "note_type": "quick_timeline",
        "tags": [],
        "mastery": 92,
        "status": NoteStatus.ACTIVE,
        "blocks": [
            _block("t1", NoteBlockType.HEADING, "TCP三次握手", 1, {"level": 1}),
            _block("t2", NoteBlockType.HEADING, "一、握手过程", 2, {"level": 2}),
            _block(
                "t3",
                NoteBlockType.PARAGRAPH,
                "第一次：客户端发送SYN=1, seq=x → 第二次：服务器回复SYN=1, ACK=1, seq=y, ack=x+1 → 第三次：客户端发送ACK=1, seq=x+1, ack=y+1。连接建立。",
                3,
            ),
            _block("t4", NoteBlockType.HEADING, "二、为什么是三次？", 4, {"level": 2}),
            _block(
                "t5",
                NoteBlockType.PARAGRAPH,
                "三次握手是为了防止已失效的连接请求到达服务器。如果只有两次握手，服务器收到失效的SYN后就会建立连接，浪费资源。第三次握手让服务器确认客户端确实想要连接。",
                5,
            ),
            _block("t6", NoteBlockType.HEADING, "三、四次挥手", 6, {"level": 2}),
            _block(
                "t7",
                NoteBlockType.PARAGRAPH,
                "断开连接需要四次挥手，因为TCP是全双工的：FIN→ACK, FIN→ACK。客户端和服务器各发送一次FIN，各回复一次ACK。",
                7,
            ),
        ],
    }


def _seed_thinking_feynman_sessions(db):
    # Seed a few thinking sessions
    thinking_data = [
        ("think_01", "f_limit", "理解极限的ε-δ定义", ThinkingSessionStatus.COMPLETED),
        ("think_02", "f_derivative", "掌握导数的几何意义", ThinkingSessionStatus.COMPLETED),
        ("think_03", "f_limit", "区分极限存在和连续的关系", ThinkingSessionStatus.COMPLETED),
        ("think_04", "note_process_thread", "理解进程和线程的区别", ThinkingSessionStatus.COMPLETED),
        ("think_05", "f_tcp", "理解TCP为什么需要三次握手", ThinkingSessionStatus.ACTIVE),
        ("think_06", "f_rbtree", "红黑树的旋转和变色过程", ThinkingSessionStatus.COMPLETED),
        ("think_07", "f_btree", "B+树vsB树的适用场景", ThinkingSessionStatus.COMPLETED),
        ("think_08", "f_deadlock", "死锁的四个条件推导", ThinkingSessionStatus.COMPLETED),
    ]
    for sid, note_id, goal, status in thinking_data:
        if db.get(ThinkingSessionModel, sid):
            continue
        db.add(ThinkingSessionModel(
            id=sid, owner_id=OWNER_ID, note_id=note_id, goal=goal, status=status,
        ))

    # Seed a few feynman sessions
    feynman_data = [
        ("feyn_01", "f_limit", "极限的直观理解", "极限就像一个侦探无限逼近真相但永远达不到...", FeynmanSessionStatus.EVALUATED),
        ("feyn_02", "f_derivative", "导数的几何意义", "导数就是切线的斜率，你可以想象...", FeynmanSessionStatus.EVALUATED),
        ("feyn_03", "note_process_thread", "进程vs线程", "进程就像一个独立的房子，线程就像是房子里的房间...", FeynmanSessionStatus.EVALUATED),
        ("feyn_04", "f_tcp", "三次握手", "TCP三次握手就像打电话：喂，听得到吗？...", FeynmanSessionStatus.EVALUATED),
        ("feyn_05", "f_rbtree", "红黑树的自平衡", "红黑树就像一个会自动调节的跷跷板...", FeynmanSessionStatus.EVALUATED),
        ("feyn_06", "f_memory_os", "虚拟内存", "虚拟内存就像图书馆的目录卡片...", FeynmanSessionStatus.EVALUATED),
        ("feyn_07", "f_deadlock", "死锁避免", "死锁就像两个人同时要过独木桥...", FeynmanSessionStatus.EVALUATED),
        ("feyn_08", "f_btree", "B+树索引", "B+树就像一本有目录和索引的书...", FeynmanSessionStatus.EVALUATED),
        ("feyn_09", "f_integral", "不定积分概念", "积分就像是把切好的薄片重新拼成一个整体...", FeynmanSessionStatus.EVALUATED),
        ("feyn_10", "f_limit", "ε-δ语言的通俗解释", "ε是你挑战我的精度，δ是我应战的武器...", FeynmanSessionStatus.EVALUATED),
        ("feyn_11", "note_process_thread", "并发与并行", "并发是同时处理多个任务，并行是同时执行多个任务...", FeynmanSessionStatus.EVALUATED),
        ("feyn_12", "f_tcp", "四次挥手", "四次挥手就像两个人互道晚安，各自确认后才挂电话...", FeynmanSessionStatus.EVALUATED),
    ]
    for sid, note_id, concept, explanation, status in feynman_data:
        if db.get(FeynmanSessionModel, sid):
            continue
        db.add(FeynmanSessionModel(
            id=sid, owner_id=OWNER_ID, note_id=note_id,
            concept_name=concept, explanation=explanation, status=status,
        ))
    db.flush()
    print(f"Seeded {len(thinking_data)} thinking + {len(feynman_data)} feynman sessions.")


def _seed_activities(db):
    activities = [
        ("act_01", DashboardTaskMode.MEMORY, "完成了 12 张记忆卡复习", "高等数学"),
        ("act_02", DashboardTaskMode.THINKING, "AI 追问了 3 个导数推导问题", "高等数学"),
        ("act_03", DashboardTaskMode.QUICK, "录制了 45 分钟课堂速记", "数据结构"),
        ("act_04", DashboardTaskMode.FEYNMAN, "完成牛顿定律费曼讲解", "大学物理"),
        ("act_05", DashboardTaskMode.QUICK, "导入 PDF 并生成结构化笔记", "操作系统"),
    ]
    for act_id, mode, action, course in activities:
        existing = db.get(LearningActivityModel, act_id)
        if existing:
            continue
        db.add(LearningActivityModel(
            id=act_id, owner_id=OWNER_ID, mode=mode, action=action, course_name=course,
        ))
    db.flush()
    print(f"Seeded {len(activities)} learning activities.")


def _seed_study_logs(db):
    from datetime import timedelta
    today = date.today()
    # 7 days of study logs with varied daily totals
    weekly_data = [
        # (day_offset, [(mode, minutes), ...])
        (-6, [(DashboardTaskMode.QUICK, 30), (DashboardTaskMode.MEMORY, 40), (DashboardTaskMode.THINKING, 50), (DashboardTaskMode.FEYNMAN, 30)]),  # Mon: ~2.5h
        (-5, [(DashboardTaskMode.QUICK, 45), (DashboardTaskMode.MEMORY, 50), (DashboardTaskMode.THINKING, 60), (DashboardTaskMode.FEYNMAN, 25)]),  # Tue: ~3.0h
        (-4, [(DashboardTaskMode.QUICK, 20), (DashboardTaskMode.MEMORY, 60), (DashboardTaskMode.THINKING, 40), (DashboardTaskMode.FEYNMAN, 20)]),  # Wed: ~2.3h
        (-3, [(DashboardTaskMode.QUICK, 50), (DashboardTaskMode.MEMORY, 45), (DashboardTaskMode.THINKING, 70), (DashboardTaskMode.FEYNMAN, 30)]),  # Thu: ~3.2h
        (-2, [(DashboardTaskMode.QUICK, 35), (DashboardTaskMode.MEMORY, 30), (DashboardTaskMode.THINKING, 55), (DashboardTaskMode.FEYNMAN, 40)]),  # Fri: ~2.7h
        (-1, [(DashboardTaskMode.QUICK, 20), (DashboardTaskMode.MEMORY, 35), (DashboardTaskMode.THINKING, 30), (DashboardTaskMode.FEYNMAN, 15)]),  # Sat: ~1.7h
        (0,  [(DashboardTaskMode.QUICK, 10), (DashboardTaskMode.MEMORY, 20), (DashboardTaskMode.THINKING, 20), (DashboardTaskMode.FEYNMAN, 10)]),  # Sun: ~1.0h
    ]
    for i, (offset, entries) in enumerate(weekly_data):
        for j, (mode, duration) in enumerate(entries):
            log_id = f"study_w{i}_{j}"
            if db.get(StudyLogModel, log_id):
                continue
            db.add(StudyLogModel(
                id=log_id, owner_id=OWNER_ID,
                log_date=today + timedelta(days=offset),
                mode=mode, duration_minutes=duration,
            ))
    db.flush()
    print(f"Seeded 7 days of study logs.")


def _card(cid, front, back, ctype, difficulty, source_note_id):
    tags = [f"type:{ctype}", f"difficulty:{difficulty}"]
    return {
        "id": cid,
        "source_note_id": source_note_id,
        "front": front,
        "back": back,
        "tags": tags,
        "status": MemoryCardStatus.ACTIVE,
    }


def _build_memory_cards():
    return [
        # ===== f_limit: 极限 =====
        _card("card_limit_01", "极限的ε-δ定义的核心思想是什么？", "对于任意给定的精度要求(ε)，总存在一个足够小的邻域(δ)，使函数值落在精度范围内。", "概念定义", "中等", "f_limit"),
        _card("card_limit_02", "lim(x→0) sin(x)/x 等于多少？", "等于 1。这是最重要的极限公式之一，也是证明导数公式的基础。", "填空卡片", "简单", "f_limit"),
        _card("card_limit_03", "极限存在和函数连续是什么关系？", "极限存在是连续的必要不充分条件。连续还需要极限值等于函数值。例如可去间断点，极限存在但函数值不等于极限值。", "辨析卡片", "中等", "f_limit"),
        _card("card_limit_04", "左极限和右极限都存在的函数，极限一定存在吗？", "不一定，左右极限必须相等极限才存在。如果左极限≠右极限，则函数在该点有跳跃间断点，极限不存在。", "辨析卡片", "困难", "f_limit"),
        _card("card_limit_05", "lim(x→∞) (1 + 1/x)^x 等于多少？", "等于 e（自然常数，约2.71828）。这是自然对数底数 e 的定义式。", "填空卡片", "中等", "f_limit"),

        # ===== f_derivative: 导数与微分 =====
        _card("card_deriv_01", "导数 f'(x₀) 的极限定义式是什么？", "f'(x₀) = lim(Δx→0) [f(x₀+Δx) - f(x₀)] / Δx", "填空卡片", "简单", "f_derivative"),
        _card("card_deriv_02", "导数在几何上表示什么？", "导数在几何上表示函数图像在该点的切线斜率，描述了函数在该点的瞬时变化率。", "概念定义", "简单", "f_derivative"),
        _card("card_deriv_03", "可导与连续的关系是什么？", "可导一定连续，但连续不一定可导。例如 y=|x| 在 x=0 处连续但不可导，因为左导数(-1)和右导数(+1)不相等。", "辨析卡片", "中等", "f_derivative"),
        _card("card_deriv_04", "微分 dy 和导数 f'(x) 的关系是什么？", "dy = f'(x)dx，即微分等于导数乘以自变量的微分。微分是函数增量的线性主部。", "概念定义", "中等", "f_derivative"),
        _card("card_deriv_05", "写出 (sinx)' 和 (eˣ)' 的结果", "(sinx)' = cosx，(eˣ)' = eˣ。指数函数的导数等于自身，这是最重要的求导公式之一。", "填空卡片", "简单", "f_derivative"),

        # ===== f_integral: 不定积分 =====
        _card("card_int_01", "∫xⁿdx 等于什么（n≠-1）？", "∫xⁿdx = xⁿ⁺¹/(n+1) + C，其中 C 为任意常数。", "填空卡片", "简单", "f_integral"),
        _card("card_int_02", "不定积分和导数的关系是什么？", "不定积分是求导的逆运算。如果 F'(x)=f(x)，则 ∫f(x)dx = F(x) + C。验证积分结果是否正确的方法就是对其求导。", "翻转问答", "中等", "f_integral"),
        _card("card_int_03", "第一换元积分法（凑微分法）的核心思想是什么？", "将被积函数凑成 f[φ(x)]φ'(x) 的形式，令 u=φ(x)，转化为 ∫f(u)du 后利用基本积分公式求解。", "概念定义", "困难", "f_integral"),
        _card("card_int_04", "第二换元积分法是什么？", "令 x=ψ(t)，将原积分转化为对新变量 t 的积分。常见的有三角换元（√(a²-x²)→x=asin t）和根式换元。", "概念定义", "困难", "f_integral"),
        _card("card_int_05", "∫(1/x)dx 和 ∫eˣdx 分别等于什么？", "∫(1/x)dx = ln|x| + C，∫eˣdx = eˣ + C。", "填空卡片", "简单", "f_integral"),

        # ===== note_a1b2c3d4e5f6: 高等数学 — 导数与微分笔记 =====
        _card("card_mathnote_01", "导数是描述函数什么性质的量？", "导数描述函数在某一点的变化率，反映函数值随自变量变化的快慢程度。", "概念定义", "简单", "note_a1b2c3d4e5f6"),
        _card("card_mathnote_02", "可导一定连续吗？反过来成立吗？", "可导一定连续，但连续不一定可导。连续是可导的必要不充分条件。反例：y=|x| 在 x=0 处连续但不可导。", "辨析卡片", "中等", "note_a1b2c3d4e5f6"),
        _card("card_mathnote_03", "常数函数 (C)' 和幂函数 (xⁿ)' 的导数公式是什么？", "(C)' = 0，(xⁿ)' = nxⁿ⁻¹。幂函数求导：指数下移成为系数，指数减1。", "填空卡片", "简单", "note_a1b2c3d4e5f6"),
        _card("card_mathnote_04", "导数和微分在几何意义上有什么区别？", "导数是切线的斜率（一个数值），微分 dy=f'(x)dx 是切线纵坐标的增量（一个线性近似量）。", "辨析卡片", "中等", "note_a1b2c3d4e5f6"),
        _card("card_mathnote_05", "如何用导数判断函数的单调性？", "在区间I上，若 f'(x)>0 则函数单调递增；若 f'(x)<0 则函数单调递减；若 f'(x)=0 则可能是极值点（需进一步判断）。", "翻转问答", "中等", "note_a1b2c3d4e5f6"),

        # ===== f_rbtree: 红黑树 =====
        _card("card_rb_01", "红黑树的五个性质是什么？", "1.节点是红色或黑色 2.根节点是黑色 3.叶子节点(NIL)是黑色 4.红色节点的子节点必须是黑色 5.从任一节点到每个叶子的路径包含相同数量的黑色节点。", "概念定义", "困难", "f_rbtree"),
        _card("card_rb_02", "红黑树的查找、插入、删除时间复杂度是多少？", "均为 O(log n)。红黑树通过旋转和变色维持近似平衡，确保树高不超过 2log(n+1)。", "填空卡片", "中等", "f_rbtree"),
        _card("card_rb_03", "红黑树与AVL树的主要区别是什么？", "AVL树更严格平衡（任意节点左右子树高度差≤1），查找更快但插入删除开销更大（需要更多旋转）。红黑树牺牲部分平衡性换取更少的旋转操作，适合写多读少的场景。", "辨析卡片", "中等", "f_rbtree"),
        _card("card_rb_04", "红黑树如何维持平衡？", "通过旋转（左旋/右旋）和变色（红变黑/黑变红）两种操作，在插入和删除后修复被破坏的红黑性质，维持近似平衡。", "翻转问答", "困难", "f_rbtree"),
        _card("card_rb_05", "为什么红黑树的根节点必须是黑色？", "如果根节点是红色，且根据性质4红色节点的子节点必须是黑色，那么从根到叶子的黑节点数量在不同的子树可能不同，违反性质5。黑色根节点保证了黑色高度的一致性。", "辨析卡片", "中等", "f_rbtree"),

        # ===== f_btree: B树与B+树 =====
        _card("card_bt_01", "m阶B树满足什么条件？", "每个节点最多m个子节点；除根外每个非叶节点至少有⌈m/2⌉个子节点；所有叶子节点在同一层。", "概念定义", "困难", "f_btree"),
        _card("card_bt_02", "B+树和B树的核心区别是什么？", "B+树的所有数据存储在叶子节点，非叶子节点只存索引；叶子节点通过链表连接，支持高效的范围查询。MySQL的InnoDB引擎使用B+树。", "辨析卡片", "中等", "f_btree"),
        _card("card_bt_03", "为什么数据库索引常用B+树而不是二叉搜索树？", "B+树是多路搜索树，每个节点可存多个key，树高远低于二叉搜索树，减少了磁盘I/O次数。同时叶子节点链表使得范围查询非常高效。", "翻转问答", "中等", "f_btree"),
        _card("card_bt_04", "B+树的范围查询为什么高效？", "因为所有叶子节点通过指针连接成有序链表，找到起始key后，只需沿着链表顺序遍历即可获取范围内所有数据，不需要反复从根节点查找。", "概念定义", "中等", "f_btree"),
        _card("card_bt_05", 'B树的"阶"(m)对性能有什么影响？', "m越大，树越矮，磁盘I/O次数越少，但每个节点的搜索时间增加（需在更多key中二分查找）。通常根据磁盘页大小选择m，使一个节点恰好占一个磁盘页。", "翻转问答", "困难", "f_btree"),

        # ===== note_f6e5d4c3b2a1: 数据结构 — 链表与树 =====
        _card("card_dsnote_01", "链表和数组的主要优缺点分别是什么？", "数组：随机访问O(1)，插入删除O(n)，需要连续内存。链表：插入删除O(1)（已知位置），随机访问O(n)，不需要连续内存。", "辨析卡片", "简单", "note_f6e5d4c3b2a1"),
        _card("card_dsnote_02", "什么是二叉搜索树（BST）？", "对任意节点，左子树所有节点值 < 该节点值 < 右子树所有节点值。中序遍历BST得到有序序列。插入/查找/删除平均O(log n)，最坏退化为链表O(n)。", "概念定义", "简单", "note_f6e5d4c3b2a1"),
        _card("card_dsnote_03", "什么是树的高度和深度？", "节点深度：从根到该节点的边数。节点高度：从该节点到最深叶子的边数。树的高度=根节点的高度。", "概念定义", "简单", "note_f6e5d4c3b2a1"),
        _card("card_dsnote_04", "单向链表和双向链表有什么区别？", "单向链表每个节点只有next指针，只能单向遍历。双向链表有next和prev两个指针，可双向遍历，删除给定节点时不需要遍历找前驱，但每个节点多占一个指针空间。", "辨析卡片", "中等", "note_f6e5d4c3b2a1"),
        _card("card_dsnote_05", "链表反转的基本思路是什么？", "遍历链表，用三个指针prev、curr、next，每次将curr.next指向prev，然后prev、curr、next依次后移一步。时间复杂度O(n)，空间复杂度O(1)。", "翻转问答", "中等", "note_f6e5d4c3b2a1"),

        # ===== note_process_thread: 进程与线程 =====
        _card("card_proc_01", "进程和线程的核心区别是什么？", "进程是资源分配的基本单位，拥有独立地址空间；线程是CPU调度的基本单位，同一进程内的线程共享内存和文件，但拥有独立的栈和寄存器。", "概念定义", "中等", "note_process_thread"),
        _card("card_proc_02", "进程的五种状态是哪些？", "创建(New)→就绪(Ready)等待CPU→运行(Running)正在执行→阻塞(Blocked)等待I/O等事件→终止(Terminated)。", "填空卡片", "中等", "note_process_thread"),
        _card("card_proc_03", "为什么线程切换比进程切换更快？", "线程共享进程的虚拟地址空间，切换时无需更换页表和完整上下文，只需切换寄存器和栈指针。进程切换需要保存完整上下文。", "翻转问答", "中等", "note_process_thread"),
        _card("card_proc_04", "多线程共享哪些资源？独立拥有哪些资源？", "共享：代码段、堆内存、文件描述符、全局变量。独立：栈空间、程序计数器(PC)、寄存器状态。", "填空卡片", "中等", "note_process_thread"),
        _card("card_proc_05", "IPC（进程间通信）有哪些常见方式？", "管道(pipe)、消息队列、共享内存（最快）、信号量、Socket。共享内存由于不需要内核空间和用户空间的数据拷贝，性能最高。", "翻转问答", "困难", "note_process_thread"),

        # ===== f_memory_os: 内存管理 =====
        _card("card_mem_01", "虚拟内存的核心作用是什么？", "使每个进程拥有独立的虚拟地址空间，通过页表映射到物理地址。实现了进程间内存隔离，同时让进程可以使用超过物理内存大小的空间。", "概念定义", "中等", "f_memory_os"),
        _card("card_mem_02", "分页和分段的主要区别是什么？", "分页：固定大小的页框，对程序员透明，提高内存利用率。分段：按逻辑单元划分（代码段/数据段），大小可变，符合程序逻辑视角。现代系统多采用段页式结合。", "辨析卡片", "困难", "f_memory_os"),
        _card("card_mem_03", "FIFO和LRU页面置换算法有什么区别？", "FIFO选择最早进入内存的页面置换（简单但可能有Belady异常）。LRU选择最近最久未使用的页面置换（效果好但实现复杂）。Clock算法是LRU的近似，实际系统最常用。", "辨析卡片", "困难", "f_memory_os"),
        _card("card_mem_04", "什么是页表？它的作用是什么？", "页表是虚拟地址到物理地址的映射表。CPU发出虚拟地址→MMU查页表→得到物理地址→访问内存。每个进程有独立的页表，保证地址空间隔离。", "概念定义", "中等", "f_memory_os"),
        _card("card_mem_05", "什么是缺页中断（Page Fault）？", "当进程访问的虚拟页面不在物理内存中时，触发缺页中断。操作系统从磁盘调入所需页面，更新页表，然后重新执行引发缺页的指令。这是实现虚拟内存的关键机制。", "翻转问答", "困难", "f_memory_os"),

        # ===== f_deadlock: 死锁问题 =====
        _card("card_dl_01", "死锁的四个必要条件是什么？", "互斥条件、请求与保持条件、不可剥夺条件、循环等待条件。四个条件必须同时满足才会发生死锁。", "填空卡片", "中等", "f_deadlock"),
        _card("card_dl_02", "银行家算法如何避免死锁？", "在进行资源分配前，先模拟判断分配后系统是否仍处于安全状态（存在一个安全序列使所有进程都能完成）。如果导致不安全状态，则拒绝此次分配。", "翻转问答", "困难", "f_deadlock"),
        _card("card_dl_03", "死锁预防和死锁避免有什么区别？", "死锁预防：静态破坏四个必要条件之一（如一次性分配），资源利用率低。死锁避免：运行时动态判断每次分配的安全性（如银行家算法），资源利用率更高。", "辨析卡片", "困难", "f_deadlock"),
        _card("card_dl_04", "如何从死锁中恢复？", "1.进程终止：终止所有死锁进程或逐个终止直到解开死锁环 2.资源抢占：从某些进程中抢占资源分配给其他进程，被抢占的进程回滚。代价都比较大，预防和避免优先级更高。", "翻转问答", "困难", "f_deadlock"),
        _card("card_dl_05", "什么是活锁（Livelock）？它和死锁有什么区别？", "活锁中进程没有阻塞，但不断重复相同的操作却无法推进（如两人在走廊互相让路却总是让到同一侧）。死锁是进程阻塞等待，活锁是进程活跃但空转。", "辨析卡片", "中等", "f_deadlock"),

        # ===== f_tcp: TCP三次握手 =====
        _card("card_tcp_01", "TCP三次握手的过程是什么？", "第一次：客户端 SYN=1, seq=x → 第二次：服务器 SYN=1, ACK=1, seq=y, ack=x+1 → 第三次：客户端 ACK=1, ack=y+1。连接建立。", "概念定义", "中等", "f_tcp"),
        _card("card_tcp_02", "为什么TCP握手是三次而不是两次？", "防止已失效的连接请求到达服务器。如果两次握手，服务器收到旧的SYN后会直接建立连接浪费资源。第三次握手让服务器确认客户端确实想要连接。", "翻转问答", "中等", "f_tcp"),
        _card("card_tcp_03", "TCP四次挥手的过程是什么？", "1.客户端FIN 2.服务器ACK 3.服务器FIN 4.客户端ACK。需要四次因为TCP是全双工的，双方需独立关闭各自的发送方向。", "概念定义", "中等", "f_tcp"),
        _card("card_tcp_04", "TIME_WAIT状态为什么等待2MSL？", "1.确保最后的ACK能到达服务器 2.让旧连接的所有报文在网络中消失，避免影响新连接。2MSL通常为2-4分钟。", "翻转问答", "困难", "f_tcp"),
        _card("card_tcp_05", "TCP如何保证可靠传输？", "通过序列号（保证有序）、确认应答（ACK保证不丢）、超时重传（保证送达）、流量控制（滑动窗口防止接收方溢出）、拥塞控制（防止网络过载）。", "概念定义", "中等", "f_tcp"),

        # ===== note_1a2b3c4d5e6f: 物理 — 牛顿运动定律 =====
        _card("card_newton_01", "牛顿第一定律（惯性定律）的内容是什么？", "物体在没有外力作用（或合外力为零）时，会保持静止或匀速直线运动状态。质量是物体惯性的量度。", "概念定义", "简单", "note_1a2b3c4d5e6f"),
        _card("card_newton_02", "牛顿第二定律的数学表达式是什么？", "F = ma（或 ΣF = ma）。力是使物体产生加速度的原因，加速度与力成正比、与质量成反比。", "填空卡片", "简单", "note_1a2b3c4d5e6f"),
        _card("card_newton_03", "牛顿第三定律的内容是什么？", "作用力与反作用力大小相等、方向相反、作用在同一直线上，分别作用在两个不同物体上。它们同时产生、同时消失，不能互相抵消。", "概念定义", "简单", "note_1a2b3c4d5e6f"),
        _card("card_newton_04", "作用力与反作用力和平衡力的区别是什么？", "平衡力作用在同一物体上可以抵消；作用力与反作用力作用在不同物体上，不能互相抵消。", "辨析卡片", "中等", "note_1a2b3c4d5e6f"),
        _card("card_newton_05", "什么是惯性参考系？为什么它很重要？", "牛顿第一定律成立的参考系称为惯性参考系。只有惯性系中牛顿定律才成立。地球近似为惯性系（自转效应在大多数问题中可忽略）。", "翻转问答", "中等", "note_1a2b3c4d5e6f"),
    ]


if __name__ == "__main__":
    seed()
