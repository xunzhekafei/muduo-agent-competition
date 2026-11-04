from fastapi import APIRouter, Depends, File, UploadFile, Form, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.errors import raise_validation_error
from app.db.session import get_db_session
from app.modules.quick_notes.service import QuickNotesService
from app.modules.users.models import UserModel

router = APIRouter(prefix="/quick-notes", tags=["quick-notes"])


@router.post("/timetree/process-video")
async def process_video(
    file: UploadFile = File(...),
    rootNoteId: str = Form(default=""),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """上传视频并生成知识点树

    流程:
    1. 保存上传文件
    2. 用 ffmpeg 提取音频（如果可用）
    3. 用 AI 生成树结构
    4. 返回节点列表
    """
    if not file.filename:
        raise_validation_error("文件名不能为空")

    # 保存上传文件
    import tempfile, os
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"upload_{file.filename}")
    try:
        content = await file.read()
        if len(content) > 200 * 1024 * 1024:  # 200MB 限制
            raise_validation_error("文件过大（最大 200MB）")
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise_validation_error(f"文件保存失败: {e}")

    try:
        nodes = QuickNotesService(db).process_video(file_path, file.filename)
        return {"data": {"nodes": nodes}}
    except Exception as e:
        raise_validation_error(f"处理失败: {e}")
    finally:
        try:
            os.unlink(file_path)
        except Exception:
            pass


@router.post("/timetree/ai-build")
async def ai_build(
    text: str = Form(...),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """从文本用 AI 生成知识点树"""
    nodes = QuickNotesService(db)._ai_build_tree("知识点", text)
    return {"data": {"nodes": nodes}}
