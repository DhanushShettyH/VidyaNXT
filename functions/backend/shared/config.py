import os
from typing import Dict, Any

class Config:
    """Configuration management for VidyaNXT"""
    
    def __init__(self):
        self.env = os.getenv('ENV', 'development')
        self.debug = os.getenv('DEBUG', 'false').lower() == 'true'
        
        # Firebase config
        self.firebase_project_id = os.getenv('FIREBASE_PROJECT_ID')
        
        # Gemini config
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.gemini_model = os.getenv('GEMINI_MODEL', 'gemini-pro')
        
        # Agent config
        self.max_agents = int(os.getenv('MAX_AGENTS', '10'))
        self.agent_timeout = int(os.getenv('AGENT_TIMEOUT', '30'))
        
        # A2A Protocol config
        self.message_retention_hours = int(os.getenv('MESSAGE_RETENTION_HOURS', '24'))
        self.max_conversation_length = int(os.getenv('MAX_CONVERSATION_LENGTH', '100'))
        
        # MCP config
        self.mcp_timeout = int(os.getenv('MCP_TIMEOUT', '10'))
        
    def get_agent_config(self) -> Dict[str, Any]:
        """Get agent-specific configuration"""
        return {
            'max_agents': self.max_agents,
            'timeout': self.agent_timeout,
            'debug': self.debug
        }
    
    def get_gemini_config(self) -> Dict[str, Any]:
        """Get Gemini configuration"""
        return {
            'api_key': self.gemini_api_key,
            'model': self.gemini_model,
            'timeout': self.mcp_timeout
        }
    
    def get_a2a_config(self) -> Dict[str, Any]:
        """Get A2A protocol configuration"""
        return {
            'retention_hours': self.message_retention_hours,
            'max_conversation_length': self.max_conversation_length
        }
    
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.env == 'production'
    
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.env == 'development'