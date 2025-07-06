import logging
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import uuid

logger = logging.getLogger(__name__)

def generate_id() -> str:
    """Generate a unique ID"""
    return str(uuid.uuid4())

def current_timestamp() -> str:
    """Get current timestamp in ISO format"""
    return datetime.now().isoformat()

def validate_teacher_data(data: Dict[str, Any]) -> Dict[str, List[str]]:
    """Validate teacher registration data"""
    errors = {}
    
    # Display name validation
    if not data.get('displayName', '').strip():
        errors['displayName'] = ['Display name is required']
    elif len(data['displayName'].strip()) < 2:
        errors['displayName'] = ['Display name must be at least 2 characters']
    
    # Grades validation
    grades = data.get('grades', [])
    if not isinstance(grades, list) or len(grades) == 0:
        errors['grades'] = ['At least one grade is required']
    else:
        valid_grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
        invalid_grades = [g for g in grades if g not in valid_grades]
        if invalid_grades:
            errors['grades'] = [f'Invalid grades: {", ".join(invalid_grades)}']
    
    # Location validation
    if not data.get('location', '').strip():
        errors['location'] = ['Location is required']
    elif len(data['location'].strip()) < 2:
        errors['location'] = ['Location must be at least 2 characters']
    
    # Experience validation
    experience = data.get('experienceYears')
    if not isinstance(experience, (int, float)) or experience < 0:
        errors['experienceYears'] = ['Experience years must be a non-negative number']
    elif experience > 50:
        errors['experienceYears'] = ['Experience years seems too high (max 50)']
    
    return errors

def sanitize_string(value: str) -> str:
    """Sanitize string input"""
    if not isinstance(value, str):
        return str(value)
    
    return value.strip()

def format_agent_response(
    success: bool, 
    data: Any = None, 
    error: str = None, 
    agent_id: str = None
) -> Dict[str, Any]:
    """Format standardized agent response"""
    response = {
        'success': success,
        'timestamp': current_timestamp()
    }
    
    if agent_id:
        response['agent_id'] = agent_id
    
    if success:
        response['data'] = data
    else:
        response['error'] = error
    
    return response

def calculate_profile_strength(grades: List[str], experience: int) -> int:
    """Calculate profile strength score"""
    base_score = experience * 5
    grade_bonus = len(grades) * 15
    
    # Bonus for diverse grade coverage
    if len(grades) > 3:
        grade_bonus += 10
    
    # Bonus for high experience
    if experience > 10:
        base_score += 20
    
    return min(100, base_score + grade_bonus)

def determine_experience_level(years: int) -> str:
    """Determine experience level category"""
    if years < 3:
        return "novice"
    elif years < 10:
        return "experienced"
    else:
        return "veteran"

def create_region_key(location: str) -> str:
    """Create standardized region key"""
    return location.lower().replace(' ', '_').replace('-', '_')

def log_agent_activity(agent_id: str, action: str, details: Dict[str, Any] = None):
    """Log agent activity"""
    log_data = {
        'agent_id': agent_id,
        'action': action,
        'timestamp': current_timestamp(),
        'details': details or {}
    }
    
    logger.info(f"Agent Activity: {json.dumps(log_data)}")

def is_expired(timestamp_str: str, hours: int = 24) -> bool:
    """Check if timestamp is expired"""
    try:
        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        expiry = datetime.now() - timedelta(hours=hours)
        return timestamp < expiry
    except Exception:
        return True

def format_error_response(error: Exception, request_id: str = None) -> Dict[str, Any]:
    """Format error response"""
    response = {
        'success': False,
        'error': str(error),
        'timestamp': current_timestamp()
    }
    
    if request_id:
        response['request_id'] = request_id
    
    return response

def merge_contexts(context1: Dict[str, Any], context2: Dict[str, Any]) -> Dict[str, Any]:
    """Merge two context dictionaries"""
    merged = context1.copy()
    merged.update(context2)
    return merged

def extract_teacher_summary(teacher_data: Dict[str, Any]) -> str:
    """Extract a brief teacher summary"""
    name = teacher_data.get('displayName', 'Unknown')
    grades = teacher_data.get('grades', [])
    location = teacher_data.get('location', 'Unknown')
    experience = teacher_data.get('experienceYears', 0)
    
    grade_str = ', '.join(grades) if grades else 'various grades'
    
    return f"{name} teaches {grade_str} in {location} with {experience} years of experience"

def clean_grade_list(grades: List[str]) -> List[str]:
    """Clean and validate grade list"""
    valid_grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
    cleaned = []
    
    for grade in grades:
        if isinstance(grade, str):
            grade = grade.strip().upper()
            if grade in valid_grades:
                cleaned.append(grade)
    
    return sorted(list(set(cleaned)))  # Remove duplicates and sort