# /backend/celery_app.py

from celery import Celery
from celery.signals import worker_ready, worker_process_init
import os
from dotenv import load_dotenv
import logging

load_dotenv()

@worker_ready.connect
def configure_worker_logging(sender=None, **kwargs):
    """Configure Cairo timezone logging when worker is ready"""
    from utils.logging_config import configure_cairo_logging
    configure_cairo_logging()
    logging.info("Worker logging configured with Cairo timezone")

@worker_process_init.connect
def configure_worker_process_logging(sender=None, **kwargs):
    """Configure Cairo timezone logging for each worker process"""
    from utils.logging_config import configure_cairo_logging
    configure_cairo_logging()

# Use the environment variables we set up
celery_app = Celery(
    "tasks",
    broker=os.getenv("CELERY_BROKER_URL"),
    backend=os.getenv("CELERY_RESULT_BACKEND"),
    include=["tasks"] # Tell Celery where to find tasks
)

# Enhanced configuration for better Windows compatibility
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Cairo",
    enable_utc=False,
    # Add transport options to prevent Redis connection drops
    broker_transport_options={
        'visibility_timeout': 43200  # 12 hours
    },
    task_always_eager=False,
    task_eager_propagates=True,
    # Connection settings for better reliability
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    # Result backend settings
    result_expires=3600,  # 1 hour
    result_persistent=True,
    # Task execution settings
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Beat scheduler settings
    beat_scheduler="celery.beat:PersistentScheduler",
    beat_schedule_filename="celerybeat-schedule",
    # Queue definitions
    task_queues = {
        "celery": {
            "exchange": "celery",
            "routing_key": "celery",
        },
        "manual": {
            "exchange": "manual",
            "routing_key": "manual",
        },
        "background": {
            "exchange": "background",
            "routing_key": "background",
        },
    },
    task_routes = {
        'tasks.queue_all_users_scrape': {'queue': 'background'},
        'tasks.check_for_deadline_reminders': {'queue': 'background'},
    }
)

# Configure Celery Beat schedule for automated scraping
celery_app.conf.beat_schedule = {
    'master-scheduler-every-hour': {
        'task': 'tasks.queue_all_users_scrape',
        'schedule': 3600.0, # 1 hour in seconds
        'options': {
            'expires': 3300,  # Expire after 55 minutes to avoid overlap
        }
    },
    'check-for-deadline-reminders-hourly': {
        'task': 'tasks.check_for_deadline_reminders',
        'schedule': 3600.0, # Every hour
    },
}