import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.db.models import Alert, AlertCondition, AlertHistory, User

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertCreate(BaseModel):
    coin_id: str = Field(min_length=1)
    coin_name: str = Field(min_length=1)
    condition: AlertCondition
    threshold: float


class AlertResponse(BaseModel):
    id: str
    coin_id: str
    coin_name: str
    condition: str
    threshold: float
    is_active: bool
    created_at: datetime


class AlertHistoryResponse(BaseModel):
    id: str
    alert_id: str
    coin_id: str
    coin_name: str
    condition: str
    threshold: float
    price_at_trigger: float
    change_24h: float | None
    triggered_at: datetime
    email_sent: bool


# NOTE: /history must be declared before /{id} to avoid FastAPI routing conflict
@router.get("/history", response_model=list[AlertHistoryResponse])
async def list_alert_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertHistory)
        .where(AlertHistory.user_id == current_user.id)
        .order_by(AlertHistory.triggered_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.scalars().all()
    return [
        AlertHistoryResponse(
            id=str(row.id),
            alert_id=str(row.alert_id),
            coin_id=row.coin_id,
            coin_name=row.coin_name,
            condition=row.condition.value,
            threshold=row.threshold,
            price_at_trigger=row.price_at_trigger,
            change_24h=row.change_24h,
            triggered_at=row.triggered_at,
            email_sent=row.email_sent,
        )
        for row in rows
    ]


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert)
        .where(Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
    )
    alerts = result.scalars().all()
    return [
        AlertResponse(
            id=str(a.id),
            coin_id=a.coin_id,
            coin_name=a.coin_name,
            condition=a.condition.value,
            threshold=a.threshold,
            is_active=a.is_active,
            created_at=a.created_at,
        )
        for a in alerts
    ]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=AlertResponse)
async def create_alert(
    body: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = Alert(
        user_id=current_user.id,
        coin_id=body.coin_id.strip(),
        coin_name=body.coin_name.strip(),
        condition=body.condition,
        threshold=body.threshold,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return AlertResponse(
        id=str(alert.id),
        coin_id=alert.coin_id,
        coin_name=alert.coin_name,
        condition=alert.condition.value,
        threshold=alert.threshold,
        is_active=alert.is_active,
        created_at=alert.created_at,
    )


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    await db.delete(alert)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
