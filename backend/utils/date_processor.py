# /backend/utils/date_processor.py
"""
Comprehensive date processing utilities for DULMS Watcher
Handles parsing, formatting, and unifying different date formats from DULMS
"""

import re
import logging
from datetime import datetime, timedelta, timezone
import pytz
from typing import Optional, Dict, Any, List, Union

logger = logging.getLogger(__name__)

def parse_relative_time(relative_string: str) -> Optional[datetime]:
    """
    Parse relative time format like "Will be closed after: 1 days, 11 hours"
    Returns a datetime object representing the future date
    """
    try:
        # Extract days, hours, and minutes using regex
        days_match = re.search(r'(\d+)\s*days?', relative_string)
        hours_match = re.search(r'(\d+)\s*hours?', relative_string)
        minutes_match = re.search(r'(\d+)\s*minutes?', relative_string)
        
        days = int(days_match.group(1)) if days_match else 0
        hours = int(hours_match.group(1)) if hours_match else 0
        minutes = int(minutes_match.group(1)) if minutes_match else 0
        
        # Calculate future datetime from now (use local timezone)
        cairo_tz = pytz.timezone('Africa/Cairo')
        now_local = datetime.now(cairo_tz)
        future_date = now_local + timedelta(days=days, hours=hours, minutes=minutes)
        logger.info(f"Parsed relative time '{relative_string}' to local time: {future_date.isoformat()}")
        return future_date
    except Exception as e:
        logger.warning(f"Failed to parse relative time '{relative_string}': {e}")
        return None

def parse_deadline_date(date_str: str) -> Optional[datetime]:
    """
    Enhanced date parsing function to handle various date formats from DULMS
    Supports both absolute and relative date formats
    """
    if not date_str or not isinstance(date_str, str):
        return None
    
    # Clean the date string
    date_str = date_str.strip()
    
    # Handle relative time formats
    if "will be closed after:" in date_str.lower():
        return parse_relative_time(date_str)
    
    # Handle "will be opened at" format - extract the actual date part
    if "will be opened at:" in date_str.lower():
        # This indicates a future assignment, not a deadline.
        # For now, we'll treat it as having no deadline.
        logger.info(f"Skipping 'Will be opened at' date: {date_str}")
        return None
    
    # List of date formats to try, in order of preference
    date_formats = [
        # ISO formats
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        
        # DULMS common formats
        "%b %d, %Y at %I:%M %p",  # Jul 11, 2025 at 10:45 PM
        "%B %d, %Y at %I:%M %p",  # July 11, 2025 at 10:45 PM
        "%b %d, %Y %I:%M %p",     # Jul 11, 2025 10:45 PM
        "%B %d, %Y %I:%M %p",     # July 11, 2025 10:45 PM
        
        # Other common formats
        "%d %b %Y, %I:%M %p",     # 11 Jul 2025, 10:45 PM
        "%d %B %Y, %I:%M %p",     # 11 July 2025, 10:45 PM
        "%d/%m/%Y %H:%M",         # 11/07/2025 22:45
        "%m/%d/%Y %H:%M",         # 07/11/2025 22:45
        "%d-%m-%Y %H:%M",         # 11-07-2025 22:45
        "%Y-%m-%d %H:%M",         # 2025-07-11 22:45
        
        # Date only formats
        "%b %d, %Y",              # Jul 11, 2025
        "%B %d, %Y",              # July 11, 2025
        "%d %b %Y",               # 11 Jul 2025
        "%d %B %Y",               # 11 July 2025
        "%d/%m/%Y",               # 11/07/2025
        "%m/%d/%Y",               # 07/11/2025
        "%d-%m-%Y",               # 11-07-2025
        "%d-%m-%y",               # 11-07-25
    ]
    
    for fmt in date_formats:
        try:
            parsed_date = datetime.strptime(date_str, fmt)
            # If no timezone info, assume local timezone (Cairo)
            if parsed_date.tzinfo is None:
                cairo_tz = pytz.timezone('Africa/Cairo')
                parsed_date = cairo_tz.localize(parsed_date)
            logger.debug(f"Successfully parsed '{date_str}' using format '{fmt}' -> {parsed_date.isoformat()}")
            return parsed_date
        except ValueError:
            continue
    logger.warning(f"Could not parse date '{date_str}' with any of the known formats.")
    
    # Try ISO format with timezone
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        pass
    
    # If all else fails, log and return None
    logger.warning(f"Could not parse date: {date_str}")
    return None

def format_date_for_display(dt: datetime, format_type: str = "standard") -> str:
    """
    Format datetime objects for consistent display in the dashboard
    
    Args:
        dt: datetime object to format
        format_type: Type of formatting ("standard", "short", "relative")
    
    Returns:
        Formatted date string
    """
    if not dt:
        return "No date"
    
    if format_type == "standard":
        return dt.strftime("%b %d, %Y at %I:%M %p")
    elif format_type == "short":
        return dt.strftime("%b %d, %Y")
    elif format_type == "relative":
        cairo_tz = pytz.timezone('Africa/Cairo')
        now = datetime.now(cairo_tz)
        # Ensure both dates are timezone-aware for comparison
        if dt.tzinfo is None:
            dt = cairo_tz.localize(dt)
        elif dt.tzinfo != cairo_tz:
            dt = dt.astimezone(cairo_tz)
        diff = dt - now
        
        if diff.total_seconds() < 0:
            return "Overdue"
        elif diff.days > 0:
            return f"In {diff.days} days"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"In {hours} hours"
        else:
            minutes = diff.seconds // 60
            return f"In {minutes} minutes"
    else:
        return dt.isoformat()

def process_scraped_data_dates(scraped_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process all dates in scraped data to add parsed datetime objects
    and formatted display strings
    
    Args:
        scraped_data: Raw scraped data dictionary
        
    Returns:
        Enhanced scraped data with processed dates
    """
    processed_data = scraped_data.copy()
    
    # Process quiz dates
    if "quizzes" in processed_data:
        for quiz_list_key in ["quizzes_with_results", "quizzes_without_results"]:
            if quiz_list_key in processed_data["quizzes"]:
                for quiz in processed_data["quizzes"][quiz_list_key]:
                    if "closed_at" in quiz:
                        original_date = quiz["closed_at"]
                        parsed_date = parse_deadline_date(original_date)
                        
                        # Add parsed date and formatted versions
                        quiz["closed_at_parsed"] = parsed_date.isoformat() if parsed_date else None
                        quiz["closed_at_display"] = format_date_for_display(parsed_date, "standard") if parsed_date else original_date
                        quiz["closed_at_relative"] = format_date_for_display(parsed_date, "relative") if parsed_date else "Unknown"
                        quiz["is_overdue"] = parsed_date < datetime.now(timezone.utc) if parsed_date else False
    
    # Process assignment dates
    if "assignments" in processed_data and "assignments" in processed_data["assignments"]:
        for assignment in processed_data["assignments"]["assignments"]:
            if "closed_at" in assignment:
                original_date = assignment["closed_at"]
                parsed_date = parse_deadline_date(original_date)
                
                # Add parsed date and formatted versions
                assignment["closed_at_parsed"] = parsed_date.isoformat() if parsed_date else None
                assignment["closed_at_display"] = format_date_for_display(parsed_date, "standard") if parsed_date else original_date
                assignment["closed_at_relative"] = format_date_for_display(parsed_date, "relative") if parsed_date else "Unknown"
                assignment["is_overdue"] = parsed_date < datetime.now(timezone.utc) if parsed_date else False
    
    # Process course registration dates
    if "course_registration" in processed_data and "registration_end_date" in processed_data["course_registration"]:
        original_date = processed_data["course_registration"]["registration_end_date"]
        if original_date:
            parsed_date = parse_deadline_date(original_date)
            processed_data["course_registration"]["registration_end_date_parsed"] = parsed_date.isoformat() if parsed_date else None
            processed_data["course_registration"]["registration_end_date_display"] = format_date_for_display(parsed_date, "standard") if parsed_date else original_date
    
    return processed_data

def get_tasks_by_deadline(scraped_data: Dict[str, Any], days_ahead: int = 7) -> List[Dict[str, Any]]:
    """
    Get all tasks (quizzes and assignments) that are due within the specified number of days
    
    Args:
        scraped_data: Processed scraped data
        days_ahead: Number of days to look ahead for deadlines
        
    Returns:
        List of tasks with deadlines within the specified timeframe
    """
    tasks = []
    cairo_tz = pytz.timezone('Africa/Cairo')
    cutoff_date = datetime.now(cairo_tz) + timedelta(days=days_ahead)
    
    # Collect quizzes
    if "quizzes" in scraped_data:
        for quiz in scraped_data["quizzes"].get("quizzes_without_results", []):
            if quiz.get("closed_at_parsed"):
                deadline = datetime.fromisoformat(quiz["closed_at_parsed"])
                if deadline <= cutoff_date:
                    tasks.append({
                        **quiz,
                        "deadline_datetime": deadline,
                        "task_type": "Quiz"
                    })
    
    # Collect assignments
    if "assignments" in scraped_data:
        for assignment in scraped_data["assignments"].get("assignments", []):
            if assignment.get("closed_at_parsed"):
                deadline = datetime.fromisoformat(assignment["closed_at_parsed"])
                if deadline <= cutoff_date:
                    tasks.append({
                        **assignment,
                        "deadline_datetime": deadline,
                        "task_type": "Assignment"
                    })
    
    # Sort by deadline
    tasks.sort(key=lambda x: x["deadline_datetime"])
    
    return tasks

def calculate_dashboard_stats(scraped_data: Dict[str, Any]) -> Dict[str, int]:
    """
    Calculate dashboard statistics based on processed scraped data
    
    Args:
        scraped_data: Processed scraped data with parsed dates
        
    Returns:
        Dictionary with dashboard statistics
    """
    cairo_tz = pytz.timezone('Africa/Cairo')
    now = datetime.now(cairo_tz)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    week_end = now + timedelta(days=7)
    
    stats = {
        "tasks_today": 0,
        "tasks_this_week": 0,
        "tasks_later": 0,
        "overdue_tasks": 0
    }
    
    # Get all tasks with deadlines
    all_tasks = get_tasks_by_deadline(scraped_data, days_ahead=365)  # Get all tasks
    
    for task in all_tasks:
        deadline = task["deadline_datetime"]
        
        if deadline < now:
            stats["overdue_tasks"] += 1
        elif deadline <= today_end:
            stats["tasks_today"] += 1
        elif deadline <= week_end:
            stats["tasks_this_week"] += 1
        else:
            stats["tasks_later"] += 1
    
    return stats