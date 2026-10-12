"""
scheduler.py
------------
APScheduler-based background job for polling Google Sheets.

Runs poll_all_active_integrations() every 3 minutes.
Started on FastAPI startup, stopped on shutdown.

Rate limiting is handled inside the poller itself (1.5s delay between clients).
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

_scheduler = None


def start_scheduler():
    """
    Initialize and start the background scheduler.
    Called once from FastAPI startup event.
    """
    global _scheduler

    if _scheduler is not None:
        logger.info("[Scheduler] Already running, skipping duplicate start.")
        return

    _scheduler = BackgroundScheduler(
        job_defaults={
            "coalesce": True,        # If multiple runs pile up, run only once
            "max_instances": 1,      # Never run two poll cycles at the same time
            "misfire_grace_time": 60  # Allow up to 60s late execution
        }
    )

    from app.services.sheets_poller import poll_all_active_integrations

    _scheduler.add_job(
        poll_all_active_integrations,
        "interval",
        minutes=3,
        id="sheets_poller",
        name="Google Sheets Lead Poller",
        replace_existing=True
    )

    _scheduler.start()
    logger.info("[Scheduler] Started — Google Sheets poller running every 3 minutes.")


def stop_scheduler():
    """Stop the scheduler gracefully. Called on FastAPI shutdown."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("[Scheduler] Stopped.")
