from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.wallet import WalletCreate, WalletResponse, WalletSummary, WalletUpdate
from app.services.transaction_group import counted_filter

router = APIRouter(prefix="/api/wallets", tags=["wallets"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _wallet_to_response(wallet: Wallet) -> WalletResponse:
    return WalletResponse(
        id=wallet.id,
        user_id=wallet.user_id,
        name=wallet.name,
        currency=wallet.currency,
        type=wallet.type,
        credit_limit=wallet.credit_limit,
        closing_day=wallet.closing_day,
        due_day=wallet.due_day,
        created_at=wallet.created_at,
    )


async def _get_wallet_or_404(
    wallet_id: uuid.UUID, user_id: uuid.UUID, session: AsyncSession
) -> Wallet:
    result = await session.exec(
        select(Wallet).where(Wallet.id == wallet_id, Wallet.user_id == user_id)
    )
    wallet = result.first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")
    return wallet


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_wallet(
    body: WalletCreate, current_user: CurrentUser, session: DbDep
) -> WalletResponse:
    wallet = Wallet(
        user_id=current_user.id,
        name=body.name,
        currency=body.currency,
        type=body.type,
        credit_limit=body.credit_limit,
        closing_day=body.closing_day,
        due_day=body.due_day,
    )
    session.add(wallet)
    await session.commit()
    await session.refresh(wallet)
    return _wallet_to_response(wallet)


@router.get("")
async def list_wallets(current_user: CurrentUser, session: DbDep) -> list[WalletResponse]:
    result = await session.exec(select(Wallet).where(Wallet.user_id == current_user.id))
    return [_wallet_to_response(w) for w in result.all()]


@router.get("/{wallet_id}")
async def get_wallet(
    wallet_id: uuid.UUID, current_user: CurrentUser, session: DbDep
) -> WalletSummary:
    wallet = await _get_wallet_or_404(wallet_id, current_user.id, session)
    counted = counted_filter(current_user.count_sub_transactions)

    expense_total_result = await session.exec(
        select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
            Transaction.wallet_id == wallet_id, Transaction.type == "expense", counted
        )
    )
    total_expenses = expense_total_result.one()

    expense_count_result = await session.exec(
        select(func.count()).select_from(
            select(Transaction)
            .where(Transaction.wallet_id == wallet_id, Transaction.type == "expense", counted)
            .subquery()
        )
    )
    expense_count = expense_count_result.one()

    income_total_result = await session.exec(
        select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
            Transaction.wallet_id == wallet_id, Transaction.type == "income", counted
        )
    )
    total_income = income_total_result.one()

    income_count_result = await session.exec(
        select(func.count()).select_from(
            select(Transaction)
            .where(Transaction.wallet_id == wallet_id, Transaction.type == "income", counted)
            .subquery()
        )
    )
    income_count = income_count_result.one()

    return WalletSummary(
        id=wallet.id,
        user_id=wallet.user_id,
        name=wallet.name,
        currency=wallet.currency,
        type=wallet.type,
        credit_limit=wallet.credit_limit,
        closing_day=wallet.closing_day,
        due_day=wallet.due_day,
        created_at=wallet.created_at,
        total_expenses=float(total_expenses),
        expense_count=int(expense_count),
        total_income=float(total_income),
        income_count=int(income_count),
        balance=float(total_income) - float(total_expenses),
    )


@router.patch("/{wallet_id}")
async def update_wallet(
    wallet_id: uuid.UUID, body: WalletUpdate, current_user: CurrentUser, session: DbDep
) -> WalletResponse:
    wallet = await _get_wallet_or_404(wallet_id, current_user.id, session)

    if body.type == "debit" and (
        body.credit_limit is not None or body.closing_day is not None or body.due_day is not None
    ):
        msg = "credit fields require a credit wallet"
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)
    if (
        wallet.type == "debit"
        and body.type is None
        and (
            body.credit_limit is not None
            or body.closing_day is not None
            or body.due_day is not None
        )
    ):
        msg = "credit fields require a credit wallet"
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)

    updates = body.model_dump(exclude_unset=True)
    # name/currency are NOT NULL and were never clearable — ignore explicit nulls.
    for field in ("name", "currency"):
        if updates.get(field) is None:
            updates.pop(field, None)
    for field, value in updates.items():
        setattr(wallet, field, value)

    session.add(wallet)
    await session.commit()
    await session.refresh(wallet)
    return _wallet_to_response(wallet)


@router.delete("/{wallet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wallet(wallet_id: uuid.UUID, current_user: CurrentUser, session: DbDep) -> None:
    wallet = await _get_wallet_or_404(wallet_id, current_user.id, session)
    await session.delete(wallet)
    await session.commit()
