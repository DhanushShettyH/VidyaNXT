"""
Shared configuration for VidyaNxt backend
"""
import os
from typing import Dict, Any, Optional

class Config:
    """Global configuration class"""
    
    def __init__(self):
        # Firebase configuration
        self.firebase_project_id = os.getenv('FIREBASE_PROJECT_ID')
        self.firebase_private_key = os.getenv('FIREBASE_PRIVATE_KEY')
        self.firebase_client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
        
        # Agent configuration
        self.agent_base_url = os.getenv('AGENT_BASE_URL', 'https://c64b-34-125-235-37.ngrok-free.app')
        self.max_retries = int(os.getenv('MAX_RETRIES', '2'))
        self.retry_delay = int(os.getenv('RETRY_DELAY', '1000'))  # milliseconds
        
        # System configuration
        self.max_instances = int(os.getenv('MAX_INSTANCES', '10'))
        self.log_level = os.getenv('LOG_LEVEL', 'INFO')
        
        # AI/LLM configuration
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        
        # Database configuration
        self.firestore_database = os.getenv('FIRESTORE_DATABASE', '(default)')
        
        # Security configuration
        self.jwt_secret = os.getenv('JWT_SECRET')
        self.encryption_key = os.getenv('ENCRYPTION_KEY')
        
        # External service configuration
        self.email_service_url = os.getenv('EMAIL_SERVICE_URL')
        self.notification_service_url = os.getenv('NOTIFICATION_SERVICE_URL')
        
        # Feature flags
        self.enable_wellness_monitoring = os.getenv('ENABLE_WELLNESS_MONITORING', 'true').lower() == 'true'
        self.enable_ai_fallback = os.getenv('ENABLE_AI_FALLBACK', 'true').lower() == 'true'
        self.enable_peer_matching = os.getenv('ENABLE_PEER_MATCHING', 'true').lower() == 'true'
        
    def get_agent_config(self, agent_name: str) -> Dict[str, Any]:
        """Get configuration specific to an agent"""
        base_config = {
            'max_retries': self.max_retries,
            'retry_delay': self.retry_delay,
            'base_url': self.agent_base_url,
            'log_level': self.log_level
        }
        
        # Agent-specific configurations
        agent_configs = {
            'profile_agent': {
                'endpoint': '/profile',
                'timeout': 30000,
                'cache_ttl': 3600
            },
            'classification_agent': {
                'endpoint': '/classify',
                'timeout': 15000,
                'cache_ttl': 1800
            },
            'matching_agent': {
                'endpoint': '/match',
                'timeout': 20000,
                'max_matches': 5
            },
            'ai_chat_agent': {
                'endpoint': '/ai-peer',
                'timeout': 30000,
                'max_conversation_length': 50
            },
            'connection_agent': {
                'endpoint': '/orchestrate',
                'timeout': 25000
            },
            'wellness_agent': {
                'endpoint': '/wellness',
                'timeout': 20000,
                'monitoring_interval': 3600
            }
        }
        
        return {**base_config, **agent_configs.get(agent_name, {})}
    
    def get_firestore_config(self) -> Dict[str, Any]:
        """Get Firestore configuration"""
        return {
            'project_id': self.firebase_project_id,
            'database': self.firestore_database,
            'credentials': {
                'private_key': self.firebase_private_key,
                'client_email': self.firebase_client_email
            }
        }
    
    def get_collections(self) -> Dict[str, str]:
        """Get Firestore collection names"""
        return {
            'teachers': 'teachers',
            'teacher_profiles': 'teacherProfiles',
            'challenges': 'challenges',
            'ai_interactions': 'aiInteractions',
            'wellness_reports': 'wellness_reports',
            'connections': 'connections',
            'chat_sessions': 'chatSessions'
        }
    
    def validate_config(self) -> bool:
        """Validate essential configuration"""
        required_vars = [
            'firebase_project_id',
            'agent_base_url'
        ]
        
        missing_vars = [var for var in required_vars if not getattr(self, var)]
        
        if missing_vars:
            raise ValueError(f"Missing required configuration: {', '.join(missing_vars)}")
            
        return True

# Global configuration instance
config = Config()