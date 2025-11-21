# /backend/api/history.py
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from db.supabase_client import get_supabase_client
from .settings import get_current_clerk_id # Reuse the dependency
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class HistoryItem(BaseModel):
    id: str
    scraped_at: datetime
    status: str
    new_items_found: int
    log_message: Optional[str] = None

class HistoryDetail(BaseModel):
    scraped_data: Dict[str, Any]

class OverallStats(BaseModel):
    total_courses: int
    total_quizzes: int
    total_assignments: int

router = APIRouter()

@router.get("/history", response_model=List[HistoryItem])
def get_scrape_history(
    clerk_user_id: str = Depends(get_current_clerk_id),
    db: Client = Depends(get_supabase_client)
):
    # 1. Get internal user ID
    user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
    if not user_response.data:
        raise HTTPException(status_code=404, detail="User profile not found. Please complete onboarding first.")
    user_id = user_response.data[0]['id']

    # 2. Fetch history for that user, ordered by most recent
    history_response = db.table('scrape_history').select('id, scraped_at, status, new_items_found, log_message').eq('user_id', user_id).order('scraped_at', desc=True).execute()

    return history_response.data

@router.get("/history/stats", response_model=OverallStats)
def get_overall_stats(
    clerk_user_id: str = Depends(get_current_clerk_id),
    db: Client = Depends(get_supabase_client)
):
    user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
    if not user_response.data:
        raise HTTPException(status_code=404, detail="User profile not found. Please complete onboarding first.")
    user_id = user_response.data[0]['id']

    # Fetch all scraped_data from the user's history
    all_history_response = db.table('scrape_history').select('scraped_data').eq('user_id', user_id).eq('status', 'success').execute()

    total_courses = set()
    total_quizzes = 0
    total_assignments = 0

    for item in all_history_response.data:
        data = item.get('scraped_data', {})
        if data:
            # Add courses from quizzes
            if 'quizzes' in data and 'courses_found_on_page' in data['quizzes']:
                total_courses.update(data['quizzes']['courses_found_on_page'])
            # Add courses from assignments
            if 'assignments' in data and 'courses_found_on_page' in data['assignments']:
                total_courses.update(data['assignments']['courses_found_on_page'])

            # Count quizzes
            if 'quizzes' in data and 'total_quizzes_found' in data['quizzes']:
                total_quizzes += data['quizzes']['total_quizzes_found']
            
            # Count assignments
            if 'assignments' in data and 'total_assignments_found' in data['assignments']:
                total_assignments += data['assignments']['total_assignments_found']

    return OverallStats(
        total_courses=len(total_courses),
        total_quizzes=total_quizzes,
        total_assignments=total_assignments
    )

class AllData(BaseModel):
    courses: List[str]
    quizzes: List[Dict[str, Any]]
    assignments: List[Dict[str, Any]]
    absences: List[Dict[str, Any]]

@router.get("/history/get-all-data-archive", response_model=AllData)
def get_all_data(
    clerk_user_id: str = Depends(get_current_clerk_id),
    db: Client = Depends(get_supabase_client)
):
    user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
    if not user_response.data:
        raise HTTPException(status_code=404, detail="User profile not found. Please complete onboarding first.")
    user_id = user_response.data[0]['id']

    all_history_response = db.table('scrape_history').select('scraped_data').eq('user_id', user_id).eq('status', 'success').execute()

    all_courses = set()
    all_quizzes = {}
    all_assignments = {}
    all_absences = {}

    for item in all_history_response.data:
        data = item.get('scraped_data', {})
        if data:
            if 'quizzes' in data:
                if 'courses_found_on_page' in data['quizzes']:
                    all_courses.update(data['quizzes']['courses_found_on_page'])
                for quiz in data['quizzes'].get('quizzes_with_results', []) + data['quizzes'].get('quizzes_without_results', []):
                    all_quizzes[quiz['name'] + quiz['course']] = quiz
            
            if 'assignments' in data:
                if 'courses_found_on_page' in data['assignments']:
                    all_courses.update(data['assignments']['courses_found_on_page'])
                for assignment in data['assignments'].get('assignments', []):
                    all_assignments[assignment['name'] + assignment['course']] = assignment
            
            # Add absences aggregation
            if 'absences' in data and 'absences' in data['absences']:
                for absence in data['absences']['absences']:
                    # Create unique key for absence (course + date + type to avoid duplicates)
                    absence_key = f"{absence.get('course', '')}-{absence.get('date', '')}-{absence.get('type', '')}"
                    all_absences[absence_key] = absence

    return AllData(
        courses=sorted(list(all_courses)),
        quizzes=list(all_quizzes.values()),
        assignments=list(all_assignments.values()),
        absences=list(all_absences.values())
    )

@router.get("/history/{scrape_id}", response_model=HistoryDetail)
def get_scrape_history_detail(
    scrape_id: str,
    clerk_user_id: str = Depends(get_current_clerk_id),
    db: Client = Depends(get_supabase_client)
):
    # 1. Get internal user ID to ensure user owns this scrape record
    user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
    if not user_response.data:
        raise HTTPException(status_code=404, detail="User profile not found. Please complete onboarding first.")
    user_id = user_response.data[0]['id']

    # 2. Fetch the specific history entry
    detail_response = db.table('scrape_history').select('scraped_data, user_id').eq('id', scrape_id).execute()

    if not detail_response.data:
        raise HTTPException(status_code=404, detail="History record not found")
    
    detail_data = detail_response.data[0]

    # 3. Security check: Make sure the fetched record belongs to the authenticated user
    if detail_data['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this record")

    return detail_data