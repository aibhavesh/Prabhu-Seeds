"""
Integration tests for notification endpoints.
Requires TEST_DATABASE_URL (PostgreSQL).
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def _seed_notification(db: AsyncSession, user_id, message="Test notification"):
    notif = Notification(user_id=user_id, message=message)
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif


class TestListNotifications:
    @pytest.mark.asyncio
    async def test_empty_when_no_notifications(self, field_client):
        resp = await field_client.get("/api/v1/notifications/")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_returns_own_notifications(self, field_client, field_agent, db):
        await _seed_notification(db, field_agent.id, "Hello field")
        resp = await field_client.get("/api/v1/notifications/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["message"] == "Hello field"

    @pytest.mark.asyncio
    async def test_unread_filter(self, field_client, field_agent, db):
        notif = await _seed_notification(db, field_agent.id)

        # ?unread=true should return it (not yet read)
        resp = await field_client.get("/api/v1/notifications/?unread=true")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        # after marking read, unread filter should return empty
        await field_client.patch(f"/api/v1/notifications/{notif.id}/read")
        resp = await field_client.get("/api/v1/notifications/?unread=true")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_unread_only_alias(self, field_client, field_agent, db):
        """?unread_only=true is equivalent to ?unread=true."""
        await _seed_notification(db, field_agent.id)
        resp = await field_client.get("/api/v1/notifications/?unread_only=true")
        assert resp.status_code == 200
        assert len(resp.json()) == 1


class TestMarkRead:
    @pytest.mark.asyncio
    async def test_mark_single_notification_read(self, field_client, field_agent, db):
        notif = await _seed_notification(db, field_agent.id)
        assert notif.read_at is None

        resp = await field_client.patch(f"/api/v1/notifications/{notif.id}/read")
        assert resp.status_code == 200
        assert resp.json()["read_at"] is not None

    @pytest.mark.asyncio
    async def test_mark_read_idempotent(self, field_client, field_agent, db):
        """Calling mark-read twice should not raise an error."""
        notif = await _seed_notification(db, field_agent.id)
        await field_client.patch(f"/api/v1/notifications/{notif.id}/read")
        resp = await field_client.patch(f"/api/v1/notifications/{notif.id}/read")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_bulk_mark_read(self, field_client, field_agent, db):
        n1 = await _seed_notification(db, field_agent.id, "msg1")
        n2 = await _seed_notification(db, field_agent.id, "msg2")
        resp = await field_client.post(
            "/api/v1/notifications/mark-read",
            json={"notification_ids": [n1.id, n2.id]},
        )
        assert resp.status_code == 200
        assert resp.json()["marked"] == 2
