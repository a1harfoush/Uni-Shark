# /backend/api/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from db.supabase_client import get_supabase_client
from .settings import get_current_clerk_id # Reuse the dependency
from utils.date_processor import parse_deadline_date, calculate_dashboard_stats
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

class DashboardStats(BaseModel):
    tasks_today: int = 0
    tasks_this_week: int = 0
    tasks_later: int = 0
    new_absences: int = 0
    recent_grades: int = 0
    total_scrapes: int = 0
    successful_scrapes: int = 0

class Grade(BaseModel):
    name: str
    course: str
    grade: str

class CourseRegistrationInfo(BaseModel):
    name: str
    group: str
    hours: str
    fees: str

class DashboardData(BaseModel):
    is_onboarded: bool
    stats: DashboardStats
    last_scrape: Optional[Dict[str, Any]] = None
    recent_grades_list: List[Grade] = []
    course_registration: Optional[Dict[str, Any]] = None

router = APIRouter()

@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_data(
    clerk_user_id: str = Depends(get_current_clerk_id),
    db: Client = Depends(get_supabase_client),
    user_timezone: str = "UTC" # Default to UTC, but expect from frontend
):
    import pytz
    # 1. Get internal user ID - create user if doesn't exist
    user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
    if not user_response.data:
        # Auto-create the user if they don't exist
        try:
            upsert_result = db.table('users').insert({
                'clerk_user_id': clerk_user_id,
                'created_at': 'now()'
            }).execute()
            user_id = upsert_result.data[0]['id']
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create user profile: {str(e)}")
    else:
        user_id = user_response.data[0]['id']

    # 2. Check if user has set credentials (is onboarded)
    try:
        creds_response = db.table('user_credentials').select('dulms_username').eq('user_id', user_id).execute()
        is_onboarded = bool(creds_response.data and len(creds_response.data) > 0 and creds_response.data[0].get('dulms_username'))
    except Exception as e:
        # User has no credentials yet (new user)
        print(f"DEBUG: User {user_id} has no credentials yet: {e}")
        is_onboarded = False

    if not is_onboarded:
        return DashboardData(is_onboarded=False, stats=DashboardStats())

    # 3. Get the last successful scrape
    last_scrape_response = db.table('scrape_history').select('*').eq('user_id', user_id).eq('status', 'success').order('scraped_at', desc=True).limit(1).execute()

    print(f"DEBUG: User {user_id} has {len(last_scrape_response.data)} successful scrapes")
    
    if not last_scrape_response.data:
        # No successful scrapes yet, return default data
        print(f"DEBUG: No successful scrapes found for user {user_id}")
        return DashboardData(is_onboarded=True, stats=DashboardStats(), last_scrape=None)

    last_scrape = last_scrape_response.data[0]
    scraped_data = last_scrape.get('scraped_data', {})
    
    print(f"DEBUG: Last scrape data keys: {list(scraped_data.keys()) if scraped_data else 'None'}")
    print(f"DEBUG: Quizzes data: {scraped_data.get('quizzes', {}).keys() if scraped_data.get('quizzes') else 'None'}")
    print(f"DEBUG: Assignments data: {scraped_data.get('assignments', {}).keys() if scraped_data.get('assignments') else 'None'}")

    # 4. Use the centralized date processor to calculate dashboard stats
    stats_dict = calculate_dashboard_stats(scraped_data)
    
    # Safely extract recent grades count
    quizzes_data = scraped_data.get('quizzes', {})
    quizzes_with_results = quizzes_data.get('quizzes_with_results', []) if isinstance(quizzes_data.get('quizzes_with_results'), list) else []
    
    # Get scrape history stats
    all_scrapes_response = db.table('scrape_history').select('status').eq('user_id', user_id).execute()
    total_scrapes = len(all_scrapes_response.data) if all_scrapes_response.data else 0
    successful_scrapes = len([s for s in all_scrapes_response.data if s.get('status') == 'success']) if all_scrapes_response.data else 0
    
    # Get absences count
    new_absences = 0
    if 'absences' in scraped_data and 'absences' in scraped_data['absences']:
        new_absences = len(scraped_data['absences']['absences'])
    
    stats = DashboardStats(
        tasks_today=stats_dict.get('tasks_today', 0),
        tasks_this_week=stats_dict.get('tasks_this_week', 0),
        tasks_later=stats_dict.get('tasks_later', 0),
        new_absences=new_absences,
        recent_grades=len(quizzes_with_results),
        total_scrapes=total_scrapes,
        successful_scrapes=successful_scrapes
    )
    
    print(f"DEBUG: Final stats - Today: {stats.tasks_today}, Week: {stats.tasks_this_week}, Later: {stats.tasks_later}, Grades: {stats.recent_grades}")

    # 5. Extract recent grades list using validated data
    recent_grades_list = []
    for grade in quizzes_with_results:
        if isinstance(grade, dict):
            recent_grades_list.append(Grade(
                name=grade.get('name', ''),
                course=grade.get('course', ''),
                grade=grade.get('grade', '')
            ))

    # 6. Extract course registration info
    course_registration = scraped_data.get('course_registration')


    # The frontend `useLocalScrapeData` hook expects the `scraped_data` object directly.
    # We must extract it from the full history record.
    last_scrape_data_only = last_scrape.get('scraped_data', {})

    result = DashboardData(
        is_onboarded=True,
        stats=stats,
        last_scrape=last_scrape_data_only, # Return only the nested data object
        recent_grades_list=recent_grades_list,
        course_registration=course_registration
    )
    
    print(f"DEBUG: Returning dashboard data with stats: {stats}")
    return result