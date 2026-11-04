"""AI 生成记忆卡片 —— 读笔记内容 → 调 LLM → 生成四种类型卡片"""

from __future__ import annotations

import json
import random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.ids import new_prefixed_id
from app.integrations.llm import LLMGenerationRequest, LLMMessage
from app.integrations.registry import get_default_integrations
from app.modules.memory.models import MemoryCardModel
from app.modules.notes.service import NoteService

PROMPT_TEMPLATE = """你是一个教育 AI 助手。请阅读以下笔记内容，生成记忆卡片。

笔记内容：
{note_text}

要求：
1. 生成四种类型的卡片，每种至少 1 张：
   - 概念定义：提取核心概念，问定义是什么
   - 填空卡片：把关键术语挖掉，让用户填空
   - 辨析卡片：制造一个常见误解，让用户判断对错
   - 翻转问答：把重要结论变成问答
2. 总共生成 4-8 张卡片
3. 难度标注为 简单/中等/困难 之一
4. 只输出 JSON 数组，不要加任何额外文字：

[
  {{
    "type": "概念定义",
    "front": "导数的定义是什么？",
    "back": "导数是函数在某一点的变化率，定义为...",
    "difficulty": "中等"
  }}
]"""

FALLBACK_CARDS = [
    {"type": "概念定义", "front": "这篇笔记的核心概念是什么？", "back": "请回顾笔记中定义的关键概念，尝试用自己的话解释。", "difficulty": "中等"},
    {"type": "填空卡片", "front": "笔记中提到的最重要的术语是________。", "back": "请查阅笔记原文确认关键术语。", "difficulty": "简单"},
    {"type": "辨析卡片", "front": "笔记中是否提到了常见的误解或易混淆点？", "back": "尝试总结正确观点与常见错误的区别。", "difficulty": "中等"},
    {"type": "翻转问答", "front": "这篇笔记讨论的主要问题是什么？", "back": "回顾笔记的开头段落，通常会有问题陈述。", "difficulty": "简单"},
]


def generate_cards(
    note_id: str,
    owner_id: str,
    session: Session,
    max_cards: int = 10,
) -> dict:
    """主函数：读笔记 → 清空旧卡片 → LLM 生成 → 写入数据库 → 返回卡片列表"""

    # 0. 先清除该笔记已有的活跃卡片（覆盖模式）
    _clear_existing_cards(note_id, owner_id, session)

    # 1. 读取笔记内容
    note_text = _read_note_text(note_id, owner_id, session)
    if not note_text:
        raise ValueError("笔记内容为空，无法生成卡片")

    # 2. 调 LLM
    cards = _call_llm(note_text)

    # 3. 限制数量
    cards = cards[:max_cards]

    # 4. 写入数据库
    saved = _save_cards(note_id, owner_id, cards, session)

    return {"noteId": note_id, "cards": saved}


def _read_note_text(note_id: str, owner_id: str, session: Session) -> str:
    """通过 NoteService 查询笔记内容，拼接为全文"""
    note = NoteService(session).get_note_model(
        owner_id=owner_id, note_id=note_id, with_blocks=True
    )
    blocks = sorted(note.blocks or [], key=lambda b: b.position or 0)
    if not blocks:
        return ""
    return "\n\n".join(b.content for b in blocks if b.content)


def _call_llm(note_text: str) -> list[dict]:
    """调用 LLM provider 生成卡片"""

    prompt = PROMPT_TEMPLATE.format(note_text=note_text[:6000])
    llm = get_default_integrations().llm

    request = LLMGenerationRequest(
        model="",
        messages=[LLMMessage(role="user", content=prompt)],
        temperature=0.7,
    )
    response = llm.generate(request)

    # 解析 LLM 返回
    cards = _parse_json(response.content)
    if cards:
        return cards

    # mock provider 返回的是 echo，无法解析 → 用 fallback
    return _build_fallback_cards(note_text)


def _parse_json(text: str) -> list[dict]:
    """尝试从 LLM 返回文本中提取 JSON 数组"""
    if not text:
        return []

    # 直接解析
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
    except (json.JSONDecodeError, TypeError):
        pass

    # 截取 [ 到 ]
    start = text.find("[")
    end = text.rfind("]") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except (json.JSONDecodeError, TypeError):
            pass

    return []


def _build_fallback_cards(note_text: str) -> list[dict]:
    """mock 模式下用笔记内容中的句子构造简易卡片"""
    sentences = [s.strip() for s in note_text.replace("\n", " ").split("。") if len(s.strip()) > 10]

    cards = []
    types = ["概念定义", "填空卡片", "辨析卡片", "翻转问答"]
    difficulties = ["简单", "中等", "困难"]

    for i, sentence in enumerate(sentences[:8]):
        cards.append({
            "type": types[i % 4],
            "front": f"关于「{sentence[:30]}...」的理解是什么？",
            "back": sentence,
            "difficulty": difficulties[i % 3],
        })

    return cards if cards else FALLBACK_CARDS


def _clear_existing_cards(note_id: str, owner_id: str, session: Session) -> int:
    """软删除该笔记所有活跃卡片（覆盖模式：新建记忆时清空旧卡片）"""
    from app.db.mixins import utc_now
    from sqlalchemy import update as sql_update

    stmt = (
        sql_update(MemoryCardModel)
        .where(
            MemoryCardModel.source_note_id == note_id,
            MemoryCardModel.owner_id == owner_id,
            MemoryCardModel.deleted_at.is_(None),
        )
        .values(deleted_at=utc_now())
    )
    result = session.execute(stmt)
    if result.rowcount > 0:
        session.commit()
    return result.rowcount


def _save_cards(
    note_id: str, owner_id: str, cards: list[dict], session: Session
) -> list[dict]:
    """将卡片写入 memory_cards 表，跳过与已有卡片内容重复的"""
    from app.modules.memory.models import MemoryCardModel
    from sqlalchemy import and_

    # 查询该笔记已有的卡片（含软删除的），用于去重
    existing = (
        session.execute(
            select(MemoryCardModel.front, MemoryCardModel.back).where(
                MemoryCardModel.source_note_id == note_id,
                MemoryCardModel.owner_id == owner_id,
                MemoryCardModel.deleted_at.is_(None),
            )
        ).all()
    )
    existing_pairs = {(e.front.strip(), e.back.strip()) for e in existing}

    saved = []
    for card in cards:
        front = (card.get("front") or card.get("question") or "").strip()
        back = (card.get("back") or card.get("answer") or "").strip()
        if not front or not back:
            continue
        # 去重：跳过与已有卡片内容完全相同的
        if (front, back) in existing_pairs:
            continue

        model = MemoryCardModel(
            id=new_prefixed_id("card"),
            owner_id=owner_id,
            source_note_id=note_id,
            front=front,
            back=back,
            tags=[
                f"type:{card.get('type', '概念定义')}",
                f"difficulty:{card.get('difficulty', '中等')}",
            ],
        )
        session.add(model)
        existing_pairs.add((front, back))
        saved.append({
            "id": model.id,
            "type": card.get("type", "概念定义"),
            "front": front,
            "back": back,
            "difficulty": card.get("difficulty", "中等"),
            "status": "待确认",
        })

    session.commit()
    return saved
