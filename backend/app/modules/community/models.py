from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import InteractionType, SharedAssetType, Visibility


class SharedAssetModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "shared_assets"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("asset"),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[SharedAssetType] = enum_column(
        SharedAssetType,
        "type",
        nullable=False,
        index=True,
    )
    source_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    visibility: Mapped[Visibility] = enum_column(
        Visibility,
        default=Visibility.PUBLIC,
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)


class CommunityPostModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "community_posts"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("post"),
    )
    asset_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("shared_assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    body: Mapped[str] = mapped_column(String, nullable=False)


class CommunityInteractionModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "community_interactions"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("interaction"),
    )
    target_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    interaction_type: Mapped[InteractionType] = enum_column(
        InteractionType,
        "type",
        nullable=False,
        index=True,
    )
    body: Mapped[str | None] = mapped_column(String(2000), nullable=True)


class CollectionModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "collections"
    __table_args__ = (UniqueConstraint("owner_id", "asset_id", name="uq_collections_owner_asset"),)

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("collection"),
    )
    asset_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("shared_assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    note_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("notes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )


class ContributionRecordModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "contribution_records"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("contribution"),
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


__all__ = [
    "CollectionModel",
    "CommunityInteractionModel",
    "CommunityPostModel",
    "ContributionRecordModel",
    "SharedAssetModel",
]
