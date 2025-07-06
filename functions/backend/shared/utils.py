"""
Shared utility functions for VidyaNxt backend
"""
import asyncio
import aiohttp
import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import logging
from .config import config
from .exceptions import AgentCallError, ValidationError

logger = logging.getLogger(__name__)

class AgentClient:
    """Client for making calls to AI agents"""
    
    def __init__(self, base_url: str = None, max_retries: int = None):
        self.base_url = base_url or config.agent_base_url
        self.max_retries = max_retries or config.max_retries
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def call_agent(self, endpoint: str, payload: Dict[str, Any], retries: int = None) -> Dict[str, Any]:
        """Make an async call to an agent endpoint with retry logic"""
        retries = retries or self.max_retries
        
        for attempt in range(retries):
            try:
                url = f"{self.base_url}{endpoint}"
                logger.info(f"🔗 Calling agent URL: {url}")
                
                async with self.session.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if not response.ok:
                        raise AgentCallError(
                            f"Agent call failed: {response.status} {response.reason}",
                            status_code=response.status
                        )
                    
                    return await response.json()
                    
            except Exception as error:
                logger.error(f"❌ Agent call attempt {attempt + 1} failed: {str(error)}")
                
                if attempt == retries - 1:
                    raise AgentCallError(f"Agent call failed after {retries} attempts: {str(error)}")
                
                # Wait before retry
                await asyncio.sleep((attempt + 1) * (config.retry_delay / 1000))
        
        raise AgentCallError(f"Agent call failed after {retries} attempts")

def sync_call_agent(endpoint: str, payload: Dict[str, Any], retries: int = None) -> Dict[str, Any]:
    """Synchronous wrapper for agent calls (for Firebase Functions compatibility)"""
    async def _call():
        async with AgentClient() as client:
            return await client.call_agent(endpoint, payload, retries)
    
    # Run the async function
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_call())
    finally:
        loop.close()

def validate_teacher_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate teacher registration data"""
    errors = []
    
    # Required fields
    if not data.get('displayName', '').strip():
        errors.append("Display name is required")
    
    if not isinstance(data.get('grades'), list) or len(data.get('grades', [])) == 0:
        errors.append("At least one grade is required")
    
    if not data.get('location', '').strip():
        errors.append("Location is required")
    
    if not isinstance(data.get('experienceYears'), (int, float)) or data.get('experienceYears', -1) < 0:
        errors.append("Valid experience years required")
    
    if errors:
        raise ValidationError(f"Validation failed: {'; '.join(errors)}")
    
    # Clean and normalize data
    return {
        'displayName': data['displayName'].strip(),
        'grades': [g.strip() for g in data['grades'] if g and g.strip()],
        'location': data['location'].strip(),
        'experienceYears': int(data['experienceYears']),
        'createdAt': get_current_timestamp(),
        'status': 'registered',
        'lastActiveAt': get_current_timestamp()
    }

def validate_challenge_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate challenge posting data"""
    errors = []
    
    if not data.get('text', '').strip():
        errors.append("Challenge text is required")
    
    if not data.get('teacherId', '').strip():
        errors.append("Teacher ID is required")
    
    urgency = data.get('urgency', 'medium')
    if urgency not in ['low', 'medium', 'high', 'urgent']:
        errors.append("Invalid urgency level")
    
    if errors:
        raise ValidationError(f"Validation failed: {'; '.join(errors)}")
    
    return {
        'text': data['text'].strip(),
        'teacherId': data['teacherId'].strip(),
        'urgency': urgency,
        'createdAt': get_current_timestamp(),
        'status': 'POSTED',
        'responses': []
    }

def get_current_timestamp() -> str:
    """Get current timestamp in ISO format"""
    return datetime.now(timezone.utc).isoformat()

def extract_teacher_id_from_uid(db, uid: str) -> Optional[str]:
    """Extract teacher document ID from Firebase UID"""
    try:
        # Query teachers collection by ownerUid
        query = db.collection('teachers').where('ownerUid', '==', uid).limit(1)
        docs = query.get()
        
        if docs:
            return docs[0].id
        return None
    except Exception as e:
        logger.error(f"Error extracting teacher ID: {str(e)}")
        return None

def build_error_response(error: Exception, context: str = "") -> Dict[str, Any]:
    """Build standardized error response"""
    return {
        'success': False,
        'error': str(error),
        'context': context,
        'timestamp': get_current_timestamp(),
        'type': type(error).__name__
    }

def build_success_response(data: Dict[str, Any], message: str = "Success") -> Dict[str, Any]:
    """Build standardized success response"""
    return {
        'success': True,
        'message': message,
        'data': data,
        'timestamp': get_current_timestamp()
    }

def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize user input"""
    if not isinstance(text, str):
        return ""
    
    # Remove excessive whitespace
    text = ' '.join(text.split())
    
    # Truncate if too long
    if len(text) > max_length:
        text = text[:max_length].rsplit(' ', 1)[0] + "..."
    
    return text.strip()

def calculate_match_score(profile1: Dict[str, Any], profile2: Dict[str, Any]) -> float:
    """Calculate compatibility score between two teacher profiles"""
    score = 0.0
    
    # Grade overlap
    grades1 = set(profile1.get('matchingCriteria', {}).get('grades', []))
    grades2 = set(profile2.get('matchingCriteria', {}).get('grades', []))
    
    if grades1 and grades2:
        overlap = len(grades1.intersection(grades2))
        total = len(grades1.union(grades2))
        if total > 0:
            score += (overlap / total) * 0.4
    
    # Location match
    loc1 = profile1.get('matchingCriteria', {}).get('location', '')
    loc2 = profile2.get('matchingCriteria', {}).get('location', '')
    
    if loc1 and loc2 and loc1.lower() == loc2.lower():
        score += 0.3
    
    # Experience compatibility
    exp1 = profile1.get('matchingCriteria', {}).get('experienceLevel', '')
    exp2 = profile2.get('matchingCriteria', {}).get('experienceLevel', '')
    
    # Novice benefits from experienced, experienced from veteran
    if (exp1 == 'novice' and exp2 == 'experienced') or \
       (exp1 == 'experienced' and exp2 == 'veteran') or \
       (exp1 == exp2):
        score += 0.2
    
    # Add some randomness for variety
    score += (hash(f"{profile1.get('teacherId', '')}{profile2.get('teacherId', '')}") % 100) / 1000
    
    return min(score, 1.0)

def log_performance(func_name: str, duration: float, success: bool = True):
    """Log performance metrics"""
    logger.info(f"📊 {func_name}: {duration:.2f}ms - {'✅' if success else '❌'}")

class PerformanceTimer:
    """Context manager for timing operations"""
    
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (time.time() - self.start_time) * 1000
        success = exc_type is None
        log_performance(self.operation_name, duration, success)