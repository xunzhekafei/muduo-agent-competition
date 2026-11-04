from __future__ import annotations

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.import_export.service import ImportExportService
from app.modules.users.models import UserModel
from app.schemas.import_export import ExportJobCreateRequest, ImportJobCreateRequest


router = APIRouter(tags=["import-export"])


@router.post("/import-jobs", status_code=status.HTTP_202_ACCEPTED)
async def create_import_job(
    request: ImportJobCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    job = ImportExportService(db).create_import_job(owner_id=current_user.id, request=request)
    return data_response(job.model_dump(by_alias=True))


@router.get("/import-jobs/{jobId}")
async def get_import_job(
    job_id: str = Path(alias="jobId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    job = ImportExportService(db).get_import_job(owner_id=current_user.id, job_id=job_id)
    return data_response(job.model_dump(by_alias=True))


@router.post("/export-jobs", status_code=status.HTTP_202_ACCEPTED)
async def create_export_job(
    request: ExportJobCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    job = ImportExportService(db).create_export_job(owner_id=current_user.id, request=request)
    return data_response(job.model_dump(by_alias=True))


@router.get("/export-jobs/{jobId}")
async def get_export_job(
    job_id: str = Path(alias="jobId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    job = ImportExportService(db).get_export_job(owner_id=current_user.id, job_id=job_id)
    return data_response(job.model_dump(by_alias=True))
