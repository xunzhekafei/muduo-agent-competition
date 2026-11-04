from __future__ import annotations

from fastapi import status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorCode, raise_not_found, raise_validation_error, require_text
from app.modules.community.models import (
    CollectionModel,
    CommunityInteractionModel,
    CommunityPostModel,
    ContributionRecordModel,
    SharedAssetModel,
)
from app.schemas.common import Pagination
from app.schemas.community import (
    Collection,
    CollectionCreateRequest,
    CommunityInteraction,
    CommunityInteractionCreateRequest,
    CommunityPost,
    CommunityPostCreateRequest,
    ContributionRecord,
    SharedAsset,
    SharedAssetCreateRequest,
)
from app.schemas.enums import InteractionType, Visibility


class CommunityService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_public_assets(
        self,
        *,
        page: int,
        page_size: int,
        tag: str | None = None,
    ) -> tuple[list[SharedAsset], Pagination]:
        query = select(SharedAssetModel).where(SharedAssetModel.visibility == Visibility.PUBLIC)
        if tag:
            assets = [
                asset
                for asset in self.db.execute(query.order_by(SharedAssetModel.updated_at.desc())).scalars().all()
                if tag.strip().lower() in [item.lower() for item in asset.tags]
            ]
            total = len(assets)
            start = (page - 1) * page_size
            return (
                [to_shared_asset_schema(asset) for asset in assets[start : start + page_size]],
                Pagination(page=page, page_size=page_size, total=total),
            )
        total = self._count(query)
        assets = self.db.execute(
            query.order_by(SharedAssetModel.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
        ).scalars().all()
        return (
            [to_shared_asset_schema(asset) for asset in assets],
            Pagination(page=page, page_size=page_size, total=total),
        )

    def publish_asset(self, *, owner_id: str, request: SharedAssetCreateRequest) -> SharedAsset:
        asset = SharedAssetModel(
            owner_id=owner_id,
            title=require_text(request.title, "共享资产标题不能为空"),
            asset_type=request.asset_type,
            source_id=require_text(request.source_id, "共享资产来源不能为空"),
            visibility=request.visibility,
            description=request.description,
            tags=sorted({tag.strip().lower() for tag in request.tags if tag.strip()}),
        )
        self.db.add(asset)
        self.db.flush()
        self.db.add(
            ContributionRecordModel(
                owner_id=owner_id,
                action="publish_asset",
                target_id=asset.id,
                points=5,
            )
        )
        self.db.commit()
        self.db.refresh(asset)
        return to_shared_asset_schema(asset)

    def create_post(
        self,
        *,
        owner_id: str,
        asset_id: str,
        request: CommunityPostCreateRequest,
    ) -> CommunityPost:
        self.get_asset_model(asset_id=asset_id)
        post = CommunityPostModel(
            owner_id=owner_id,
            asset_id=asset_id,
            body=require_text(request.body, "帖子内容不能为空"),
        )
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return to_community_post_schema(post)

    def add_interaction(
        self,
        *,
        owner_id: str,
        request: CommunityInteractionCreateRequest,
    ) -> CommunityInteraction:
        if request.interaction_type == InteractionType.COMMENT and not (request.body and request.body.strip()):
            raise_validation_error("评论内容不能为空")
        interaction = CommunityInteractionModel(
            owner_id=owner_id,
            target_id=request.target_id,
            interaction_type=request.interaction_type,
            body=request.body.strip() if request.body else None,
        )
        self.db.add(interaction)
        self.db.commit()
        self.db.refresh(interaction)
        return to_community_interaction_schema(interaction)

    def collect_asset(
        self,
        *,
        owner_id: str,
        asset_id: str,
        request: CollectionCreateRequest,
    ) -> Collection:
        self.get_asset_model(asset_id=asset_id)
        collection = self.db.execute(
            select(CollectionModel).where(
                CollectionModel.owner_id == owner_id,
                CollectionModel.asset_id == asset_id,
            )
        ).scalar_one_or_none()
        if collection is None:
            collection = CollectionModel(owner_id=owner_id, asset_id=asset_id, note_id=request.note_id)
            self.db.add(collection)
            self.db.flush()
            self.db.add(
                ContributionRecordModel(
                    owner_id=owner_id,
                    action="collect_asset",
                    target_id=asset_id,
                    points=1,
                )
            )
            self.db.commit()
            self.db.refresh(collection)
        return to_collection_schema(collection)

    def list_contributions(
        self,
        *,
        owner_id: str,
        page: int,
        page_size: int,
    ) -> tuple[list[ContributionRecord], Pagination]:
        query = select(ContributionRecordModel).where(ContributionRecordModel.owner_id == owner_id)
        total = self._count(query)
        records = self.db.execute(
            query.order_by(ContributionRecordModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).scalars().all()
        return (
            [to_contribution_record_schema(record) for record in records],
            Pagination(page=page, page_size=page_size, total=total),
        )

    def get_asset_model(self, *, asset_id: str) -> SharedAssetModel:
        asset = self.db.execute(
            select(SharedAssetModel).where(SharedAssetModel.id == asset_id)
        ).scalar_one_or_none()
        if asset is None:
            raise_not_found("共享资产不存在")
        return asset

    def _count(self, query: Select) -> int:
        return self.db.execute(select(func.count()).select_from(query.order_by(None).subquery())).scalar_one()


def to_shared_asset_schema(asset: SharedAssetModel) -> SharedAsset:
    return SharedAsset(
        id=asset.id,
        owner_id=asset.owner_id,
        title=asset.title,
        asset_type=asset.asset_type,
        source_id=asset.source_id,
        visibility=asset.visibility,
        description=asset.description,
        tags=asset.tags,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


def to_community_post_schema(post: CommunityPostModel) -> CommunityPost:
    return CommunityPost(
        id=post.id,
        owner_id=post.owner_id,
        asset_id=post.asset_id,
        body=post.body,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


def to_community_interaction_schema(interaction: CommunityInteractionModel) -> CommunityInteraction:
    return CommunityInteraction(
        id=interaction.id,
        owner_id=interaction.owner_id,
        target_id=interaction.target_id,
        interaction_type=interaction.interaction_type,
        body=interaction.body,
        created_at=interaction.created_at,
        updated_at=interaction.updated_at,
    )


def to_collection_schema(collection: CollectionModel) -> Collection:
    return Collection(
        id=collection.id,
        owner_id=collection.owner_id,
        asset_id=collection.asset_id,
        note_id=collection.note_id,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


def to_contribution_record_schema(record: ContributionRecordModel) -> ContributionRecord:
    return ContributionRecord(
        id=record.id,
        owner_id=record.owner_id,
        action=record.action,
        target_id=record.target_id,
        points=record.points,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )

