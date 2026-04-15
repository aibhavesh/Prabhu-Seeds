"""
Integration tests for leave endpoints.
Requires TEST_DATABASE_URL (PostgreSQL).
"""
from datetime import date, timedelta

import pytest


_BASE_LEAVE = {
    "from_date": str(date.today() + timedelta(days=3)),
    "to_date": str(date.today() + timedelta(days=5)),
    "type": "casual",
    "reason": "Personal work",
}


class TestCreateLeave:
    @pytest.mark.asyncio
    async def test_create_leave_success(self, field_client, field_agent):
        resp = await field_client.post("/api/v1/leaves/", json=_BASE_LEAVE)
        assert resp.status_code == 201
        data = resp.json()
        assert data["user_id"] == str(field_agent.id)
        assert data["status"] == "pending"
        assert data["type"] == "casual"

    @pytest.mark.asyncio
    async def test_create_leave_returns_id(self, field_client):
        resp = await field_client.post("/api/v1/leaves/", json=_BASE_LEAVE)
        assert resp.status_code == 201
        assert isinstance(resp.json()["id"], int)


class TestListLeaves:
    @pytest.mark.asyncio
    async def test_list_empty(self, field_client):
        resp = await field_client.get("/api/v1/leaves/")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_after_create(self, field_client):
        await field_client.post("/api/v1/leaves/", json=_BASE_LEAVE)
        resp = await field_client.get("/api/v1/leaves/")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    @pytest.mark.asyncio
    async def test_owner_sees_all(self, owner_client, field_client):
        await field_client.post("/api/v1/leaves/", json=_BASE_LEAVE)
        resp = await owner_client.get("/api/v1/leaves/")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


class TestReviewLeave:
    @pytest.mark.asyncio
    async def _create_leave(self, field_client) -> int:
        resp = await field_client.post("/api/v1/leaves/", json=_BASE_LEAVE)
        return resp.json()["id"]

    @pytest.mark.asyncio
    async def test_approve_via_decision(self, manager_client, field_client, field_agent, manager):
        leave_id = await self._create_leave(field_client)
        resp = await manager_client.patch(
            f"/api/v1/leaves/{leave_id}", json={"decision": "approved"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "approved"
        assert data["approved_by"] == str(manager.id)

    @pytest.mark.asyncio
    async def test_reject_via_decision(self, manager_client, field_client, manager):
        leave_id = await self._create_leave(field_client)
        resp = await manager_client.patch(
            f"/api/v1/leaves/{leave_id}", json={"decision": "rejected"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    @pytest.mark.asyncio
    async def test_invalid_decision_rejected(self, manager_client, field_client):
        leave_id = await self._create_leave(field_client)
        resp = await manager_client.patch(
            f"/api/v1/leaves/{leave_id}", json={"decision": "maybe"}
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_nonexistent_leave_returns_404(self, manager_client):
        resp = await manager_client.patch(
            "/api/v1/leaves/99999", json={"decision": "approved"}
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_legacy_status_endpoint_still_works(self, manager_client, field_client):
        leave_id = await self._create_leave(field_client)
        resp = await manager_client.patch(
            f"/api/v1/leaves/{leave_id}/status", json={"status": "approved"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"
