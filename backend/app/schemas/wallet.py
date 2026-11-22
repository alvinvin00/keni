import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class WalletCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    currency: str = Field(min_length=1, max_length=10)
    type: Literal["debit", "credit"] = "debit"
    credit_limit: float | None = Field(default=None, gt=0)
    closing_day: int | None = Field(default=None, ge=1, le=31)
    due_day: int | None = Field(default=None, ge=1, le=31)

    @model_validator(mode="after")
    def _credit_fields_only_for_credit(self) -> WalletCreate:
        if self.type == "debit" and (
            self.credit_limit is not None
            or self.closing_day is not None
            or self.due_day is not None
        ):
            msg = "credit fields require type='credit'"
            raise ValueError(msg)
        return self


class WalletUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    currency: str | None = Field(default=None, min_length=1, max_length=10)
    type: Literal["debit", "credit"] | None = None
    credit_limit: float | None = Field(default=None, gt=0)
    closing_day: int | None = Field(default=None, ge=1, le=31)
    due_day: int | None = Field(default=None, ge=1, le=31)

    @model_validator(mode="after")
    def _credit_fields_only_for_credit(self) -> WalletUpdate:
        # When `type` is omitted, the stored wallet's type decides — the router
        # enforces that check; the schema only guards explicit contradictions.
        if self.type is None:
            return self
        if self.type == "debit" and (
            self.credit_limit is not None
            or self.closing_day is not None
            or self.due_day is not None
        ):
            msg = "credit fields require type='credit'"
            raise ValueError(msg)
        return self


class WalletResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    currency: str
    type: str = "debit"
    credit_limit: float | None = None
    closing_day: int | None = None
    due_day: int | None = None
    created_at: datetime


class WalletSummary(WalletResponse):
    total_expenses: float
    expense_count: int
    total_income: float
    income_count: int
    balance: float
