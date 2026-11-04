from __future__ import annotations
import logging

from fastapi import status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload


logger = logging.getLogger(__name__)

from app.core.errors import AppError, ErrorCode


from app.modules.courses.models import CourseModel, LearningSpaceModel
from app.modules.notes.models import NoteBlockModel, NoteModel, NoteRelationModel
from app.modules.resources.models import ResourceModel
from app.schemas.common import Pagination
from app.schemas.enums import NoteBlockType, NoteStatus
from app.schemas.notes import (
    Note,
    NoteBlock,
    NoteBlockCreateRequest,
    NoteCreateRequest,
    NoteDetail,
    NoteRelation,
    NoteRelationCreateRequest,
    NoteUpdateRequest,
)


class NoteService:
    """笔记模块业务逻辑

    === 公开方法（供其他模块调用）===

    create_note(owner_id, request) → Note
        创建一篇笔记。
        其他三人调此接口保存笔记（通过 note_type 区分来源）。

    get_note_detail(owner_id, note_id) → NoteDetail
        获取笔记详情（含 blocks 和 relations）。
        任思睿的思考模式需要调此接口读取笔记内容。

    get_note_model(owner_id, note_id, with_blocks=False) → NoteModel
        获取笔记 ORM 对象（供其他 service 内部调用）。

    update_note(owner_id, note_id, request) → Note
        更新笔记标题/课程/标签/掌握度等。

    list_notes(owner_id, page, page_size, tag?, q?) → (list[Note], Pagination)
        获取笔记列表（支持分页/标签筛选/搜索）。

    archive_note(owner_id, note_id) → None
        归档（软删除）笔记。

    append_block(owner_id, note_id, request) → NoteBlock
        追加一个笔记块。

    update_block(owner_id, note_id, block_id, request) → NoteBlock
        更新指定笔记块的内容/类型/metadata。

    delete_block(owner_id, note_id, block_id) → None
        删除指定笔记块。

    add_relation(owner_id, note_id, request) → NoteRelation
        添加笔记关系（双链/引用/前置依赖等）。
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ #
    #  公开方法                                                            #
    # ------------------------------------------------------------------ #

    def list_notes(
        self,
        *,
        owner_id: str,
        page: int,
        page_size: int,
        tag: str | None = None,
        q: str | None = None,
    ) -> tuple[list[Note], Pagination]:
        """获取笔记列表。

        参数:
            owner_id: 用户 ID
            page: 页码（从 1 开始）
            page_size: 每页条数
            tag: 按标签筛选（可选）
            q: 搜索关键词（可选，搜索标题和 block 内容）
        返回:
            (笔记列表, 分页信息)
        """
        if q and q.strip():
            return self._search_notes(owner_id=owner_id, q=q.strip(), page=page, page_size=page_size)
        query = select(NoteModel).where(
            NoteModel.owner_id == owner_id,
            NoteModel.deleted_at.is_(None),
        )
        if tag:
            notes = [
                note
                for note in self.db.execute(query.order_by(NoteModel.updated_at.desc())).scalars().all()
                if tag.strip().lower() in [item.lower() for item in note.tags]
            ]
            total = len(notes)
            start = (page - 1) * page_size
            return (
                [to_note_schema(note, self._resolve_course_name(note.course_id)) for note in notes[start : start + page_size]],
                Pagination(page=page, page_size=page_size, total=total),
            )
        total = self._count(query)
        notes = self.db.execute(
            query.order_by(NoteModel.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
        ).scalars().all()
        return [to_note_schema(note, self._resolve_course_name(note.course_id)) for note in notes], Pagination(page=page, page_size=page_size, total=total)

    def _search_notes(
        self,
        *,
        owner_id: str,
        q: str,
        page: int,
        page_size: int,
    ) -> tuple[list[Note], Pagination]:
        # Search in title OR block content
        title_match = select(NoteModel.id).where(
            NoteModel.owner_id == owner_id,
            NoteModel.deleted_at.is_(None),
            NoteModel.title.contains(q),
        )
        block_match = select(NoteBlockModel.note_id).where(
            NoteBlockModel.content.contains(q),
        )
        combined = title_match.union(block_match).subquery()
        note_ids = [row[0] for row in self.db.execute(select(combined)).all()]
        total = len(note_ids)
        start = (page - 1) * page_size
        page_ids = note_ids[start : start + page_size]

        results = []
        for nid in page_ids:
            note = self.db.execute(
                select(NoteModel).where(NoteModel.id == nid, NoteModel.deleted_at.is_(None))
            ).scalar_one_or_none()
            if note is None:
                continue
            snippet = self._extract_snippet(note, q)
            results.append(to_note_schema(note, self._resolve_course_name(note.course_id), snippet=snippet))
        return results, Pagination(page=page, page_size=page_size, total=total)

    def _extract_snippet(self, note: NoteModel, q: str) -> str | None:
        # First try to find q in title
        if q.lower() in note.title.lower():
            return note.title
        # Then search blocks
        blocks = self.db.execute(
            select(NoteBlockModel)
            .where(NoteBlockModel.note_id == note.id, NoteBlockModel.content.contains(q))
            .order_by(NoteBlockModel.position)
        ).scalars().all()
        for block in blocks:
            content = block.content
            idx = content.lower().find(q.lower())
            if idx >= 0:
                start = max(0, idx - 10)
                end = min(len(content), idx + len(q) + 10)
                snippet = content[start:end]
                if start > 0:
                    snippet = "..." + snippet
                if end < len(content):
                    snippet = snippet + "..."
                return snippet
        return None

    def create_note(self, *, owner_id: str, request: NoteCreateRequest) -> Note:
        """创建一篇笔记。

        参数:
            owner_id: 用户 ID
            request.title: 标题（不能为空）
            request.courseId: 所属课程 ID（可选）
            request.learningSpaceId: 所属学习空间 ID（可选）
            request.sourceResourceId: 来源资源 ID（可选，资源转笔记时使用）
            request.tags: 标签列表（可选）

        注意:
            此方法是其他模块保存笔记的入口。未来新增 note_type 字段后，
            其他三人需要传对应的 note_type 值（如 "resource_import"）。
        """
        self._validate_course_scope(
            owner_id=owner_id,
            course_id=request.course_id,
            learning_space_id=request.learning_space_id,
        )
        if request.source_resource_id:
            self._get_resource(owner_id=owner_id, resource_id=request.source_resource_id)
        # 校验 note_type，不在允许列表中的自动降级为 manual
        VALID_NOTE_TYPES = {"manual", "quick_text", "quick_timeline", "resource_import", "thinking", "feynman", "quick_timetree"}
        note_type = request.note_type or "manual"
        if note_type not in VALID_NOTE_TYPES:
            logger.warning("未知的 note_type '%s'，已降级为 'manual'", note_type)
            note_type = "manual"
        note = NoteModel(
            owner_id=owner_id,

            title=_require_text(request.title, "标题不能为空"),
            course_id=request.course_id,
            learning_space_id=request.learning_space_id,
            source_resource_id=request.source_resource_id,
            tags=_normalize_tags(request.tags),
            note_type=note_type,
        )
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return to_note_schema(note, self._resolve_course_name(note.course_id))

    def get_note_detail(self, *, owner_id: str, note_id: str) -> NoteDetail:
        """获取笔记详情（含 blocks 和 relations）。

        参数:
            owner_id: 用户 ID
            note_id: 笔记 ID
        返回:
            NoteDetail，包含 note / blocks / relations 三个字段

        注意:
            任思睿的思考模式需要调此接口读取笔记内容。
            返回的 blocks 中 metadata 被展开为顶层字段（如 level、headers）。
        """
        note = self.get_note_model(owner_id=owner_id, note_id=note_id, with_blocks=True)
        relations = self.db.execute(
            select(NoteRelationModel)
            .where(
                NoteRelationModel.owner_id == owner_id,
                or_(
                    NoteRelationModel.source_note_id == note_id,
                    NoteRelationModel.target_note_id == note_id,
                ),
            )
            .order_by(NoteRelationModel.created_at.asc())
        ).scalars().all()
        return NoteDetail(
            note=to_note_schema(note, self._resolve_course_name(note.course_id)),
            blocks=[to_note_block_schema(block) for block in note.blocks],
            relations=[to_note_relation_schema(relation) for relation in relations],
        )

    def update_note(self, *, owner_id: str, note_id: str, request: NoteUpdateRequest) -> Note:
        """更新笔记。

        参数:
            owner_id: 用户 ID
            note_id: 笔记 ID
            request: 要更新的字段（标题/课程/标签/掌握度/状态等，只传要改的）
        """
        note = self.get_note_model(owner_id=owner_id, note_id=note_id)
        changes = request.model_dump(exclude_unset=True)
        if "course_id" in changes or "learning_space_id" in changes:
            self._validate_course_scope(
                owner_id=owner_id,
                course_id=changes.get("course_id", note.course_id),
                learning_space_id=changes.get("learning_space_id", note.learning_space_id),
            )
        if "title" in changes and changes["title"] is not None:
            note.title = _require_text(changes["title"], "标题不能为空")
        if "tags" in changes and changes["tags"] is not None:
            note.tags = _normalize_tags(changes["tags"])
        if "status" in changes and changes["status"] is not None:
            note.status = changes["status"]
        if "course_id" in changes:
            note.course_id = changes["course_id"]
        if "learning_space_id" in changes:
            note.learning_space_id = changes["learning_space_id"]
        if "mastery" in changes and changes["mastery"] is not None:
            note.mastery = changes["mastery"]
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return to_note_schema(note, self._resolve_course_name(note.course_id))

    def archive_note(self, *, owner_id: str, note_id: str) -> None:
        """归档（软删除）笔记。

        设置 status=ARCHIVED 和 deleted_at 时间戳。
        笔记不会从数据库中真正删除，但不会再出现在列表查询中。
        """
        note = self.get_note_model(owner_id=owner_id, note_id=note_id)
        note.status = NoteStatus.ARCHIVED
        note.mark_deleted()
        self.db.add(note)
        self.db.commit()

    def append_block(self, *, owner_id: str, note_id: str, request: NoteBlockCreateRequest) -> NoteBlock:
        """追加一个笔记块。

        参数:
            owner_id: 用户 ID
            note_id: 笔记 ID
            request.content: 块内容（不能为空）
            request.blockType: 块类型（默认 paragraph）
            request.position: 位置（不传则追加到末尾）
            request.metadata: 元数据（dict，如标题级别等）
        """
        self.get_note_model(owner_id=owner_id, note_id=note_id)
        position = request.position
        if position is None:
            position = self.db.execute(
                select(func.count()).select_from(NoteBlockModel).where(NoteBlockModel.note_id == note_id)
            ).scalar_one()
        block = NoteBlockModel(
            note_id=note_id,
            block_type=request.block_type,
            content=_require_text(request.content, "内容不能为空"),
            position=position,
            block_metadata=request.metadata,
        )
        self.db.add(block)
        self.db.commit()
        self.db.refresh(block)
        return to_note_block_schema(block)

    def update_block(self, *, owner_id: str, note_id: str, block_id: str, request: NoteBlockCreateRequest) -> NoteBlock:
        """更新指定笔记块。

        参数同 append_block，多一个 block_id 指定要修改的块。
        metadata 会与现有 metadata 合并（而非覆盖）。
        """
        self.get_note_model(owner_id=owner_id, note_id=note_id)
        block = self.db.execute(
            select(NoteBlockModel).where(NoteBlockModel.id == block_id, NoteBlockModel.note_id == note_id)
        ).scalar_one_or_none()
        if block is None:
            raise_not_found("笔记块不存在")
        block.content = _require_text(request.content, "内容不能为空")
        if request.block_type is not None:
            block.block_type = request.block_type
        if request.metadata:
            block.block_metadata = {**block.block_metadata, **request.metadata}
        if request.position is not None:
            block.position = request.position
        self.db.add(block)
        self.db.commit()
        self.db.refresh(block)
        return to_note_block_schema(block)

    def delete_block(self, *, owner_id: str, note_id: str, block_id: str) -> None:
        """删除指定笔记块（物理删除，不可恢复）。"""
        self.get_note_model(owner_id=owner_id, note_id=note_id)
        block = self.db.execute(
            select(NoteBlockModel).where(NoteBlockModel.id == block_id, NoteBlockModel.note_id == note_id)
        ).scalar_one_or_none()
        if block is None:
            raise_not_found("笔记块不存在")
        self.db.delete(block)
        self.db.commit()

    def save_blocks(self, *, owner_id: str, note_id: str, blocks: list) -> list[NoteBlock]:
        """批量保存块：删除已删除的块，更新已存在的块，创建新的块"""
        self.get_note_model(owner_id=owner_id, note_id=note_id)
        
        # 前端类型到后端类型的映射
        type_mapping = {
            'richText': NoteBlockType.PARAGRAPH,
            'markdown': NoteBlockType.THINKING,
            'todo': NoteBlockType.TODO,
            'image': NoteBlockType.ANNOTATION,
            'table': NoteBlockType.TABLE,
            'ai': NoteBlockType.AI_SUMMARY,
            'heading': NoteBlockType.HEADING,
            'paragraph': NoteBlockType.PARAGRAPH,
        }
        
        # 获取当前所有块，按 position 排序
        existing_blocks = self.db.execute(
            select(NoteBlockModel)
            .where(NoteBlockModel.note_id == note_id)
            .order_by(NoteBlockModel.position)
        ).scalars().all()
        
        result = []
        
        for index, block_data in enumerate(blocks):
            frontend_type = block_data.get('type', 'richText')
            # 映射前端类型到后端类型
            block_type = type_mapping.get(frontend_type, NoteBlockType.PARAGRAPH)
            content = block_data.get('content', '')
            metadata = block_data.get('metadata', {})
            
            # 通过位置匹配已存在的块
            if index < len(existing_blocks):
                # 更新已存在的块
                block = existing_blocks[index]
                block.block_type = block_type
                block.content = content
                block.position = index
                block.block_metadata = metadata
            else:
                # 创建新的块
                block = NoteBlockModel(
                    note_id=note_id,
                    block_type=block_type,
                    content=content,
                    position=index,
                    block_metadata=metadata,
                )
                self.db.add(block)
            
            result.append(block)
        
        # 删除多余的块（原来有但现在没有的）
        for i in range(len(blocks), len(existing_blocks)):
            self.db.delete(existing_blocks[i])
        
        self.db.commit()
        
        # 刷新并返回结果
        for block in result:
            if block.id:
                self.db.refresh(block)
        
        return [to_note_block_schema(block) for block in result]

    def add_relation(
        self,
        *,
        owner_id: str,
        note_id: str,
        request: NoteRelationCreateRequest,
    ) -> NoteRelation:
        """添加笔记关系（双链）。

        参数:
            owner_id: 用户 ID
            note_id: 源笔记 ID
            request.targetNoteId: 目标笔记 ID（不能与源笔记相同）
            request.relationType: 关系类型（backlink / reference / prerequisite / related）
            request.context: 关系描述（可选）
        """
        self.get_note_model(owner_id=owner_id, note_id=note_id)
        self.get_note_model(owner_id=owner_id, note_id=request.target_note_id)
        if note_id == request.target_note_id:
            raise_validation_error("笔记关系不能指向自身")
        relation = NoteRelationModel(
            owner_id=owner_id,
            source_note_id=note_id,
            target_note_id=request.target_note_id,
            relation_type=request.relation_type,
            context=request.context,
        )
        self.db.add(relation)
        self.db.commit()
        self.db.refresh(relation)
        return to_note_relation_schema(relation)

    def list_user_note_models(self, *, owner_id: str) -> list[NoteModel]:
        """返回该用户所有未删除的笔记 ORM 对象，供其他模块做聚合查询"""
        return (
            self.db.execute(
                select(NoteModel).where(
                    NoteModel.owner_id == owner_id,
                    NoteModel.deleted_at.is_(None),
                )
            ).scalars().all()
        )

    def get_note_model(self, *, owner_id: str, note_id: str, with_blocks: bool = False) -> NoteModel:
        """获取笔记 ORM 对象（供其他 service 内部调用）。

        参数:
            owner_id: 用户 ID
            note_id: 笔记 ID
            with_blocks: 是否同时加载 blocks（默认 False）
        返回:
            NoteModel 实例
        抛出:
            RESOURCE_NOT_FOUND — 笔记不存在或已删除
        """
        query = select(NoteModel).where(
            NoteModel.id == note_id,
            NoteModel.owner_id == owner_id,
            NoteModel.deleted_at.is_(None),
        )
        if with_blocks:
            query = query.options(selectinload(NoteModel.blocks))
        note = self.db.execute(query).scalar_one_or_none()
        if note is None:
            raise_not_found("笔记不存在")
        # 在 Python 中按 position 排序
        if with_blocks and note.blocks:
            note.blocks = sorted(note.blocks, key=lambda x: x.position)
        return note

    def _validate_course_scope(
        self,
        *,
        owner_id: str,
        course_id: str | None,
        learning_space_id: str | None,
    ) -> None:
        if course_id is not None:
            course = self.db.execute(
                select(CourseModel).where(
                    CourseModel.id == course_id,
                    CourseModel.owner_id == owner_id,
                    CourseModel.deleted_at.is_(None),
                )
            ).scalar_one_or_none()
            if course is None:
                raise_not_found("课程不存在")
        if learning_space_id is not None:
            space = self.db.execute(
                select(LearningSpaceModel).where(
                    LearningSpaceModel.id == learning_space_id,
                    LearningSpaceModel.owner_id == owner_id,
                    LearningSpaceModel.course_id == course_id,
                    LearningSpaceModel.deleted_at.is_(None),
                )
            ).scalar_one_or_none()
            if space is None:
                raise_not_found("学习空间不存在")

    def _get_resource(self, *, owner_id: str, resource_id: str) -> ResourceModel:
        resource = self.db.execute(
            select(ResourceModel).where(
                ResourceModel.id == resource_id,
                ResourceModel.owner_id == owner_id,
                ResourceModel.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if resource is None:
            raise_not_found("资源不存在")
        return resource

    def _resolve_course_name(self, course_id: str | None) -> str | None:
        if course_id is None:
            return None
        course = self.db.get(CourseModel, course_id)
        return course.name if course else None

    def _count(self, query: Select) -> int:
        return self.db.execute(select(func.count()).select_from(query.order_by(None).subquery())).scalar_one()


def to_note_schema(note: NoteModel, course_name: str | None = None, snippet: str | None = None) -> Note:
    return Note(
        id=note.id,
        owner_id=note.owner_id,
        title=note.title,
        course_id=note.course_id,
        course_name=course_name,
        learning_space_id=note.learning_space_id,
        source_resource_id=note.source_resource_id,

        note_type=note.note_type or "manual",

        tags=note.tags,
        status=note.status,
        mastery=note.mastery,
        snippet=snippet,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


def to_note_block_schema(block: NoteBlockModel) -> NoteBlock:
    meta = block.block_metadata or {}
    return NoteBlock(
        id=block.id,
        note_id=block.note_id,
        block_type=block.block_type,
        content=block.content,
        position=block.position,
        created_at=block.created_at,
        updated_at=block.updated_at,
        level=meta.get("level"),
        highlights=meta.get("highlights"),
        headers=meta.get("headers"),
        rows=meta.get("rows"),
        question=meta.get("question"),
        userAnswer=meta.get("userAnswer"),
        aiFollowUp=meta.get("aiFollowUp"),
        userAnswer2=meta.get("userAnswer2"),
        aiFeedback=meta.get("aiFeedback"),
        cards=meta.get("cards"),
        items=meta.get("items"),
    )


def to_note_relation_schema(relation: NoteRelationModel) -> NoteRelation:
    return NoteRelation(
        id=relation.id,
        owner_id=relation.owner_id,
        source_note_id=relation.source_note_id,
        target_note_id=relation.target_note_id,
        relation_type=relation.relation_type,
        context=relation.context,
        created_at=relation.created_at,
        updated_at=relation.updated_at,
    )


def _normalize_tags(tags: list[str]) -> list[str]:
    return sorted({tag.strip().lower() for tag in tags if tag.strip()})


def _require_text(value: str, message: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise_validation_error(message)
    return normalized


def raise_not_found(message: str) -> None:
    raise AppError(ErrorCode.RESOURCE_NOT_FOUND, message, status_code=status.HTTP_404_NOT_FOUND)


def raise_validation_error(message: str) -> None:
    raise AppError(
        ErrorCode.VALIDATION_ERROR,
        message,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )
