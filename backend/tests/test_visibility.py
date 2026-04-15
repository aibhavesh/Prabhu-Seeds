"""
Pure unit tests for app/services/visibility.py.
No database required.
"""
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.visibility import (
    can_see_dealer,
    can_see_task,
    get_subordinate_ids,
)


# ---------------------------------------------------------------------------
# can_see_task
# ---------------------------------------------------------------------------
class TestCanSeeTask:
    def _uid(self):
        return uuid.uuid4()

    def test_owner_sees_everything(self):
        assert can_see_task(self._uid(), self._uid(), self._uid(), "OWNER", []) is True

    def test_assigned_to_self(self):
        uid = self._uid()
        assert can_see_task(self._uid(), uid, uid, "FIELD", []) is True

    def test_created_by_self(self):
        uid = self._uid()
        assert can_see_task(uid, self._uid(), uid, "MANAGER", []) is True

    def test_assigned_to_subordinate(self):
        uid = self._uid()
        sub = self._uid()
        assert can_see_task(self._uid(), sub, uid, "MANAGER", [sub]) is True

    def test_created_by_subordinate(self):
        uid = self._uid()
        sub = self._uid()
        assert can_see_task(sub, self._uid(), uid, "MANAGER", [sub]) is True

    def test_unrelated_task_not_visible(self):
        uid = self._uid()
        other = self._uid()
        assert can_see_task(other, other, uid, "FIELD", []) is False

    def test_none_assigned_to_does_not_match_self(self):
        uid = self._uid()
        assert can_see_task(self._uid(), None, uid, "FIELD", []) is False


# ---------------------------------------------------------------------------
# can_see_dealer
# ---------------------------------------------------------------------------
class TestCanSeeDealer:
    def _uid(self):
        return uuid.uuid4()

    def test_owner_sees_all(self):
        assert can_see_dealer(self._uid(), [], self._uid(), "OWNER", []) is True

    def test_added_by_self(self):
        uid = self._uid()
        assert can_see_dealer(uid, [], uid, "MANAGER", []) is True

    def test_user_in_assigned_list(self):
        uid = self._uid()
        assert can_see_dealer(self._uid(), [uid], uid, "FIELD", []) is True

    def test_subordinate_in_assigned_list(self):
        uid = self._uid()
        sub = self._uid()
        assert can_see_dealer(self._uid(), [sub], uid, "MANAGER", [sub]) is True

    def test_dealer_added_by_subordinate(self):
        uid = self._uid()
        sub = self._uid()
        assert can_see_dealer(sub, [], uid, "MANAGER", [sub]) is True

    def test_unrelated_dealer_not_visible(self):
        uid = self._uid()
        other = self._uid()
        assert can_see_dealer(other, [other], uid, "FIELD", []) is False


# ---------------------------------------------------------------------------
# get_subordinate_ids (mocked DB)
# ---------------------------------------------------------------------------
class TestGetSubordinateIds:
    async def _run(self, manager_id, rows):
        db = AsyncMock()
        db.execute.return_value.all.return_value = rows
        return await get_subordinate_ids(manager_id, db)

    @pytest.mark.asyncio
    async def test_no_subordinates(self):
        uid = uuid.uuid4()
        rows = [MagicMock(id=uid, manager_id=None)]
        result = await self._run(uid, rows)
        assert result == []

    @pytest.mark.asyncio
    async def test_direct_subordinates(self):
        mgr = uuid.uuid4()
        sub1, sub2 = uuid.uuid4(), uuid.uuid4()
        rows = [
            MagicMock(id=mgr, manager_id=None),
            MagicMock(id=sub1, manager_id=mgr),
            MagicMock(id=sub2, manager_id=mgr),
        ]
        result = await self._run(mgr, rows)
        assert set(result) == {sub1, sub2}

    @pytest.mark.asyncio
    async def test_nested_subordinates(self):
        mgr = uuid.uuid4()
        mid = uuid.uuid4()  # manager's direct report
        leaf = uuid.uuid4()  # mid's direct report
        rows = [
            MagicMock(id=mgr, manager_id=None),
            MagicMock(id=mid, manager_id=mgr),
            MagicMock(id=leaf, manager_id=mid),
        ]
        result = await self._run(mgr, rows)
        assert set(result) == {mid, leaf}

    @pytest.mark.asyncio
    async def test_manager_not_in_own_subordinates(self):
        mgr = uuid.uuid4()
        sub = uuid.uuid4()
        rows = [
            MagicMock(id=mgr, manager_id=None),
            MagicMock(id=sub, manager_id=mgr),
        ]
        result = await self._run(mgr, rows)
        assert mgr not in result
