from firebase_functions.options import set_global_options, CorsOptions
from firebase_functions import https_fn, firestore_fn
from firebase_admin import initialize_app, firestore
import logging
from backend.orchestrator.main import AgentOrchestrator
from backend.shared.exceptions import VidyaNXTError

# 1) Set v2 global options
set_global_options(max_instances=10)

# 2) Init Firebase
initialize_app()
db = firestore.client()

# 3) Init logger & orchestrator
orchestrator = AgentOrchestrator()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 4) Build a CORS config (if you still need it)
cors_config = CorsOptions(
    cors_origins="*",                       # dev: allow all
    cors_methods=["GET", "POST", "OPTIONS"],# preflight needs OPTIONS
)

# 5) Use v2 decorators exactly as before
@https_fn.on_call(
    region="us-central1",
    cors=cors_config
)
def register_teacher(req):
    """Register a new teacher"""
    try:
        # Log the request for debugging
        logger.info(f"Register teacher request received from: {req.auth.uid if req.auth else 'anonymous'}")
        
        if not req.auth:
            raise https_fn.HttpsError("unauthenticated", "Sign-in required")
        
        data = req.data
        logger.info(f"Request data: {data}")
        
        # Validation
        if not data.get('displayName', '').strip():
            raise https_fn.HttpsError("invalid-argument", "Display name is required")
        if not isinstance(data.get('grades'), list) or len(data.get('grades', [])) == 0:
            raise https_fn.HttpsError("invalid-argument", "At least one grade is required")
        if not data.get('location', '').strip():
            raise https_fn.HttpsError("invalid-argument", "Location is required")
        if not isinstance(data.get('experienceYears'), (int, float)) or data.get('experienceYears', -1) < 0:
            raise https_fn.HttpsError("invalid-argument", "Valid experience years required")
        
        # Create teacher document
        teacher_data = {
            'displayName': data['displayName'].strip(),
            'grades': [g.strip() for g in data['grades'] if g.strip()],
            'location': data['location'].strip(),
            'experienceYears': data['experienceYears'],
            'ownerUid': req.auth.uid,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'status': 'registered',
            'lastActiveAt': firestore.SERVER_TIMESTAMP
        }
        
        teacher_ref = db.collection('teachers').add(teacher_data)
        
        logger.info(f"Teacher registered successfully: {teacher_ref[1].id}")
        
        return {
            'success': True,
            'teacherId': teacher_ref[1].id,
            'message': 'Teacher registered successfully'
        }
        
    except https_fn.HttpsError:
        # Re-raise HttpsError as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise https_fn.HttpsError("internal", f"Registration failed: {str(e)}")

@https_fn.on_call(
    region="us-central1",
    cors=cors_config
)
def login_teacher(req):
    """Login existing teacher"""
    try:
        logger.info(f"Login teacher request received from: {req.auth.uid if req.auth else 'anonymous'}")
        
        if not req.auth:
            raise https_fn.HttpsError("unauthenticated", "User must be authenticated")
        
        display_name = req.data.get('displayName', '').strip()
        if not display_name:
            raise https_fn.HttpsError("invalid-argument", "Display name is required")
        
        # Find teacher
        teachers_ref = db.collection('teachers')
        docs = teachers_ref.where('displayName', '==', display_name).get()
        
        if not docs:
            return {
                'success': False,
                'message': 'Teacher not found. Please check your name or register first.'
            }
        
        teacher_doc = docs[0]
        teacher_data = teacher_doc.to_dict()
        
        # Update login info
        teacher_doc.reference.update({
            'lastLoginAt': firestore.SERVER_TIMESTAMP,
            'loginCount': (teacher_data.get('loginCount', 0) + 1),
            'status': 'active'
        })
        
        logger.info(f"Teacher login successful: {teacher_doc.id}")
        
        return {
            'success': True,
            'message': 'Login successful',
            'teacher': {
                'id': teacher_doc.id,
                'displayName': teacher_data['displayName'],
                'grades': teacher_data.get('grades', []),
                'location': teacher_data.get('location', ''),
                'experienceYears': teacher_data.get('experienceYears', 0),
                'createdAt': teacher_data.get('createdAt'),
                'lastLoginAt': firestore.SERVER_TIMESTAMP
            }
        }
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise https_fn.HttpsError("internal", f"Login failed: {str(e)}")

@firestore_fn.on_document_created(document="teachers/{teacherId}")
def process_new_teacher(event):
    """Process new teacher with profile agent"""
    try:
        teacher_data = event.data.to_dict()
        teacher_id = event.params['teacherId']
        
        logger.info(f"Processing new teacher: {teacher_id}")
        
        # Use orchestrator to process teacher profile
        result = orchestrator.process_teacher_profile({
            'id': teacher_id,
            'name': teacher_data['displayName'],
            'grades': teacher_data['grades'],
            'location': teacher_data['location'],
            'experience': teacher_data['experienceYears']
        })
        
        # Store profile result
        db.collection('teacherProfiles').document(teacher_id).set({
            **result,
            'processedAt': firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"Profile created for teacher: {teacher_id}")
        
    except Exception as e:
        logger.error(f"Profile processing failed for {teacher_id}: {e}")
        
        # Store error info
        db.collection('teacherProfiles').document(teacher_id).set({
            'error': str(e),
            'processingFailed': True,
            'processedAt': firestore.SERVER_TIMESTAMP
        })