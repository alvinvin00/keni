import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlmodel import Field, SQLModel, text


class Wallet(SQLModel, table=True):
    __tablename__: str = "wallets"

    id: uuid.UUID = Field(
        default=None,
        primary_key=True,
        sa_column_kwargs={"server_default": text("gen_random_uuid()")},
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=100)
    currency: str = Field(max_length=10)
    type: str = Field(default="debit", max_length=10)
    credit_limit: float | None = Field(default=None)
    closing_day: int | None = Field(default=None)
    due_day: int | None = Field(default=None)
    created_at: datetime = Field(
        default=None,
        sa_column=sa.Column(
            sa.DateTime(timezone=True), server_default=text("NOW()"), nullable=False
        ),
    )
