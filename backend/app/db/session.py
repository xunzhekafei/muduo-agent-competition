from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.db.base import Base


def build_engine(database_url: str, *, echo: bool = False) -> Engine:
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(
        database_url,
        echo=echo,
        pool_pre_ping=True,
        connect_args=connect_args,
    )


_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_engine(settings: Settings | None = None) -> Engine:
    global _engine

    if _engine is None:
        active_settings = settings or get_settings()
        _engine = build_engine(
            active_settings.database_url,
            echo=active_settings.database_echo,
        )
    return _engine


def get_session_factory(settings: Settings | None = None) -> sessionmaker[Session]:
    global _session_factory

    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(settings),
            autoflush=False,
            expire_on_commit=False,
        )
    return _session_factory


def get_db_session() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def init_db(engine: Engine | None = None) -> None:
    import app.db.models  # noqa: F401

    Base.metadata.create_all(bind=engine or get_engine())


def reset_engine_cache() -> None:
    global _engine, _session_factory

    _engine = None
    _session_factory = None
