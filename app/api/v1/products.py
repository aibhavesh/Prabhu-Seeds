from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from app.services import product_service

router = APIRouter()


@router.get("/", response_model=list[ProductOut])
async def list_products(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 200,
) -> list:
    return await product_service.list_products(db, skip=skip, limit=limit)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: str,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    product = await product_service.get_product(product_id, db)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    _: Annotated[User, Depends(require_roles("OWNER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await product_service.create_product(body, db)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    body: ProductUpdate,
    _: Annotated[User, Depends(require_roles("OWNER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    product = await product_service.update_product(product_id, body, db)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product
