# /backend/tasks.py
from celery_app import celery_app
from scraper.scraper_logic import run_scrape_for_user
from scraper.enhanced_scraper import run_enhanced_scrape_for_user
from notifications.unified_notifier import send_unified_notifications
from db.supabase_client import get_supabase_client
from core.security import decrypt_password
from utils.date_processor import process_scraped_data_dates, parse_deadline_date
from utils.error_tracker import ErrorTracker
from datetime import datetime, timedelta
from supabase import Client

import logging
import traceback
import gc
from utils.logging_config import configure_cairo_logging
from utils.memory_monitor import log_memory_usage

def send_first_scan_notification(scraped_data: dict, user_prefs: dict, user_id: str) -> int:
    """
    Send notification for first scan containing ALL found data.
    Returns the count of items found.
    """
    try:
        from notifications.unified_notifier import UnifiedNotifier
        
        notifier = UnifiedNotifier(user_id)
        notifier.send_first_scrape_confirmation(scraped_data)
        
        # Count all items found
        total_items = 0
        if 'quizzes' in scraped_data:
            total_items += len(scraped_data['quizzes'].get('quizzes_with_results', []))
            total_items += len(scraped_data['quizzes'].get('quizzes_without_results', []))
        if 'assignments' in scraped_data:
            total_items += len(scraped_data['assignments'].get('assignments', []))
        if 'absences' in scraped_data:
            total_items += len(scraped_data['absences'].get('absences', []))
        
        logging.info(f"First scan notification sent for user {user_id}. Total items: {total_items}")
        return total_items
        
    except Exception as e:
        logging.error(f"Error sending first scan notification for user {user_id}: {e}")
        return 0

def compare_and_notify(last_data: dict, new_data: dict, user_prefs: dict, user_id: str) -> int:
    """
    Compare previous scrape data with new data and send notifications only for new items.
    Returns the count of new items found.
    """
    try:
        new_items_count = 0
        new_items = {
            'quizzes_with_results': [],
            'quizzes_without_results': [],
            'assignments': [],
            'absences': []
        }
        
        # Compare quizzes with results
        if 'quizzes' in new_data and 'quizzes' in last_data:
            old_quizzes_with_results = last_data['quizzes'].get('quizzes_with_results', [])
            new_quizzes_with_results = new_data['quizzes'].get('quizzes_with_results', [])
            
            # Create sets of unique identifiers for comparison
            old_quiz_ids = {f"{q.get('course', '')}-{q.get('name', '')}" for q in old_quizzes_with_results}
            
            for quiz in new_quizzes_with_results:
                quiz_id = f"{quiz.get('course', '')}-{quiz.get('name', '')}"
                if quiz_id not in old_quiz_ids:
                    new_items['quizzes_with_results'].append(quiz)
                    new_items_count += 1
        
        # Compare quizzes without results
        if 'quizzes' in new_data and 'quizzes' in last_data:
            old_quizzes_without_results = last_data['quizzes'].get('quizzes_without_results', [])
            new_quizzes_without_results = new_data['quizzes'].get('quizzes_without_results', [])
            
            old_quiz_ids = {f"{q.get('course', '')}-{q.get('name', '')}" for q in old_quizzes_without_results}
            
            for quiz in new_quizzes_without_results:
                quiz_id = f"{quiz.get('course', '')}-{quiz.get('name', '')}"
                if quiz_id not in old_quiz_ids:
                    new_items['quizzes_without_results'].append(quiz)
                    new_items_count += 1
        
        # Compare assignments
        if 'assignments' in new_data and 'assignments' in last_data:
            old_assignments = last_data['assignments'].get('assignments', [])
            new_assignments = new_data['assignments'].get('assignments', [])
            
            old_assignment_ids = {f"{a.get('course', '')}-{a.get('name', '')}" for a in old_assignments}
            
            for assignment in new_assignments:
                assignment_id = f"{assignment.get('course', '')}-{assignment.get('name', '')}"
                if assignment_id not in old_assignment_ids:
                    new_items['assignments'].append(assignment)
                    new_items_count += 1
        
        # Compare absences
        if 'absences' in new_data and 'absences' in last_data:
            old_absences = last_data['absences'].get('absences', [])
            new_absences = new_data['absences'].get('absences', [])
            
            old_absence_ids = {f"{a.get('course', '')}-{a.get('date', '')}-{a.get('type', '')}" for a in old_absences}
            
            for absence in new_absences:
                absence_id = f"{absence.get('course', '')}-{absence.get('date', '')}-{absence.get('type', '')}"
                if absence_id not in old_absence_ids:
                    new_items['absences'].append(absence)
                    new_items_count += 1
        
        # Send notifications only if there are new items
        if new_items_count > 0:
            from notifications.unified_notifier import UnifiedNotifier
            notifier = UnifiedNotifier(user_id)
            notifier.send_new_items_notification(new_items)
            logging.info(f"New items notification sent for user {user_id}. New items: {new_items_count}")
        else:
            logging.info(f"No new items found for user {user_id}. No notification sent.")
        
        return new_items_count
        
    except Exception as e:
        logging.error(f"Error comparing and notifying for user {user_id}: {e}")
        return 0

# Configure Cairo timezone for logging
configure_cairo_logging()

@celery_app.task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 2, 'countdown': 60})
def execute_scrape_task(self, user_id: str, queue_type: str = 'manual'):
    """
    (REVISED) Celery task to perform a scrape for a user.
    - Updates task state for real-time progress.
    - Returns a structured dictionary.
    """
    logging.info(f"Executing scrape task for user_id: {user_id}")
    log_memory_usage("task start")
    db = get_supabase_client()
    
    def update_state(state, meta):
        self.update_state(state=state, meta=meta)
        logging.info(f"Task {self.request.id} state updated to {state}: {meta}")

    try:
        update_state('PROGRESS', {'status': 'Initializing secure connection', 'percentage': 5})
        
        update_state('PROGRESS', {'status': 'Fetching agent credentials', 'percentage': 10})
        try:
            creds_response = db.table('user_credentials').select('*').eq('user_id', user_id).single().execute()
            if not creds_response.data:
                raise ValueError(f"No credentials found for user_id: {user_id}")
            creds = creds_response.data
        except Exception as e:
            raise ValueError(f"No credentials found for user_id: {user_id}. Error: {e}")

        update_state('PROGRESS', {'status': 'Decrypting access keys', 'percentage': 15})
        password = decrypt_password(creds['dulms_password_encrypted'])

        update_state('PROGRESS', {'status': 'Launching stealth browser', 'percentage': 20})
        update_state('PROGRESS', {'status': 'Establishing target connection', 'percentage': 25})
        update_state('PROGRESS', {'status': 'Bypassing security protocols', 'percentage': 30})
        
        # Use enhanced scraper with error tracking
        scrape_result = run_enhanced_scrape_for_user(
            user_id=user_id,
            username=creds['dulms_username'],
            password=password,
            fcb_api_key=creds['fcb_api_key'],
            nopecha_api_key=creds['nopecha_api_key']
        )

        if scrape_result['status'] == 'failed':
            raise Exception(scrape_result.get('error', 'Unknown scraper error'))
        elif scrape_result['status'] == 'suspended':
            # Handle suspended status - don't retry, just log and return
            logging.warning(f"Scraping suspended for user {user_id}")
            return {'status': 'SUSPENDED', 'message': 'Scraping suspended due to consecutive failures', 'user_id': user_id}

        update_state('PROGRESS', {'status': 'Data extraction complete', 'percentage': 70})
        update_state('PROGRESS', {'status': 'Analyzing collected intelligence', 'percentage': 75})
        
        last_scrape_response = db.table('scrape_history').select('scraped_data').eq('user_id', user_id).eq('status', 'success').order('scraped_at', desc=True).limit(1).execute()
        last_data = last_scrape_response.data[0]['scraped_data'] if last_scrape_response.data else {}

        update_state('PROGRESS', {'status': 'Processing date formats', 'percentage': 80})
        # Process all dates in the scraped data for unified formatting
        processed_data = process_scraped_data_dates(scrape_result['data'])
        
        update_state('PROGRESS', {'status': 'Processing notifications', 'percentage': 85})
        
        # 1. Fetch the user's notification preferences
        prefs_resp = db.table('user_credentials').select('*').eq('user_id', user_id).single().execute()
        user_prefs = prefs_resp.data
        
        # 2. Fetch the MOST RECENT scrape history entry for comparison
        last_scrape_resp = db.table('scrape_history').select('scraped_data').eq('user_id', user_id).eq('status', 'success').order('scraped_at', desc=True).limit(1).execute()
        
        if not last_scrape_resp.data:
            # --- FIRST SCAN LOGIC ---
            logging.info(f"First successful scan for user {user_id}. Sending all found data.")
            # Call a function that formats and sends ALL data from scrape_result['data']
            new_items_count = send_first_scan_notification(processed_data, user_prefs, user_id)
        else:
            # --- SUBSEQUENT SCAN LOGIC ---
            logging.info(f"Comparing new scrape with previous for user {user_id}.")
            last_data = last_scrape_resp.data[0]['scraped_data']
            # Call the comparison function that finds only the differences
            new_items_count = compare_and_notify(last_data, processed_data, user_prefs, user_id)

        update_state('PROGRESS', {'status': 'Securing data transmission', 'percentage': 90})
        update_state('PROGRESS', {'status': 'Finalizing mission report', 'percentage': 95})
        
        db.table('scrape_history').insert({
            "user_id": user_id,
            "status": 'success',
            "new_items_found": new_items_count,
            "log_message": f"Scrape successful. Found {new_items_count} new items.",
            "scraped_data": processed_data
        }).execute()

        update_state('PROGRESS', {'status': 'Mission accomplished', 'percentage': 100})

        logging.info(f"Scrape completed successfully for user {user_id}.")
        
        # Force garbage collection to free memory
        gc.collect()
        log_memory_usage("task end")
        
        return {'status': 'SUCCESS', 'new_items': new_items_count, 'user_id': user_id}

    except Exception as e:
        # On failure, log the full traceback
        logging.error(f"Task failed for user {user_id}. Exception: {e}", exc_info=True)
        db = get_supabase_client()
        db.table('scrape_history').insert({
            "user_id": user_id,
            "status": "FAILED",
            "log_message": str(e),
            "traceback": traceback.format_exc() # <-- SAVE THE TRACEBACK
        }).execute()
        # Re-raise the exception to let Celery know the task failed and should be retried if configured
        raise

@celery_app.task
def queue_all_users_scrape():
    """
    This master task runs frequently (e.g., every hour).
    It checks which users are due for a scrape based on their
    personal 'check_interval_hours' setting.
    """
    logging.info("Master scheduler running: Checking for users due for a scrape.")
    db: Client = get_supabase_client()

    # 1. Get all users who have automation enabled
    active_users_response = db.table('user_credentials').select('user_id, check_interval_hours').eq('is_automation_active', True).execute()
    if not active_users_response.data:
        logging.info("No users with active automation. Scheduler finished.")
        return

    users_to_check = active_users_response.data
    
    # 2. For each active user, check if they are due for a scrape
    for user_prefs in users_to_check:
        user_id = user_prefs['user_id']
        interval = user_prefs['check_interval_hours']
        
        # Find the timestamp of their last scrape (success or fail)
        last_scrape_response = db.table('scrape_history').select('scraped_at').eq('user_id', user_id).order('scraped_at', desc=True).limit(1).execute()

        is_due = False
        if not last_scrape_response.data:
            # User has never been scraped, so they are due now.
            is_due = True
        else:
            last_scraped_at = datetime.fromisoformat(last_scrape_response.data[0]['scraped_at'])
            if datetime.now(last_scraped_at.tzinfo) >= last_scraped_at + timedelta(hours=interval):
                is_due = True
        
        if is_due:
            logging.info(f"User {user_id} is due for a scrape. Queuing background task.")
            execute_scrape_task.apply_async(args=[user_id, 'background'], queue='background')
        else:
            logging.info(f"User {user_id} is not due for a scrape yet. Skipping.")
from notifications.unified_notifier import send_unified_deadline_reminder
from datetime import datetime, timedelta, timezone

@celery_app.task
def check_for_deadline_reminders():
    logging.info("Starting hourly check for deadline reminders...")
    db = get_supabase_client()
    now = datetime.now(timezone.utc)

    # 1. Get users with deadline notifications enabled directly from user_credentials
    try:
        users_response = db.table('user_credentials').select(
            'user_id, deadline_reminder_hours'
        ).eq('deadline_notifications', True).gt('deadline_reminder_hours', 0).execute()
        
        if not users_response.data:
            logging.info("No users with deadline notifications enabled or reminder hours set.")
            return "No users with deadline notifications enabled."
            
    except Exception as e:
        logging.error(f"Error fetching user credentials for deadline reminders: {e}")
        return "Error fetching user credentials."

    for user_prefs in users_response.data:
        user_id = user_prefs['user_id']
        reminder_hours = user_prefs['deadline_reminder_hours']

        try:
            # 2. Get the user's most recent successful scrape data
            scrape_resp = db.table('scrape_history').select('scraped_data').eq('user_id', user_id).eq('status', 'success').order('scraped_at', desc=True).limit(1).single().execute()
            if not scrape_resp.data or not scrape_resp.data.get('scraped_data'):
                logging.info(f"No successful scrape data found for user {user_id}. Skipping.")
                continue

            scraped_data = scrape_resp.data['scraped_data']
            all_tasks = (scraped_data.get('quizzes', {}).get('quizzes_without_results', []) +
                         scraped_data.get('assignments', {}).get('assignments', []))

            for task in all_tasks:
                deadline_str = task.get('closed_at') or task.get('deadline') # Accommodate different key names
                deadline = parse_deadline_date(deadline_str)
                if not deadline:
                    continue

                # Ensure deadline is timezone-aware for correct comparison
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)

                reminder_window_start = deadline - timedelta(hours=reminder_hours)

                # Check if the current time is within the reminder window
                if reminder_window_start <= now < deadline:
                    # Use a stable, unique identifier for the task, matching the DB schema
                    task_identifier = str(task.get('id', f"{task.get('course', 'N/A')}-{task.get('name', 'N/A')}"))

                    # 5. Check if a reminder has already been sent for this task
                    reminder_sent_resp = db.table('sent_reminders').select('user_id').eq('user_id', user_id).eq('task_identifier', task_identifier).execute()
                    if reminder_sent_resp.data:
                        logging.info(f"Reminder for task {task_identifier} already sent to user {user_id}. Skipping.")
                        continue

                    # 6. FIRST: Mark the reminder as sent in the database to prevent race conditions
                    try:
                        db.table('sent_reminders').insert({
                            "user_id": user_id,
                            "task_identifier": task_identifier,
                            "sent_at": now.isoformat()
                        }).execute()
                        logging.info(f"Recorded sent reminder for task {task_identifier} for user {user_id}.")
                    except Exception as e:
                        logging.error(f"Failed to record sent reminder for task {task_identifier} for user {user_id}: {e}")
                        continue  # Skip sending if we can't record it

                    # 7. THEN: Send unified deadline reminder notification
                    try:
                        send_unified_deadline_reminder(user_id, task, deadline, reminder_hours)
                        logging.info(f"Deadline reminder sent for task {task_identifier} to user {user_id}.")
                    except Exception as e:
                        logging.error(f"Failed to send deadline reminder for task {task_identifier} to user {user_id}: {e}")
                        # Note: We don't remove the sent_reminders record here to avoid spam retries
        
        except Exception as e:
            logging.error(f"An error occurred while processing reminders for user {user_id}: {e}", exc_info=True)
            continue # Move to the next user

    return "Deadline reminder check completed."