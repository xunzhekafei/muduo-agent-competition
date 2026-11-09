"""操作系统「进程与线程」主题演示账号初始化（录视频用，幂等，可重复跑）。

做什么：
  1. 确保专用演示账号存在（demo@muduo.local / 「演示同学」），并把密码重置为已知值
  2. 围绕「进程与线程」主题补齐课程 / 笔记 / 记忆卡 / 费曼 / 思考 / 活动 / 学习日志
  3. 建知识库索引（笔记分块 → 向量化），保证 RAG 开箱可用
  4. 登录自检 + 数据规模汇总

用法（在 backend 目录下）：
  python scripts/seed_demo_os.py                 # 默认密码 demo123456
  DEMO_PASSWORD=xxxx python scripts/seed_demo_os.py

注意：seed 固定读写 ./muduo_dev.sqlite3，请从 backend 目录运行本脚本。
"""

from __future__ import annotations

import os
import pathlib
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BACKEND = pathlib.Path(__file__).resolve().parents[1]
os.chdir(BACKEND)
sys.path.insert(0, str(BACKEND))

DEMO_EMAIL = "demo@muduo.local"
DEMO_NAME = "演示同学"
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "demo123456")
DEMO_USER_ID = "user_demo_os"

COURSE_ID = "course_os_demo"

# 主题笔记 ID（固定，保证幂等）
N_PROCESS_THREAD = "demo_process_thread"
N_SCHEDULING = "demo_scheduling"
N_SYNC = "demo_sync"
N_DEADLOCK = "demo_deadlock"
N_IPC = "demo_ipc"
N_MEMORY = "demo_memory"


def utc_now():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc)


def main() -> None:
    import app.db.models  # noqa: F401 —— 注册全部模型，保证外键可解析
    from sqlalchemy import func, select

    from app.core.security import hash_password, verify_password
    from app.db.session import get_session_factory
    from app.modules.courses.models import CourseModel
    from app.modules.feynman.models import FeynmanSessionModel
    from app.modules.memory.models import MemoryCardModel
    from app.modules.notes.models import NoteModel
    from app.modules.thinking.models import ThinkingSessionModel
    from app.modules.users.models import UserModel, UserPreferenceModel

    db = get_session_factory()()
    try:
        # ---- 1. 专用演示账号 ----
        user = db.get(UserModel, DEMO_USER_ID)
        if user is None:
            user = UserModel(
                id=DEMO_USER_ID,
                name=DEMO_NAME,
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
            db.flush()
            db.add(UserPreferenceModel(user_id=DEMO_USER_ID))
            print(f"[账号] 已创建演示账号 {DEMO_EMAIL}（昵称：{DEMO_NAME}）")
        else:
            user.name = DEMO_NAME
            user.email = DEMO_EMAIL
            user.password_hash = hash_password(DEMO_PASSWORD)
            print(f"[账号] 演示账号已存在，密码已重置（{DEMO_EMAIL}）")
        db.commit()

        # ---- 2. 课程 ----
        _ensure_course(db)

        # ---- 3. 笔记 ----
        _ensure_notes(db)

        # ---- 4. 记忆卡 ----
        _ensure_memory_cards(db)

        # ---- 5. 费曼 + 思考会话 ----
        _ensure_feynman_thinking(db)

        # ---- 6. 活动 + 学习日志 ----
        _ensure_activities(db)
        _ensure_study_logs(db)

        # ---- 7. 社区共享资产 ----
        _ensure_shared_assets(db)

        db.commit()

        # ---- 8. 知识库索引 ----
        from app.modules.knowledge_base.indexer import index_all_notes

        stats = index_all_notes(db, DEMO_USER_ID)
        print(f"[知识库] 索引完成：{stats['notes']} 篇笔记 → {stats['chunks']} 个知识块"
              f"（其中 {stats['embedded']} 个已向量化）")

        # ---- 9. 登录自检 ----
        fresh = db.get(UserModel, DEMO_USER_ID)
        ok = verify_password(DEMO_PASSWORD, fresh.password_hash)
        print(f"[自检] 登录密码校验：{'通过' if ok else '失败！请检查 DEMO_PASSWORD'}")

        # ---- 汇总 ----
        note_count = db.execute(
            select(func.count()).select_from(NoteModel).where(
                NoteModel.owner_id == DEMO_USER_ID, NoteModel.deleted_at.is_(None)
            )
        ).scalar_one()
        cards = db.execute(
            select(func.count()).select_from(MemoryCardModel).where(
                MemoryCardModel.owner_id == DEMO_USER_ID
            )
        ).scalar_one()
        feynman = db.execute(
            select(func.count()).select_from(FeynmanSessionModel).where(
                FeynmanSessionModel.owner_id == DEMO_USER_ID
            )
        ).scalar_one()
        thinking = db.execute(
            select(func.count()).select_from(ThinkingSessionModel).where(
                ThinkingSessionModel.owner_id == DEMO_USER_ID
            )
        ).scalar_one()

        print("\n========== 演示环境就绪 ==========")
        print(f"登录邮箱：{DEMO_EMAIL}")
        print(f"登录密码：{DEMO_PASSWORD}")
        print(f"昵称：{DEMO_NAME}（匿名合规）")
        print(f"数据规模：1 门课 / {note_count} 篇笔记 / {cards} 张记忆卡 / "
              f"{feynman} 次费曼练习 / {thinking} 次思考练习")
        print("主题：操作系统 · 进程与线程（进程 / 线程 / 调度 / 同步 / 死锁 / IPC）")
    finally:
        db.close()


# --------------------------------------------------------------------------- #
#  课程                                                                        #
# --------------------------------------------------------------------------- #


def _ensure_course(db) -> None:
    from app.modules.courses.models import CourseModel

    if db.get(CourseModel, COURSE_ID):
        return
    db.add(
        CourseModel(
            id=COURSE_ID,
            owner_id=DEMO_USER_ID,
            name="操作系统",
            subject="计算机科学",
            description="进程与线程、调度、同步与互斥、死锁、进程间通信等核心概念",
        )
    )
    db.flush()
    print("[课程] 已创建「操作系统」课程")


# --------------------------------------------------------------------------- #
#  笔记                                                                        #
# --------------------------------------------------------------------------- #


def _block(bid, block_type, content, position, metadata=None):
    return {
        "id": bid,
        "block_type": block_type,
        "content": content,
        "position": position,
        "block_metadata": metadata or {},
    }


def _ensure_notes(db) -> None:
    from app.modules.notes.models import NoteBlockModel, NoteModel
    from app.schemas.enums import NoteStatus

    for nd in _build_notes():
        if db.get(NoteModel, nd["id"]):
            continue
        note = NoteModel(
            id=nd["id"],
            owner_id=DEMO_USER_ID,
            title=nd["title"],
            course_id=COURSE_ID,
            note_type=nd.get("note_type", "manual"),
            status=NoteStatus.ACTIVE,
            mastery=nd.get("mastery"),
            tags=nd.get("tags", []),
        )
        db.add(note)
        db.flush()
        for i, bd in enumerate(nd.get("blocks", [])):
            db.add(
                NoteBlockModel(
                    id=bd["id"],
                    note_id=nd["id"],
                    block_type=bd["block_type"],
                    content=bd["content"],
                    position=bd.get("position", i),
                    block_metadata=bd.get("block_metadata", {}),
                )
            )
    db.flush()
    print(f"[笔记] 已创建 {len(_build_notes())} 篇主题笔记")


def _build_notes():
    from app.schemas.enums import NoteBlockType as B

    return [
        _note_process_thread(B),
        _note_scheduling(B),
        _note_sync(B),
        _note_deadlock(B),
        _note_ipc(B),
        _note_memory(B),
    ]


def _note_process_thread(B):
    return {
        "id": N_PROCESS_THREAD,
        "title": "进程与线程",
        "note_type": "thinking",
        "tags": ["核心概念", "面试重点"],
        "mastery": 85,
        "blocks": [
            _block("vpt1", B.HEADING, "进程与线程", 1, {"level": 1}),
            _block("vpt2", B.HEADING, "一、进程（Process）", 2, {"level": 2}),
            _block(
                "vpt3",
                B.PARAGRAPH,
                "进程是操作系统进行资源分配和调度的基本单位。每个进程拥有独立的地址空间、PCB（进程控制块）、打开的文件描述符和 CPU 运行状态。进程是程序的一次动态执行实例：程序是静态的代码，进程是运行中的程序。",
                3,
                {"highlights": ["资源分配", "独立地址空间", "PCB"]},
            ),
            _block("vpt4", B.HEADING, "进程的五状态模型", 4, {"level": 3}),
            _block(
                "vpt5",
                B.PARAGRAPH,
                "进程在生命周期中会在五种状态之间切换：创建（New）→ 就绪（Ready）→ 运行（Running）→ 阻塞（Blocked）→ 终止（Terminated）。状态切换由调度器根据 I/O 请求、时间片耗尽、优先级抢占等事件触发。",
                5,
            ),
            _block("vpt6", B.HEADING, "二、线程（Thread）", 6, {"level": 2}),
            _block(
                "vpt7",
                B.PARAGRAPH,
                "线程是 CPU 调度的最小单位。同一进程中的线程共享地址空间、堆内存、文件资源和代码段，但拥有独立的栈空间、程序计数器和寄存器状态。这种共享机制使线程间通信成本远低于进程间通信（IPC）。",
                7,
                {"highlights": ["CPU 调度", "共享内存", "独立栈"]},
            ),
            _block("vpt8", B.HEADING, "三、进程与线程的核心区别", 8, {"level": 2}),
            _block(
                "vpt9",
                B.TABLE,
                "",
                9,
                {
                    "headers": ["对比维度", "进程", "线程"],
                    "rows": [
                        ["资源拥有", "独立地址空间和资源", "共享进程资源"],
                        ["调度单位", "资源分配的基本单位", "CPU 调度的基本单位"],
                        ["切换开销", "大（需切换虚拟内存空间）", "小（仅切换寄存器和栈）"],
                        ["通信方式", "IPC（管道/消息队列/共享内存）", "直接读写共享内存"],
                        ["创建销毁", "慢，需分配 PCB 和地址空间", "快，只需分配栈和 TCB"],
                        ["独立性", "进程间相互隔离", "同一进程内线程互相影响"],
                    ],
                },
            ),
            _block("vpt10", B.HEADING, "四、为什么线程切换更快？", 10, {"level": 2}),
            _block(
                "vpt11",
                B.AI_SUMMARY,
                "线程切换无需切换整个虚拟内存空间。进程切换时，CPU 需要保存当前进程的完整上下文（页表、地址空间、打开文件等），再加载新进程的上下文。而同一进程内的线程共享地址空间，切换时只需保存和恢复寄存器状态与栈指针，因此上下文切换成本远低于进程切换。这也是为什么高并发服务（如 Nginx、Node.js）倾向使用多线程/协程模型。",
                11,
            ),
            _block("vpt12", B.HEADING, "五、思考链 — AI 引导推导", 12, {"level": 2}),
            _block(
                "vpt13",
                B.THINKING,
                "为什么多线程程序更容易产生并发问题？",
                13,
                {
                    "question": "为什么多线程程序更容易产生并发问题？",
                    "userAnswer": "因为多个线程共享同一块内存区域，当多个线程同时读写同一个变量时，如果没有同步机制，就会产生数据竞争。",
                    "aiFollowUp": "共享资源具体会导致哪两类典型问题？你能分别举例吗？",
                    "userAnswer2": "竞态条件（Race Condition）：两个线程同时修改一个计数器，最终结果取决于执行顺序。死锁（Deadlock）：线程 A 持有锁 1 等锁 2，线程 B 持有锁 2 等锁 1，互相等待。",
                    "aiFeedback": "正确。补充一点：除了竞态和死锁，还有活锁（Livelock）和饥饿（Starvation）。建议在复习中对比这四种并发问题的区别。",
                },
            ),
            _block("vpt14", B.HEADING, "六、AI 自动生成记忆卡片", 14, {"level": 2}),
            _block(
                "vpt15",
                B.MEMORY_CARDS,
                "",
                15,
                {
                    "cards": [
                        {
                            "q": "进程和线程的核心区别是什么？",
                            "a": "进程是资源分配的基本单位，拥有独立地址空间；线程是 CPU 调度的基本单位，共享进程资源。",
                        },
                        {
                            "q": "为什么线程切换比进程切换更快？",
                            "a": "线程共享进程的虚拟内存空间，切换时无需更换页表和完整上下文，只需切换寄存器和栈。",
                        },
                        {
                            "q": "多线程共享哪些资源？独立拥有哪些资源？",
                            "a": "共享：代码段、堆内存、文件描述符、全局变量。独立：栈空间、程序计数器、寄存器状态。",
                        },
                    ]
                },
            ),
            _block("vpt16", B.HEADING, "七、相关概念", 16, {"level": 2}),
            _block(
                "vpt17",
                B.RELATIONS,
                "",
                17,
                {
                    "items": [
                        {"label": "前置依赖", "target": "内存管理", "reason": "理解进程地址空间需要内存管理基础知识"},
                        {"label": "后续延伸", "target": "线程同步与互斥", "reason": "多线程并发是同步与互斥问题的前置场景"},
                        {"label": "后续延伸", "target": "死锁问题", "reason": "多线程竞争资源是死锁的诱因"},
                    ]
                },
            ),
        ],
    }


def _note_scheduling(B):
    return {
        "id": N_SCHEDULING,
        "title": "进程调度算法",
        "note_type": "manual",
        "tags": ["调度", "核心概念"],
        "mastery": 70,
        "blocks": [
            _block("vsc1", B.HEADING, "进程调度算法", 1, {"level": 1}),
            _block("vsc2", B.HEADING, "一、调度的时机", 2, {"level": 2}),
            _block(
                "vsc3",
                B.PARAGRAPH,
                "调度发生在：进程从运行态转到阻塞态（I/O 请求）、进程从运行态转到就绪态（时间片用完）、进程从阻塞态转到就绪态（I/O 完成）、进程终止。其中时间片耗尽引发的调度是抢占式调度的核心。",
                3,
            ),
            _block("vsc4", B.HEADING, "二、经典算法", 4, {"level": 2}),
            _block(
                "vsc5",
                B.PARAGRAPH,
                "FCFS（先来先服务）：按到达顺序执行，简单但可能产生「长作业饿死短作业」。SJF（短作业优先）：优先执行运行时间最短的进程，平均等待时间最优，但需要预知运行时间。RR（时间片轮转）：每个进程轮流执行一个固定时间片，适合交互式系统。优先级调度：按优先级分配 CPU，可能产生饥饿，用「老化」技术缓解。",
                5,
            ),
            _block("vsc6", B.HEADING, "三、多级反馈队列（MLFQ）", 6, {"level": 2}),
            _block(
                "vsc7",
                B.PARAGRAPH,
                "多级反馈队列把多个优先级不同的就绪队列串起来：新进程进入最高优先级队列，时间片短；用完了时间片还没执行完就降到下一级队列，时间片变长。这样既能让短任务快速完成（类似 SJF），又能逐步识别长任务（类似 FCFS），是现代操作系统实际采用的方式。",
                7,
            ),
            _block(
                "vsc8",
                B.AI_SUMMARY,
                "调度算法在「吞吐量、平均等待时间、响应时间、公平性」之间权衡。FCFS 简单公平但短作业受害；SJF 平均等待时间最优但难预测；RR 响应快但切换开销大；MLFQ 结合了 SJF 的短任务优先和 RR 的交互性，是 Linux/Windows 等系统调度器的思想基础。",
                8,
            ),
            _block(
                "vsc9",
                B.TABLE,
                "",
                9,
                {
                    "headers": ["算法", "优点", "缺点"],
                    "rows": [
                        ["FCFS", "实现简单、公平", "短作业被长作业阻塞（护航效应）"],
                        ["SJF", "平均等待时间最优", "需预知运行时间，长作业可能饿死"],
                        ["RR", "响应快、公平", "时间片大小难权衡，切换开销"],
                        ["优先级", "能保证重要任务", "低优先级可能饿死，需老化"],
                        ["MLFQ", "兼顾长短任务、交互性好", "参数调优复杂"],
                    ],
                },
            ),
        ],
    }


def _note_sync(B):
    return {
        "id": N_SYNC,
        "title": "线程同步与互斥",
        "note_type": "manual",
        "tags": ["并发", "同步"],
        "mastery": 62,
        "blocks": [
            _block("vsy1", B.HEADING, "线程同步与互斥", 1, {"level": 1}),
            _block("vsy2", B.HEADING, "一、竞态条件（Race Condition）", 2, {"level": 2}),
            _block(
                "vsy3",
                B.PARAGRAPH,
                "当多个线程同时读写同一个共享变量，而最终结果取决于线程的执行顺序时，就产生了竞态条件。例如两个线程同时执行 count++（读取-加一-写回三步），可能丢失一次加一。解决竞态的根本办法是让临界区互斥。",
                3,
                {"highlights": ["竞态条件", "临界区互斥"]},
            ),
            _block("vsy4", B.HEADING, "二、互斥锁（Mutex）", 4, {"level": 2}),
            _block(
                "vsy5",
                B.PARAGRAPH,
                "互斥锁保证同一时刻只有一个线程进入临界区：进入前加锁（lock），离开后解锁（unlock）。被阻塞的线程进入睡眠，不占用 CPU，适合临界区较长的场景。自旋锁（spinlock）则让线程忙等，适合临界区极短的场景，避免了上下文切换开销。",
                5,
            ),
            _block("vsy6", B.HEADING, "三、信号量（Semaphore）", 6, {"level": 2}),
            _block(
                "vsy7",
                B.PARAGRAPH,
                "信号量是一个整数计数器，支持 P（wait，减一）和 V（signal，加一）两个原子操作。计数信号量可用于控制同时访问某资源的最大线程数（如连接池）；二元信号量（0/1）等价于互斥锁。信号量既能互斥，也能做「生产者-消费者」式的同步。",
                7,
            ),
            _block("vsy8", B.HEADING, "四、条件变量与生产者-消费者", 8, {"level": 2}),
            _block(
                "vsy9",
                B.PARAGRAPH,
                "条件变量让线程在某个条件不满足时等待（wait），条件满足时被唤醒（signal/broadcast），必须配合互斥锁使用。经典的生产者-消费者问题：生产者往缓冲区放数据，消费者取数据，用「缓冲区不满」和「缓冲区不空」两个条件协调双方，避免生产者溢出或消费者空转。",
                9,
            ),
            _block("vsy10", B.HEADING, "五、思考链 — 信号量 vs 互斥锁", 10, {"level": 2}),
            _block(
                "vsy11",
                B.THINKING,
                "信号量和互斥锁都能保护共享资源，它们的本质区别是什么？",
                11,
                {
                    "question": "信号量和互斥锁都能保护共享资源，它们的本质区别是什么？",
                    "userAnswer": "互斥锁只允许一个线程进入临界区，信号量可以允许多个线程同时访问。",
                    "aiFollowUp": "从「谁加锁、谁解锁」的角度再想想：互斥锁和信号量有什么区别？",
                    "userAnswer2": "互斥锁要求同一个线程加锁和解锁；信号量允许一个线程 P、另一个线程 V。",
                    "aiFeedback": "对。互斥锁是「所有权」语义，谁加锁谁解锁；信号量是「计数」语义，V 操作可以由别的线程发起。所以信号量除了互斥，还能实现线程间的先后顺序同步，这是互斥锁做不到的。",
                },
            ),
        ],
    }


def _note_deadlock(B):
    return {
        "id": N_DEADLOCK,
        "title": "死锁问题",
        "note_type": "thinking",
        "tags": ["并发", "面试重点"],
        "mastery": 45,
        "blocks": [
            _block("vdl1", B.HEADING, "死锁问题", 1, {"level": 1}),
            _block("vdl2", B.HEADING, "一、死锁的定义", 2, {"level": 2}),
            _block(
                "vdl3",
                B.PARAGRAPH,
                "死锁是指两个或多个进程/线程互相等待对方释放资源，导致所有参与者都无法继续执行的状态。经典例子：线程 A 持有锁 1 请求锁 2，线程 B 持有锁 2 请求锁 1，二者永久僵持。",
                3,
            ),
            _block("vdl4", B.HEADING, "二、四个必要条件", 4, {"level": 2}),
            _block(
                "vdl5",
                B.PARAGRAPH,
                "① 互斥条件：资源同一时刻只能被一个进程占用。② 请求与保持条件：进程已持有资源，又去请求新资源且不释放已持有的。③ 不可剥夺条件：已分配的资源不能被强制抢占。④ 循环等待条件：存在进程-资源的循环等待链。四个条件必须同时满足才会发生死锁，缺一不可。",
                5,
                {"highlights": ["互斥", "请求与保持", "不可剥夺", "循环等待"]},
            ),
            _block("vdl6", B.HEADING, "三、处理策略", 6, {"level": 2}),
            _block(
                "vdl7",
                B.PARAGRAPH,
                "死锁预防：静态地破坏四个必要条件之一（如一次性申请所有资源、资源有序申请），代价是资源利用率低。死锁避免：运行时动态判断每次分配是否会让系统进入不安全状态，代表算法是银行家算法。死锁检测与恢复：允许死锁发生，周期性检测环路，再通过终止进程或抢占资源来恢复。",
                7,
            ),
            _block("vdl8", B.HEADING, "四、银行家算法", 8, {"level": 2}),
            _block(
                "vdl9",
                B.PARAGRAPH,
                "银行家算法在每次分配资源前，模拟「分配后是否存在一个安全序列让所有进程都能完成」。如果存在，则分配是安全的；否则拒绝此次分配。它要求预先声明每个进程的最大资源需求，因此在真实系统中较少使用，更多用于教学。",
                9,
            ),
            _block("vdl10", B.HEADING, "五、活锁与饥饿", 10, {"level": 2}),
            _block(
                "vdl11",
                B.PARAGRAPH,
                "活锁（Livelock）：进程没有阻塞，但不断重复相同操作却无法推进，如两个人在走廊互相让路却总让到同一侧。饥饿（Starvation）：低优先级进程长期得不到 CPU 或资源。三者区别：死锁是「大家都停着」，活锁是「大家空转」，饥饿是「有人一直抢不到」。",
                11,
            ),
            _block("vdl12", B.HEADING, "六、思考链 — 四个条件为什么缺一不可", 12, {"level": 2}),
            _block(
                "vdl13",
                B.THINKING,
                "如果破坏「循环等待」这个条件，为什么死锁就一定不会发生？",
                13,
                {
                    "question": "如果破坏「循环等待」这个条件，为什么死锁就一定不会发生？",
                    "userAnswer": "因为死锁的表现形式就是一组进程形成等待环，如果不存在环，就不会有互相等待。",
                    "aiFollowUp": "那「资源有序申请」是如何破坏循环等待的？",
                    "userAnswer2": "给所有资源编号，进程必须按编号递增的顺序申请资源。这样后申请的资源编号总是更大，不可能形成环。",
                    "aiFeedback": "很好。资源有序分配法正是靠「所有进程都按同一顺序申请资源」来保证不会出现「A 等 B 的资源、B 又等 A 的资源」这样的环。这是死锁预防里代价相对较小的一种。",
                },
            ),
        ],
    }


def _note_ipc(B):
    return {
        "id": N_IPC,
        "title": "进程间通信 IPC",
        "note_type": "manual",
        "tags": ["IPC", "核心概念"],
        "mastery": 55,
        "blocks": [
            _block("vip1", B.HEADING, "进程间通信 IPC", 1, {"level": 1}),
            _block("vip2", B.HEADING, "一、为什么需要 IPC", 2, {"level": 2}),
            _block(
                "vip3",
                B.PARAGRAPH,
                "进程拥有独立的地址空间，一个进程无法直接读写另一个进程的内存，因此需要操作系统提供机制在进程间传递数据或协调执行。IPC 是「进程隔离」的必然代价。",
                3,
            ),
            _block("vip4", B.HEADING, "二、主要方式", 4, {"level": 2}),
            _block(
                "vip5",
                B.PARAGRAPH,
                "管道（Pipe）：半双工字节流，用于父子进程或有亲缘关系的进程。消息队列（Message Queue）：内核维护的消息链表，按消息类型收发，支持无亲缘关系进程。共享内存（Shared Memory）：把同一块物理内存映射到多个进程地址空间，是最快的 IPC 方式，但需配合信号量做同步。信号量（Semaphore）：主要用于同步与互斥，而非传递数据。Socket：可用于本机或跨网络的进程通信，是最通用的方式。",
                5,
                {"highlights": ["管道", "消息队列", "共享内存", "Socket"]},
            ),
            _block("vip6", B.HEADING, "三、为什么共享内存最快？", 6, {"level": 2}),
            _block(
                "vip7",
                B.AI_SUMMARY,
                "管道和消息队列都需要在用户态和内核态之间拷贝数据（用户缓冲区 → 内核缓冲区 → 目标用户缓冲区），而共享内存建立映射后，进程直接读写同一块物理内存，没有内核中转的数据拷贝。代价是失去了内核提供的同步保护，必须自己用信号量或锁来保证一致性。",
                7,
            ),
            _block(
                "vip8",
                B.TABLE,
                "",
                8,
                {
                    "headers": ["方式", "是否跨网络", "速度", "同步"],
                    "rows": [
                        ["管道", "否", "慢（两次拷贝）", "内核保证"],
                        ["消息队列", "否", "慢（两次拷贝）", "内核保证"],
                        ["共享内存", "否", "最快（无拷贝）", "需自行同步"],
                        ["Socket", "是", "较慢", "协议保证"],
                    ],
                },
            ),
        ],
    }


def _note_memory(B):
    return {
        "id": N_MEMORY,
        "title": "内存管理（进程地址空间的支撑）",
        "note_type": "resource_import",
        "tags": ["内存", "基础"],
        "mastery": 78,
        "blocks": [
            _block("vmm1", B.HEADING, "内存管理", 1, {"level": 1}),
            _block("vmm2", B.HEADING, "一、虚拟内存", 2, {"level": 2}),
            _block(
                "vmm3",
                B.PARAGRAPH,
                "虚拟内存让每个进程拥有独立的虚拟地址空间，通过页表把虚拟地址映射到物理地址。进程看到的是连续、私有的地址空间，既实现了进程间隔离，也让进程可以使用超过物理内存大小的空间（通过换页）。",
                3,
                {"highlights": ["虚拟地址空间", "页表映射", "进程隔离"]},
            ),
            _block("vmm4", B.HEADING, "二、分页与分段", 4, {"level": 2}),
            _block(
                "vmm5",
                B.PARAGRAPH,
                "分页把内存划分为固定大小的页框，对程序员透明，提高内存利用率但可能产生内部碎片。分段按逻辑单元（代码段/数据段/栈）划分，符合程序视角但会产生外部碎片。现代系统多采用「段页式」结合。",
                5,
            ),
            _block("vmm6", B.HEADING, "三、页面置换算法", 6, {"level": 2}),
            _block(
                "vmm7",
                B.PARAGRAPH,
                "当物理内存已满、进程又访问缺页时，需要换出一个页面。FIFO 换出最早进入的页面（简单但可能 Belady 异常）；LRU 换出最久未使用的页面（效果好但实现复杂）；Clock 算法是 LRU 的近似，实际系统最常用。",
                7,
            ),
            _block(
                "vmm8",
                B.AI_SUMMARY,
                "内存管理为「进程拥有独立地址空间」提供了底层支撑：没有虚拟内存和页表，进程隔离和线程共享内存都无从谈起。理解内存管理，才能理解为什么「进程切换要换页表、线程切换不用」——这正是进程与线程那篇笔记里切换开销差异的根因。",
                8,
            ),
        ],
    }


# --------------------------------------------------------------------------- #
#  记忆卡                                                                      #
# --------------------------------------------------------------------------- #


def _card(cid, front, back, ctype, difficulty, source_note_id):
    return {
        "id": cid,
        "source_note_id": source_note_id,
        "front": front,
        "back": back,
        "tags": [f"type:{ctype}", f"difficulty:{difficulty}"],
    }


def _build_cards():
    return [
        # 进程与线程
        _card("dc_pt_01", "进程和线程的核心区别是什么？", "进程是资源分配的基本单位，拥有独立地址空间；线程是 CPU 调度的基本单位，共享进程资源。", "概念定义", "中等", N_PROCESS_THREAD),
        _card("dc_pt_02", "进程的五种状态是哪些？", "创建（New）→ 就绪（Ready）→ 运行（Running）→ 阻塞（Blocked）→ 终止（Terminated）。", "填空卡片", "中等", N_PROCESS_THREAD),
        _card("dc_pt_03", "为什么线程切换比进程切换更快？", "线程共享进程的虚拟地址空间，切换时无需更换页表和完整上下文，只需切换寄存器和栈指针。", "翻转问答", "中等", N_PROCESS_THREAD),
        _card("dc_pt_04", "多线程共享哪些资源？独立拥有哪些资源？", "共享：代码段、堆内存、文件描述符、全局变量。独立：栈空间、程序计数器（PC）、寄存器状态。", "填空卡片", "中等", N_PROCESS_THREAD),
        # 进程调度算法
        _card("dc_sc_01", "FCFS 和 SJF 的主要缺点分别是什么？", "FCFS：短作业被长作业阻塞（护航效应）。SJF：需要预知运行时间，长作业可能饿死。", "辨析卡片", "中等", N_SCHEDULING),
        _card("dc_sc_02", "多级反馈队列（MLFQ）的设计思想是什么？", "新进程进最高优先级短时间片队列，用不完就降到下一级、时间片变长；兼顾短任务的响应和长任务的吞吐。", "概念定义", "困难", N_SCHEDULING),
        _card("dc_sc_03", "时间片轮转（RR）的时间片太大或太小会怎样？", "太大退化成 FCFS，响应变慢；太小切换开销占比过高，吞吐下降。需在响应与开销间权衡。", "翻转问答", "困难", N_SCHEDULING),
        # 线程同步与互斥
        _card("dc_sy_01", "什么是竞态条件（Race Condition）？", "多个线程同时读写共享变量，最终结果取决于线程执行顺序，导致不确定的错误结果。", "概念定义", "中等", N_SYNC),
        _card("dc_sy_02", "互斥锁和自旋锁的区别是什么？", "互斥锁阻塞时线程睡眠、不占 CPU，适合临界区较长；自旋锁忙等、不睡眠，适合临界区极短。", "辨析卡片", "困难", N_SYNC),
        _card("dc_sy_03", "互斥锁和信号量的本质区别是什么？", "互斥锁是「所有权」语义，谁加锁谁解锁；信号量是「计数」语义，允许一个线程 P、另一个线程 V，还能实现顺序同步。", "辨析卡片", "困难", N_SYNC),
        _card("dc_sy_04", "条件变量必须配合什么使用？为什么？", "必须配合互斥锁。因为条件变量的检查与等待不是原子的，需要互斥锁保护共享条件变量，避免丢失唤醒信号。", "翻转问答", "困难", N_SYNC),
        # 死锁问题
        _card("dc_dl_01", "死锁的四个必要条件是什么？", "互斥、请求与保持、不可剥夺、循环等待。四个条件必须同时满足才会死锁。", "填空卡片", "中等", N_DEADLOCK),
        _card("dc_dl_02", "死锁预防和死锁避免有什么区别？", "预防是静态破坏四个条件之一（如资源有序申请），资源利用率低；避免是运行时动态判断分配是否安全（银行家算法）。", "辨析卡片", "困难", N_DEADLOCK),
        _card("dc_dl_03", "银行家算法的核心判断是什么？", "每次分配前模拟「分配后是否存在一个安全序列让所有进程都能完成」，存在才分配。", "翻转问答", "困难", N_DEADLOCK),
        _card("dc_dl_04", "活锁和死锁的区别是什么？", "死锁是进程阻塞、大家都停着；活锁是进程没有阻塞但不断重复相同操作、无法推进（互相让路却总让到同一侧）。", "辨析卡片", "中等", N_DEADLOCK),
        # 进程间通信 IPC
        _card("dc_ip_01", "为什么共享内存是最快的 IPC 方式？", "建立映射后进程直接读写同一块物理内存，没有内核中转的数据拷贝；管道/消息队列都需用户态-内核态两次拷贝。", "概念定义", "中等", N_IPC),
        _card("dc_ip_02", "管道和消息队列的主要区别是什么？", "管道是半双工字节流，通常用于有亲缘关系的进程；消息队列按消息类型收发，支持无亲缘关系进程。", "辨析卡片", "中等", N_IPC),
        _card("dc_ip_03", "共享内存的缺点是什么？", "失去了内核提供的同步保护，必须自己用信号量或锁保证一致性，否则会产生竞态条件。", "翻转问答", "中等", N_IPC),
        # 内存管理
        _card("dc_mm_01", "虚拟内存的核心作用是什么？", "让每个进程拥有独立的虚拟地址空间，通过页表映射到物理地址，实现进程隔离并支持超出物理内存的使用。", "概念定义", "中等", N_MEMORY),
        _card("dc_mm_02", "分页和分段的主要区别是什么？", "分页按固定大小页框划分，对程序员透明；分段按逻辑单元（代码/数据/栈）划分，符合程序视角。现代系统用段页式结合。", "辨析卡片", "困难", N_MEMORY),
        _card("dc_mm_03", "LRU 和 FIFO 页面置换的区别是什么？", "FIFO 换出最早进入的页面（可能 Belady 异常）；LRU 换出最久未使用的页面，效果好但实现复杂。", "辨析卡片", "困难", N_MEMORY),
    ]


def _ensure_memory_cards(db) -> None:
    from app.modules.memory.models import MemoryCardModel
    from app.schemas.enums import MemoryCardStatus

    cards = _build_cards()
    for c in cards:
        if db.get(MemoryCardModel, c["id"]):
            continue
        db.add(
            MemoryCardModel(
                id=c["id"],
                owner_id=DEMO_USER_ID,
                source_note_id=c["source_note_id"],
                front=c["front"],
                back=c["back"],
                tags=c["tags"],
                status=MemoryCardStatus.ACTIVE,
                due_at=utc_now(),
            )
        )
    db.flush()
    print(f"[记忆卡] 已创建 {len(cards)} 张记忆卡（全部到期，可直接演示 SM-2 复习）")


# --------------------------------------------------------------------------- #
#  费曼 + 思考会话                                                             #
# --------------------------------------------------------------------------- #


def _ensure_feynman_thinking(db) -> None:
    from app.modules.feynman.models import FeynmanEvaluationModel, FeynmanSessionModel
    from app.modules.thinking.models import ThinkingSessionModel
    from app.schemas.enums import FeynmanSessionStatus, ThinkingSessionStatus

    feynman = [
        (
            "demo_feyn_01", N_PROCESS_THREAD, "进程与线程的区别",
            "进程像一个独立的房子，线程像房子里的房间：房间共享房子的水电（内存），但每个房间有自己的门锁（栈）。",
            FeynmanSessionStatus.EVALUATED, 88,
            "类比准确、抓住了「共享 vs 独立」的核心。小漏洞：没有提到「线程是 CPU 调度的最小单位」，建议下次把调度单位这一点补上。",
            ["用一句话说清进程是资源分配单位、线程是调度单位"],
        ),
        (
            "demo_feyn_02", N_PROCESS_THREAD, "并发与并行",
            "并发是同时处理多个任务（一个 CPU 来回切换），并行是真正同时执行多个任务（多核）。",
            FeynmanSessionStatus.EVALUATED, 76,
            "定义基本正确。漏洞：混淆了「并发」是任务结构、「并行」是执行方式，两者可以同时存在（多核上既有并发也有并行）。",
            ["多核环境下并发和并行能同时存在吗？"],
        ),
        (
            "demo_feyn_03", N_DEADLOCK, "死锁的四个必要条件",
            "互斥、请求与保持、不可剥夺、循环等待，四个条件都要满足才会死锁。",
            FeynmanSessionStatus.EVALUATED, 58,
            "四个条件背对了，但只停留在「背诵」层面，没有解释为什么「缺一不可」。建议把每个条件去掉后死锁为何不成立各说一遍。",
            ["为什么破坏循环等待后死锁一定不会发生？"],
        ),
        (
            "demo_feyn_04", N_PROCESS_THREAD, "为什么线程切换比进程快",
            "线程切换不用换页表，进程切换要换整个地址空间，所以线程快。",
            FeynmanSessionStatus.EVALUATED, 70,
            "结论对、关键点（页表）抓到了。漏洞：没有说清进程切换还要保存/恢复打开文件、寄存器等完整上下文，切换开销是全方位的。",
            ["进程切换除了页表还要切换哪些上下文？"],
        ),
    ]
    for fid, note_id, concept, explanation, status, score, feedback, followups in feynman:
        if db.get(FeynmanSessionModel, fid):
            continue
        db.add(
            FeynmanSessionModel(
                id=fid,
                owner_id=DEMO_USER_ID,
                note_id=note_id,
                concept_name=concept,
                explanation=explanation,
                status=status,
            )
        )
        db.flush()
        db.add(
            FeynmanEvaluationModel(
                id=f"{fid}_eval",
                session_id=fid,
                score=score,
                feedback=feedback,
                follow_up_questions=followups,
            )
        )

    thinking = [
        ("demo_think_01", N_PROCESS_THREAD, "理解进程与线程的本质区别", ThinkingSessionStatus.COMPLETED),
        ("demo_think_02", N_DEADLOCK, "推导死锁的四个必要条件", ThinkingSessionStatus.COMPLETED),
        ("demo_think_03", N_SYNC, "弄清信号量与互斥锁的区别", ThinkingSessionStatus.ACTIVE),
        ("demo_think_04", N_SCHEDULING, "理解多级反馈队列的设计动机", ThinkingSessionStatus.COMPLETED),
    ]
    for tid, note_id, goal, status in thinking:
        if db.get(ThinkingSessionModel, tid):
            continue
        db.add(
            ThinkingSessionModel(
                id=tid,
                owner_id=DEMO_USER_ID,
                note_id=note_id,
                goal=goal,
                status=status,
            )
        )
    db.flush()
    print(f"[费曼/思考] 已创建 {len(feynman)} 次费曼练习 + {len(thinking)} 次思考会话")


# --------------------------------------------------------------------------- #
#  活动 + 学习日志                                                             #
# --------------------------------------------------------------------------- #


def _ensure_activities(db) -> None:
    from app.modules.dashboard.models import LearningActivityModel
    from app.schemas.enums import DashboardTaskMode

    activities = [
        ("demo_act_01", DashboardTaskMode.MEMORY, "完成了「进程与线程」18 张记忆卡复习", "操作系统"),
        ("demo_act_02", DashboardTaskMode.THINKING, "AI 追问了死锁四个必要条件的推导", "操作系统"),
        ("demo_act_03", DashboardTaskMode.FEYNMAN, "完成「进程 vs 线程」费曼讲解", "操作系统"),
        ("demo_act_04", DashboardTaskMode.QUICK, "导入操作系统课件并生成结构化笔记", "操作系统"),
        ("demo_act_05", DashboardTaskMode.MEMORY, "生成「线程同步」记忆卡", "操作系统"),
    ]
    for aid, mode, action, course in activities:
        if db.get(LearningActivityModel, aid):
            continue
        db.add(
            LearningActivityModel(
                id=aid, owner_id=DEMO_USER_ID, mode=mode, action=action, course_name=course,
            )
        )
    db.flush()
    print(f"[活动] 已创建 {len(activities)} 条学习动态")


def _ensure_study_logs(db) -> None:
    from datetime import date, timedelta

    from app.modules.dashboard.models import StudyLogModel
    from app.schemas.enums import DashboardTaskMode

    today = date.today()
    weekly = [
        (-6, [(DashboardTaskMode.QUICK, 30), (DashboardTaskMode.MEMORY, 40), (DashboardTaskMode.THINKING, 50), (DashboardTaskMode.FEYNMAN, 30)]),
        (-5, [(DashboardTaskMode.QUICK, 45), (DashboardTaskMode.MEMORY, 50), (DashboardTaskMode.THINKING, 60), (DashboardTaskMode.FEYNMAN, 25)]),
        (-4, [(DashboardTaskMode.QUICK, 20), (DashboardTaskMode.MEMORY, 60), (DashboardTaskMode.THINKING, 40), (DashboardTaskMode.FEYNMAN, 20)]),
        (-3, [(DashboardTaskMode.QUICK, 50), (DashboardTaskMode.MEMORY, 45), (DashboardTaskMode.THINKING, 70), (DashboardTaskMode.FEYNMAN, 30)]),
        (-2, [(DashboardTaskMode.QUICK, 35), (DashboardTaskMode.MEMORY, 30), (DashboardTaskMode.THINKING, 55), (DashboardTaskMode.FEYNMAN, 40)]),
        (-1, [(DashboardTaskMode.QUICK, 20), (DashboardTaskMode.MEMORY, 35), (DashboardTaskMode.THINKING, 30), (DashboardTaskMode.FEYNMAN, 15)]),
        (0, [(DashboardTaskMode.QUICK, 10), (DashboardTaskMode.MEMORY, 20), (DashboardTaskMode.THINKING, 20), (DashboardTaskMode.FEYNMAN, 10)]),
    ]
    for i, (offset, entries) in enumerate(weekly):
        for j, (mode, duration) in enumerate(entries):
            log_id = f"demo_study_{i}_{j}"
            if db.get(StudyLogModel, log_id):
                continue
            db.add(
                StudyLogModel(
                    id=log_id, owner_id=DEMO_USER_ID,
                    log_date=today + timedelta(days=offset),
                    mode=mode, duration_minutes=duration,
                )
            )
    db.flush()
    print("[学习日志] 已创建 7 天学习日志")


# --------------------------------------------------------------------------- #
#  社区共享资产                                                                #
# --------------------------------------------------------------------------- #


def _ensure_shared_assets(db) -> None:
    from app.modules.community.models import SharedAssetModel
    from app.schemas.enums import SharedAssetType, Visibility

    assets = [
        (
            "demo_asset_01", "进程与线程知识框架", SharedAssetType.KNOWLEDGE_GRAPH,
            N_PROCESS_THREAD, "进程、线程、调度、同步、死锁、IPC 的完整知识结构", ["进程", "线程", "知识框架"],
        ),
        (
            "demo_asset_02", "死锁四个条件思维链", SharedAssetType.THINKING_CHAIN,
            N_DEADLOCK, "从互斥到循环等待的苏格拉底式推导记录", ["死锁", "思维训练"],
        ),
        (
            "demo_asset_03", "操作系统复习模板", SharedAssetType.REVIEW_TEMPLATE,
            N_SCHEDULING, "进程调度与同步互斥的复习卡片模板", ["操作系统", "复习模板"],
        ),
    ]
    for aid, title, atype, source_id, desc, tags in assets:
        if db.get(SharedAssetModel, aid):
            continue
        db.add(
            SharedAssetModel(
                id=aid, owner_id=DEMO_USER_ID, title=title, asset_type=atype,
                source_id=source_id, visibility=Visibility.PUBLIC,
                description=desc, tags=tags,
            )
        )
    db.flush()
    print(f"[社区] 已创建 {len(assets)} 个共享资产")


if __name__ == "__main__":
    main()
