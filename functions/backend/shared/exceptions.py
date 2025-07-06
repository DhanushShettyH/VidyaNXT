"""
Custom exceptions for VidyaNxt backend
"""

class VidyaNxtError(Exception):
    """Base exception for VidyaNxt application"""
    def __init__(self, message: str, code: str = None, details: dict = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}

class ValidationError(VidyaNxtError):
    """Exception for validation failures"""
    def __init__(self, message: str, field: str = None, value: str = None):
        super().__init__(message, code="VALIDATION_ERROR")
        self.field = field
        self.value = value

class AgentCallError(VidyaNxtError):
    """Exception for agent communication failures"""
    def __init__(self, message: str, status_code: int = None, endpoint: str = None):
        super().__init__(message, code="AGENT_CALL_ERROR")
        self.status_code = status_code
        self.endpoint = endpoint

class AuthenticationError(VidyaNxtError):
    """Exception for authentication failures"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, code="AUTHENTICATION_ERROR")

class AuthorizationError(VidyaNxtError):
    """Exception for authorization failures"""
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, code="AUTHORIZATION_ERROR")

class DatabaseError(VidyaNxtError):
    """Exception for database operation failures"""
    def __init__(self, message: str, operation: str = None, collection: str = None):
        super().__init__(message, code="DATABASE_ERROR")
        self.operation = operation
        self.collection = collection

class ConfigurationError(VidyaNxtError):
    """Exception for configuration issues"""
    def __init__(self, message: str, config_key: str = None):
        super().__init__(message, code="CONFIGURATION_ERROR")
        self.config_key = config_key

class AgentTimeoutError(VidyaNxtError):
    """Exception for agent timeout issues"""
    def __init__(self, message: str = "Agent call timed out", timeout: int = None):
        super().__init__(message, code="AGENT_TIMEOUT_ERROR")
        self.timeout = timeout

class TeacherNotFoundError(VidyaNxtError):
    """Exception when teacher is not found"""
    def __init__(self, message: str = "Teacher not found", teacher_id: str = None):
        super().__init__(message, code="TEACHER_NOT_FOUND")
        self.teacher_id = teacher_id

class ChallengeNotFoundError(VidyaNxtError):
    """Exception when challenge is not found"""
    def __init__(self, message: str = "Challenge not found", challenge_id: str = None):
        super().__init__(message, code="CHALLENGE_NOT_FOUND")
        self.challenge_id = challenge_id

class MatchingError(VidyaNxtError):
    """Exception for matching process failures"""
    def __init__(self, message: str, matching_type: str = None):
        super().__init__(message, code="MATCHING_ERROR")
        self.matching_type = matching_type

class WellnessAnalysisError(VidyaNxtError):
    """Exception for wellness analysis failures"""
    def __init__(self, message: str, analysis_type: str = None):
        super().__init__(message, code="WELLNESS_ANALYSIS_ERROR")
        self.analysis_type = analysis_type

# Firebase Functions compatible error mapping
def map_to_firebase_error(error: Exception):
    """Map custom exceptions to Firebase Functions HttpsError"""
    from firebase_functions.https_fn import HttpsError
    
    error_mapping = {
        AuthenticationError: ("unauthenticated", "Authentication required"),
        AuthorizationError: ("permission-denied", "Permission denied"),
        ValidationError: ("invalid-argument", "Invalid input data"),
        TeacherNotFoundError: ("not-found", "Teacher not found"),
        ChallengeNotFoundError: ("not-found", "Challenge not found"),
        ConfigurationError: ("failed-precondition", "Configuration error"),
        AgentTimeoutError: ("deadline-exceeded", "Agent call timed out"),
        DatabaseError: ("internal", "Database operation failed"),
        AgentCallError: ("internal", "Agent communication failed"),
        MatchingError: ("internal", "Matching process failed"),
        WellnessAnalysisError: ("internal", "Wellness analysis failed")
    }
    
    if isinstance(error, VidyaNxtError):
        error_type = type(error)
        if error_type in error_mapping:
            code, default_message = error_mapping[error_type]
            return HttpsError(code, str(error) or default_message)
    
    # Default to internal error
    return HttpsError("internal", f"Internal error: {str(error)}")