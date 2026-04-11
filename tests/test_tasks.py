"""
Integration tests for task endpoints.
Requires TEST_DATABASE_URL (PostgreSQL).
"""
from datetime import date, timedelta

import pytest


def _task_payload(assigned_to_id=None, **kw):
    payload = {
        "title": "Distribute Maize Seeds",
        "dept": "marketing",
        "activity_type": "farmer_meeting",
        "target": 50,
        "unit": "farmers",
        "deadline": str(date.today() + timedelta(days=7)),
    }
    if assigned_to_id:
        payload["assigned_to"] = str(assigned_to_id)
    payload.update(kw)
    return payload


class TestCreateTask:
    @pytest.mark.asyncio
    async def test_create_task_success(self, manager_client, manager):
        resp = await manager_client.post("/api/v1/tasks/", json=_task_payload())
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Distribute Maize Seeds"
        assert data["status"] == "assigned"
        assert data["created_by"] == str(manager.id)

    @pytest.mark.asyncio
    async def test_create_task_with_assignment(self, manager_client, field_agent):
        resp = await manager_client.post(
            "/api/v1/tasks/", json=_task_payload(assigned_to_id=field_agent.id)
        )
        assert resp.status_code == 201
        assert resp.json()["assigned_to"] == str(field_agent.id)


class TestListTasks:
    @pytest.mark.asyncio
    async def test_empty_list(self, field_client):
        resp = await field_client.get("/api/v1/tasks/")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_field_sees_assigned_tasks(self, manager_client, field_client, field_agent):
        # manager creates task assigned to field agent
        await manager_client.post(
            "/api/v1/tasks/", json=_task_payload(assigned_to_id=field_agent.id)
        )
        resp = await field_client.get("/api/v1/tasks/")
        assert resp.status_code == 200
        tasks = resp.json()
        assert len(tasks) == 1
        assert tasks[0]["assigned_to"] == str(field_agent.id)

    @pytest.mark.asyncio
    async def test_owner_sees_all_tasks(self, owner_client, manager_client, field_agent):
        await manager_client.post(
            "/api/v1/tasks/", json=_task_payload(assigned_to_id=field_agent.id)
        )
        resp = await owner_client.get("/api/v1/tasks/")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_field_does_not_see_unassigned_tasks(
        self, manager_client, field_client, owner
    ):
        # task assigned to a different user (owner), field_agent should not see it
        await manager_client.post(
            "/api/v1/tasks/", json=_task_payload(assigned_to_id=owner.id)
        )
        resp = await field_client.get("/api/v1/tasks/")
        assert resp.status_code == 200
        assert resp.json() == []


class TestUpdateTask:
    @pytest.mark.asyncio
    async def test_update_status(self, manager_client):
        create = await manager_client.post("/api/v1/tasks/", json=_task_payload())
        task_id = create.json()["id"]
        resp = await manager_client.patch(
            f"/api/v1/tasks/{task_id}", json={"status": "running"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "running"

    @pytest.mark.asyncio
    async def test_update_nonexistent_task(self, manager_client):
        resp = await manager_client.patch(
            "/api/v1/tasks/99999", json={"status": "running"}
        )
        assert resp.status_code == 404
