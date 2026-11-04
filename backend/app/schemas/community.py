from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse, ListResponse
from app.schemas.enums import InteractionType, SharedAssetType, Visibility


class SharedAsset(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    title: str
    asset_type: SharedAssetType = Field(alias="assetType")
    source_id: str = Field(alias="sourceId")
    visibility: Visibility
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class CommunityPost(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    asset_id: str = Field(alias="assetId")
    body: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class CommunityInteraction(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    target_id: str = Field(alias="targetId")
    interaction_type: InteractionType = Field(alias="interactionType")
    body: str | None = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class Collection(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    asset_id: str = Field(alias="assetId")
    note_id: str | None = Field(default=None, alias="noteId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ContributionRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    action: str
    target_id: str = Field(alias="targetId")
    points: int
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class SharedAssetCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    asset_type: SharedAssetType = Field(alias="assetType")
    source_id: str = Field(alias="sourceId")
    visibility: Visibility = Visibility.PUBLIC
    description: str | None = None
    tags: list[str] = Field(default_factory=list)


class CommunityPostCreateRequest(BaseModel):
    body: str


class CommunityInteractionCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    target_id: str = Field(alias="targetId")
    interaction_type: InteractionType = Field(alias="interactionType")
    body: str | None = None


class CollectionCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    note_id: str | None = Field(default=None, alias="noteId")


SharedAssetResponse = DataResponse[SharedAsset]
SharedAssetListResponse = ListResponse[SharedAsset]
CommunityPostResponse = DataResponse[CommunityPost]
CommunityInteractionResponse = DataResponse[CommunityInteraction]
CollectionResponse = DataResponse[Collection]
ContributionRecordListResponse = ListResponse[ContributionRecord]
