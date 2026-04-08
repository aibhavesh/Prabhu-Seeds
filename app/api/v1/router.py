from fastapi import APIRouter
from app.api.v1 import auth, users, districts, dealers, products, orders, tasks, attendance, expenses, leaves, dashboard

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(districts.router, prefix="/districts", tags=["Districts"])
api_router.include_router(dealers.router, prefix="/dealers", tags=["Dealers"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(leaves.router, prefix="/leaves", tags=["Leaves"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
