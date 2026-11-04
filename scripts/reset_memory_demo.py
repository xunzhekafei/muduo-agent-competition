"""重置记忆库演示状态：将 12 篇演示笔记均匀分配四种卡片状态。

仅在 MUDUO_RESET_MEMORY_DEMO=true 时才执行实际重置。
用法：cd backend && python ../scripts/reset_memory_demo.py
"""

import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def _reset_demo():
    from app.db.session import get_session_factory
    from app.db.ids import new_prefixed_id
    from app.db.mixins import utc_now
    from app.modules.notes.models import NoteModel
    from app.modules.memory.models import MemoryCardModel, ReviewRecordModel

    session = get_session_factory()()
    try:
        notes = session.query(NoteModel).filter(
            NoteModel.deleted_at.is_(None)
        ).order_by(NoteModel.updated_at).all()

        if len(notes) != 12:
            print(f"笔记数量为 {len(notes)}，非演示数据（期望 12），跳过重置。")
            return

        session.query(ReviewRecordModel).delete()

        now = utc_now()
        for i, note in enumerate(notes):
            cards = session.query(MemoryCardModel).filter(
                MemoryCardModel.source_note_id == note.id,
                MemoryCardModel.deleted_at.is_(None),
            ).all()

            if i < 3:
                for c in cards:
                    c.deleted_at = now
            elif i < 6:
                for c in cards:
                    c.deleted_at = None
                    c.due_at = now
                    c.interval_days = 1
            elif i < 9:
                for c in cards:
                    c.deleted_at = None
                    c.due_at = now + timedelta(days=3 + i)
                    c.interval_days = 1
            else:
                for c in cards:
                    c.deleted_at = None
                    c.due_at = now + timedelta(days=30)
                    c.interval_days = 7
                    review = ReviewRecordModel(
                        id=new_prefixed_id("rev"),
                        owner_id="user_001",
                        card_id=c.id,
                        grade="good",
                        reviewed_at=now - timedelta(days=7),
                        next_due_at=now + timedelta(days=30),
                        interval_days=7,
                    )
                    session.add(review)

        session.commit()
        print("记忆库演示状态已重置。")
    finally:
        session.close()


if __name__ == "__main__":
    if os.getenv("MUDUO_RESET_MEMORY_DEMO", "false").lower() != "true":
        print("MUDUO_RESET_MEMORY_DEMO 未设为 true，跳过。")
        sys.exit(0)

    _reset_demo()
