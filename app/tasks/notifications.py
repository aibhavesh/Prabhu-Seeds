from app.worker import celery_app


@celery_app.task(name="tasks.send_sms_notification")
def send_sms_notification_task(mobile: str, message: str) -> bool:
    """Background task: send SMS via MSG91."""
    import asyncio
    from app.integrations.msg91 import send_otp  # reuse httpx client pattern

    async def _send() -> bool:
        import httpx
        from app.core.config import settings
        if not settings.MSG91_AUTH_KEY:
            return True  # dev mode
        params = {
            "authkey": settings.MSG91_AUTH_KEY,
            "mobiles": f"91{mobile}",
            "message": message,
            "sender": settings.MSG91_SENDER_ID,
            "route": "4",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://api.msg91.com/api/sendhttp.php", params=params)
            return resp.status_code == 200

    return asyncio.run(_send())


@celery_app.task(name="tasks.notify_task_assigned")
def notify_task_assigned(assignee_mobile: str, task_title: str, assigner_name: str) -> None:
    msg = f"PGA AgriTask: New task assigned to you - '{task_title}' by {assigner_name}. Login to view details."
    send_sms_notification_task.delay(assignee_mobile, msg)


@celery_app.task(name="tasks.notify_expense_status")
def notify_expense_status(user_mobile: str, status: str, amount: str) -> None:
    msg = f"PGA AgriTask: Your expense claim of Rs.{amount} has been {status}."
    send_sms_notification_task.delay(user_mobile, msg)


@celery_app.task(name="tasks.notify_leave_status")
def notify_leave_status(user_mobile: str, status: str, from_date: str, to_date: str) -> None:
    msg = f"PGA AgriTask: Your leave from {from_date} to {to_date} has been {status}."
    send_sms_notification_task.delay(user_mobile, msg)
