from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """Base agent class for ADK framework"""
    
    def __init__(self, agent_id: str, firestore_server=None, gemini_server=None):
        self.agent_id = agent_id
        self.firestore_server = firestore_server
        self.gemini_server = gemini_server
        self.last_used = None
        self.context = {}
        
        logger.info(f"Agent {agent_id} initialized")
    
    @abstractmethod
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process the main agent logic"""
        pass
    
    def handle_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming A2A messages"""
        try:
            self.last_used = datetime.now()
            
            action = message.get('action')
            data = message.get('data', {})
            
            logger.info(f"Agent {self.agent_id} handling action: {action}")
            
            if action == 'process_profile':
                return self.process(data)
            else:
                raise ValueError(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Agent {self.agent_id} error: {e}")
            return {
                'success': False,
                'error': str(e),
                'agent_id': self.agent_id
            }
    
    def get_context(self, key: str) -> Optional[Any]:
        """Get context value using MCP"""
        if self.firestore_server:
            return self.firestore_server.get_context(key)
        return self.context.get(key)
    
    def set_context(self, key: str, value: Any):
        """Set context value using MCP"""
        if self.firestore_server:
            self.firestore_server.set_context(key, value)
        else:
            self.context[key] = value
    
    def call_llm(self, prompt: str, **kwargs) -> str:
        """Call LLM using MCP Gemini server"""
        if self.gemini_server:
            return self.gemini_server.generate(prompt, **kwargs)
        else:
            # Fallback for MVP
            return f"Mock LLM response for: {prompt[:50]}..."