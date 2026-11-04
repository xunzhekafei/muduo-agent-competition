"""演示环境初始化（参赛评审体验用，幂等，可重复跑）。

做什么：
  1. 确保匿名演示账号存在（student@example.com / 「学生用户」），并把密码重置为已知值
  2. 演示数据缺失时调 seed_data.seed() 补齐（课程/笔记/记忆卡/费曼/思考会话）
  3. 建知识库索引（笔记分块 → 向量化），保证 RAG 开箱可用
  4. 登录自检 + 脱敏提醒清单

用法（在 backend 目录下）：
  python scripts/seed_demo.py                 # 默认密码 muduo123456
  DEMO_PASSWORD=xxxx python scripts/seed_demo.py

注意：seed_data.py 内部固定读写 ./muduo_dev.sqlite3，请从 backend 目录运行本脚本。
"""

from __future__ import annotations

import os
import pathlib
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BACKEND = pathlib.Path(__file__).resolve().parents[1]
os.chdir(BACKEND)  # seed_data 固定用 ./muduo_dev.sqlite3，统一定位
sys.path.insert(0, str(BACKEND))

DEMO_EMAIL = "student@example.com"
DEMO_NAME = "学生用户"
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "muduo123456")
DEMO_USER_ID = "user_001"


def main() -> None:
    from sqlalchemy import func, select

    from app.core.security import hash_password, verify_password
    from app.db.session import get_session_factory
    from app.modules.feynman.models import FeynmanSessionModel
    from app.modules.memory.models import MemoryCardModel
    from app.modules.notes.models import NoteModel
    from app.modules.thinking.models import ThinkingSessionModel
    from app.modules.users.models import UserModel, UserPreferenceModel

    db = get_session_factory()()
    try:
        # ---- 1. 匿名演示账号 ----
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
            print(f"[账号] 演示账号已存在，密码已重置为设定值（{DEMO_EMAIL}）")
        db.commit()

        # ---- 2. 演示数据 ----
        note_count = db.execute(
            select(func.count()).select_from(NoteModel).where(
                NoteModel.owner_id == DEMO_USER_ID, NoteModel.deleted_at.is_(None)
            )
        ).scalar_one()
        if note_count == 0:
            print("[数据] 未发现演示数据，调用 seed_data.seed() 补齐……")
            db.close()
            import seed_data

            seed_data.seed()
            db = get_session_factory()()
        else:
            print(f"[数据] 演示数据已就绪（{note_count} 篇笔记），跳过 seeding")

        # ---- 3. 知识库索引 ----
        from app.modules.knowledge_base.indexer import index_all_notes

        stats = index_all_notes(db, DEMO_USER_ID)
        print(f"[知识库] 索引完成：{stats['notes']} 篇笔记 → {stats['chunks']} 个知识块"
              f"（其中 {stats['embedded']} 个已向量化）")

        # ---- 4. 登录自检 ----
        fresh = db.get(UserModel, DEMO_USER_ID)
        ok = verify_password(DEMO_PASSWORD, fresh.password_hash)
        print(f"[自检] 登录密码校验：{'通过' if ok else '失败！请检查 DEMO_PASSWORD'}")

        # ---- 汇总 ----
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
        print(f"数据规模：{note_count} 篇笔记 / {cards} 张记忆卡 / "
              f"{feynman} 次费曼练习 / {thinking} 次思考练习")
        print("\n脱敏提交前人工检查清单：")
        print("  [ ] 昵称/邮箱不含学校、学院、真实姓名、教师姓名")
        print("  [ ] 演示数据（笔记标题/正文）不含学校名、姓名、Logo")
        print("  [ ] 演示截图、PPT、视频同样逐页检查")
    finally:
        db.close()


if __name__ == "__main__":
    main()
