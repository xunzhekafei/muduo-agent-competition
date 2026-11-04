from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.community.service import CommunityService
from app.modules.users.models import UserModel
from app.schemas.community import (
    CollectionCreateRequest,
    CommunityInteractionCreateRequest,
    CommunityPostCreateRequest,
    SharedAssetCreateRequest,
)


router = APIRouter(prefix="/community", tags=["community"])


@router.get("/assets")
async def list_public_assets(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    tag: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
):
    assets, pagination = CommunityService(db).list_public_assets(
        page=page,
        page_size=page_size,
        tag=tag,
    )
    return {
        "data": [asset.model_dump(by_alias=True) for asset in assets],
        "pagination": pagination.model_dump(by_alias=True),
    }


@router.post("/assets", status_code=status.HTTP_201_CREATED)
async def publish_asset(
    request: SharedAssetCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    asset = CommunityService(db).publish_asset(owner_id=current_user.id, request=request)
    return data_response(asset.model_dump(by_alias=True))


@router.post("/assets/{assetId}/posts", status_code=status.HTTP_201_CREATED)
async def create_post(
    request: CommunityPostCreateRequest,
    asset_id: str = Path(alias="assetId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    post = CommunityService(db).create_post(
        owner_id=current_user.id,
        asset_id=asset_id,
        request=request,
    )
    return data_response(post.model_dump(by_alias=True))


@router.post("/interactions", status_code=status.HTTP_201_CREATED)
async def add_interaction(
    request: CommunityInteractionCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    interaction = CommunityService(db).add_interaction(owner_id=current_user.id, request=request)
    return data_response(interaction.model_dump(by_alias=True))


@router.post("/assets/{assetId}/collections", status_code=status.HTTP_201_CREATED)
async def collect_asset(
    request: CollectionCreateRequest | None = None,
    asset_id: str = Path(alias="assetId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    collection = CommunityService(db).collect_asset(
        owner_id=current_user.id,
        asset_id=asset_id,
        request=request or CollectionCreateRequest(),
    )
    return data_response(collection.model_dump(by_alias=True))


@router.get("/contributions")
async def list_contributions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    records, pagination = CommunityService(db).list_contributions(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
    )
    return {
        "data": [record.model_dump(by_alias=True) for record in records],
        "pagination": pagination.model_dump(by_alias=True),
    }
