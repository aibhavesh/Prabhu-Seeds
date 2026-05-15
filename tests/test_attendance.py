"""
Integration tests for attendance endpoints.
Requires TEST_DATABASE_URL (PostgreSQL).
"""
import pytest


class TestCheckIn:
    @pytest.mark.asyncio
    async def test_check_in_success(self, field_client, field_agent):
        resp = await field_client.post(
            "/api/v1/attendance/check-in",
            json={"lat": 18.5204, "lng": 73.8567},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["user_id"] == str(field_agent.id)
        assert data["check_in"] is not None
        assert data["check_out"] is None

    @pytest.mark.asyncio
    async def test_check_in_duplicate_rejected(self, field_client):
        await field_client.post(
            "/api/v1/attendance/check-in",
            json={"lat": 18.5204, "lng": 73.8567},
        )
        resp = await field_client.post(
            "/api/v1/attendance/check-in",
            json={"lat": 18.5204, "lng": 73.8567},
        )
        assert resp.status_code == 400
        assert "already" in resp.json()["detail"].lower()


class TestCheckOut:
    @pytest.mark.asyncio
    async def test_checkout_without_checkin_fails(self, field_client):
        resp = await field_client.post(
            "/api/v1/attendance/check-out",
            json={"lat": 18.5204, "lng": 73.8567, "km": 12.5},
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_checkin_then_checkout(self, field_client, field_agent):
        await field_client.post(
            "/api/v1/attendance/check-in",
            json={"lat": 18.5204, "lng": 73.8567},
        )
        resp = await field_client.post(
            "/api/v1/attendance/check-out",
            json={"lat": 18.5300, "lng": 73.8600, "km": 5.0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["check_out"] is not None
        assert data["km"] == 5.0
        assert data["status"] == "done"


class TestGetToday:
    @pytest.mark.asyncio
    async def test_no_checkin_returns_null(self, field_client):
        resp = await field_client.get("/api/v1/attendance/today")
        assert resp.status_code == 200
        assert resp.json() is None

    @pytest.mark.asyncio
    async def test_after_checkin_returns_record(self, field_client):
        await field_client.post(
            "/api/v1/attendance/check-in",
            json={"lat": 18.5204, "lng": 73.8567},
        )
        resp = await field_client.get("/api/v1/attendance/today")
        assert resp.status_code == 200
        assert resp.json() is not None


class TestListAttendance:
    @pytest.mark.asyncio
    async def test_list_empty(self, field_client):
        resp = await field_client.get("/api/v1/attendance/")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_after_checkin(self, field_client, field_agent):
        await field_client.post(
            "/api/v1/attendance/check-in",
            json={"lat": 18.5204, "lng": 73.8567},
        )
        resp = await field_client.get("/api/v1/attendance/")
        assert resp.status_code == 200
        records = resp.json()
        assert len(records) == 1
        assert records[0]["user_id"] == str(field_agent.id)

    @pytest.mark.asyncio
    async def test_owner_sees_all_users(self, owner_client, field_client, field_agent):
        # field checks in
        await field_client.post(
            "/api/v1/attendance/check-in",
            json={"lat": 18.5204, "lng": 73.8567},
        )
        # owner should see it
        resp = await owner_client.get("/api/v1/attendance/")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


class TestAttendanceReport:
    @pytest.mark.asyncio
    async def test_report_shape(self, owner_client):
        resp = await owner_client.get("/api/v1/attendance/report")
        assert resp.status_code == 200
        data = resp.json()
        assert "month" in data
        assert "summary" in data
        assert isinstance(data["summary"], list)
