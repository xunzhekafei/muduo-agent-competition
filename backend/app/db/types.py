from __future__ import annotations

from enum import Enum
from typing import TypeVar

from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import mapped_column


EnumT = TypeVar("EnumT", bound=Enum)


def enum_column(
    enum_type: type[EnumT],
    *column_args,
    default: EnumT | None = None,
    nullable: bool = False,
    index: bool = False,
):
    return mapped_column(
        *column_args,
        SqlEnum(
            enum_type,
            values_callable=lambda values: [item.value for item in values],
            native_enum=False,
            validate_strings=True,
        ),
        default=default,
        nullable=nullable,
        index=index,
    )
