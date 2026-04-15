from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str


class PaginationParams(BaseModel):
    skip: int = 0
    limit: int = 50
