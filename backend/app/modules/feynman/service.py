from __future__ import annotations

import json
import os

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, ErrorCode, raise_not_found, require_text
from app.integrations.llm import DeepSeekProvider, LLMGenerationRequest, LLMMessage
from app.modules.feynman.models import (
    FeynmanEvaluationModel,
    FeynmanQuestionModel,
    FeynmanSessionModel,
)
from app.modules.knowledge_graph.service import KnowledgeGraphService
from app.modules.notes.service import NoteService
from app.schemas.enums import FeynmanSessionStatus
from app.schemas.feynman import (
    FeynmanChatRequest,
    FeynmanChatResponse,
    FeynmanEvaluation,
    FeynmanEvaluationCreateRequest,
    FeynmanQuestion,
    FeynmanQuestionCreateRequest,
    FeynmanSession,
    FeynmanSessionCreateRequest,
    FeynmanSessionDetail,
)


class FeynmanService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def start_session(self, *, owner_id: str, request: FeynmanSessionCreateRequest) -> FeynmanSession:
        if request.note_id:
            NoteService(self.db).get_note_model(owner_id=owner_id, note_id=request.note_id)
        if request.concept_id:
            KnowledgeGraphService(self.db).get_concept_model(
                owner_id=owner_id,
                concept_id=request.concept_id,
            )
        session = FeynmanSessionModel(
            owner_id=owner_id,
            concept_id=request.concept_id,
            note_id=request.note_id,
            concept_name=require_text(request.concept_name, "概念名称不能为空"),
            explanation=require_text(request.explanation, "解释内容不能为空"),
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return to_feynman_session_schema(session)

    def get_session_detail(self, *, owner_id: str, session_id: str) -> FeynmanSessionDetail:
        session = self.get_session_model(owner_id=owner_id, session_id=session_id, with_children=True)
        return FeynmanSessionDetail(
            session=to_feynman_session_schema(session),
            questions=[to_feynman_question_schema(question) for question in session.questions],
            evaluation=to_feynman_evaluation_schema(session.evaluation) if session.evaluation else None,
        )

    def add_question(
        self,
        *,
        owner_id: str,
        session_id: str,
        request: FeynmanQuestionCreateRequest,
    ) -> FeynmanQuestion:
        self._require_active_session(owner_id=owner_id, session_id=session_id)
        question = FeynmanQuestionModel(
            session_id=session_id,
            question=require_text(request.question, "追问不能为空"),
        )
        self.db.add(question)
        self.db.commit()
        self.db.refresh(question)
        return to_feynman_question_schema(question)

    def evaluate(
        self,
        *,
        owner_id: str,
        session_id: str,
        request: FeynmanEvaluationCreateRequest,
    ) -> FeynmanEvaluation:
        session = self._require_active_session(owner_id=owner_id, session_id=session_id)
        evaluation = FeynmanEvaluationModel(
            session_id=session_id,
            score=request.score,
            feedback=require_text(request.feedback, "评估反馈不能为空"),
            follow_up_questions=request.follow_up_questions,
        )
        session.status = FeynmanSessionStatus.EVALUATED
        self.db.add_all([session, evaluation])
        self.db.commit()
        self.db.refresh(evaluation)
        return to_feynman_evaluation_schema(evaluation)

    def chat(self, *, request: FeynmanChatRequest) -> FeynmanChatResponse:
        llm = _get_feynman_llm()

        if request.is_initial:
            prompt = _build_initial_prompt(request)
        elif request.round >= 5:
            prompt = _build_evaluation_prompt(request)
        else:
            prompt = _build_followup_prompt(request)

        llm_request = LLMGenerationRequest(
            model="deepseek-chat",
            messages=[LLMMessage(role="user", content=prompt)],
            temperature=0.7,
            max_tokens=2048,
        )
        response = llm.generate(llm_request)
        content = response.content.strip()

        evaluation = None
        if request.round >= 5 and not request.is_initial:
            evaluation = _parse_evaluation(content)
            if evaluation:
                content = evaluation.get("summary", "本次讲解到此结束。")
            else:
                content = f"本次讲解到此结束。\n\n{content}"

        return FeynmanChatResponse(reply=content, evaluation=evaluation)

    def get_session_model(
        self,
        *,
        owner_id: str,
        session_id: str,
        with_children: bool = False,
    ) -> FeynmanSessionModel:
        query = select(FeynmanSessionModel).where(
            FeynmanSessionModel.id == session_id,
            FeynmanSessionModel.owner_id == owner_id,
        )
        if with_children:
            query = query.options(
                selectinload(FeynmanSessionModel.questions),
                selectinload(FeynmanSessionModel.evaluation),
            )
        session = self.db.execute(query).scalar_one_or_none()
        if session is None:
            raise_not_found("费曼会话不存在")
        return session

    def _require_active_session(self, *, owner_id: str, session_id: str) -> FeynmanSessionModel:
        session = self.get_session_model(owner_id=owner_id, session_id=session_id)
        if session.status != FeynmanSessionStatus.ACTIVE:
            raise AppError(
                ErrorCode.VALIDATION_ERROR,
                "费曼会话已结束",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        return session


def to_feynman_session_schema(session: FeynmanSessionModel) -> FeynmanSession:
    return FeynmanSession(
        id=session.id,
        owner_id=session.owner_id,
        concept_id=session.concept_id,
        note_id=session.note_id,
        concept_name=session.concept_name,
        explanation=session.explanation,
        status=session.status,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


def to_feynman_question_schema(question: FeynmanQuestionModel) -> FeynmanQuestion:
    return FeynmanQuestion(
        id=question.id,
        session_id=question.session_id,
        question=question.question,
        created_at=question.created_at,
        updated_at=question.updated_at,
    )


def to_feynman_evaluation_schema(evaluation: FeynmanEvaluationModel) -> FeynmanEvaluation:
    return FeynmanEvaluation(
        id=evaluation.id,
        session_id=evaluation.session_id,
        score=evaluation.score,
        feedback=evaluation.feedback,
        follow_up_questions=evaluation.follow_up_questions,
        created_at=evaluation.created_at,
        updated_at=evaluation.updated_at,
    )



def _get_feynman_llm() -> DeepSeekProvider:
    key = os.environ.get("FEYNMAN_DEEPSEEK_API_KEY", os.environ.get("DEEPSEEK_API_KEY"))
    if not key:
        raise RuntimeError("FEYNMAN_DEEPSEEK_API_KEY 或 DEEPSEEK_API_KEY 环境变量未设置")
    return DeepSeekProvider(api_key=key)


FEYNMAN_SYSTEM = """你是一个温和耐心的老师，正在和一个学生进行费曼式对话——学生来给你讲解知识，你来引导他把概念讲透彻。

对话风格：
- 称呼对方为"同学"，语气像课后答疑一样亲切自然
- 先肯定学生回答中好的部分，再顺着他的话温和追问
- 每次只追问一个点，层层递进，不要一次问太多
- 多用生活化的比喻来检验理解，比如"如果拿...来打比方的话..."
- 学生讲得好时给一句真诚的鼓励，讲得模糊时用"我还有点不明白..."来引导
- 用口语化的中文，像真人对话，不要用Markdown格式（不要出现**、#等符号）"""


def _build_initial_prompt(req: FeynmanChatRequest) -> str:
    reqs_text = "\n".join(f"  - {r}" for r in req.requirements)
    return f"""{FEYNMAN_SYSTEM}

学生准备讲解的主题是「{req.topic}」。
目标：{req.goal}
希望你关注这些维度：
{reqs_text}
给你的小提示：{req.hint}

请你用老师的口吻，先打个招呼，然后用一个贴近生活的具体问题来开启对话。比如抛出一个他在生活中可能遇到过的场景，引导他用自己的话解释清楚。只问一个问题就好。"""


def _build_followup_prompt(req: FeynmanChatRequest) -> str:
    history = "\n".join(
        f"{'同学' if m.role == 'user' else '老师'}: {m.text}" for m in req.messages
    )
    return f"""{FEYNMAN_SYSTEM}

现在是第{req.round}轮对话。

完整对话记录：
{history}

请根据刚才同学的讲解，先肯定他讲得好的地方（一句话），然后顺着他的思路再追问一个更深的问题。追问可以是一个生活场景、一个边界情况、或一个"为什么"——目的是让他把概念讲得更透彻。只问一个问题，语气要自然。"""


def _build_evaluation_prompt(req: FeynmanChatRequest) -> str:
    history = "\n".join(
        f"{'同学' if m.role == 'user' else '老师'}: {m.text}" for m in req.messages
    )
    return f"""{FEYNMAN_SYSTEM}

对话进行了{req.round}轮，这是最后一轮了。请根据整个对话历史，给出综合评估。

对话记录：
{history}

请用以下JSON格式回复（只输出JSON，不要加任何其他文字）：
{{{{
  "summary": "一段总结（40字以内），语气温暖，先总体肯定，再指出一个可以继续深入的方向",
  "scores": [
    {{"label": "逻辑", "value": 85}},
    {{"label": "准确度", "value": 80}},
    {{"label": "清晰度", "value": 75}},
    {{"label": "举例", "value": 70}},
    {{"label": "应答", "value": 80}}
  ],
  "gaps": ["知识漏洞1", "知识漏洞2"],
  "tips": ["改进建议1", "改进建议2"]
}}}}

根据对话质量给各项打分（0-100），列出2个具体漏洞和2条改进建议。"""


def _parse_evaluation(content: str) -> dict | None:
    try:
        text = content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.split("```")[0].strip()
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            text = text[first_brace : last_brace + 1]
        result = json.loads(text)
        required_keys = {"summary", "scores", "gaps", "tips"}
        if not required_keys.issubset(result.keys()):
            return None
        return result
    except (json.JSONDecodeError, ValueError, IndexError):
        return None
