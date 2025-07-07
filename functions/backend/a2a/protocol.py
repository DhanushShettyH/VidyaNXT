from typing import Dict, Any, Optional
import uuid
from datetime import datetime
import logging
from .message_types import MessageType

logger = logging.getLogger(__name__)

class A2AProtocol:
    """Agent-to-Agent communication protocol"""
    
    def __init__(self):
        self.message_log = []
        self.active_conversations = {}
        
    def create_message(
        self, 
        agent_id: str, 
        action: str, 
        data: Dict[str, Any],
        conversation_id: Optional[str] = None,
        priority: int = 1
    ) -> Dict[str, Any]:
        """Create a standardized A2A message"""
        
        message_id = str(uuid.uuid4())
        
        message = {
            'id': message_id,
            'timestamp': datetime.now().isoformat(),
            'source_agent': 'orchestrator',
            'target_agent': agent_id,
            'action': action,
            'data': data,
            'conversation_id': conversation_id or message_id,
            'priority': priority,
            'status': 'pending',
            'type': MessageType.REQUEST.value
        }
        
        self.message_log.append(message)
        
        if conversation_id:
            if conversation_id not in self.active_conversations:
                self.active_conversations[conversation_id] = []
            self.active_conversations[conversation_id].append(message_id)
        
        logger.info(f"A2A message created: {message_id} -> {agent_id}")
        return message
    
    def create_response(
        self, 
        original_message: Dict[str, Any], 
        response_data: Dict[str, Any],
        success: bool = True
    ) -> Dict[str, Any]:
        """Create a response message"""
        
        response_id = str(uuid.uuid4())
        
        response = {
            'id': response_id,
            'timestamp': datetime.now().isoformat(),
            'source_agent': original_message['target_agent'],
            'target_agent': original_message['source_agent'],
            'action': f"{original_message['action']}_response",
            'data': response_data,
            'conversation_id': original_message['conversation_id'],
            'priority': original_message['priority'],
            'status': 'completed' if success else 'failed',
            'type': MessageType.RESPONSE.value,
            'in_response_to': original_message['id']
        }
        
        self.message_log.append(response)
        
        logger.info(f"A2A response created: {response_id}")
        return response
    
    def send_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send message (for future implementation)"""
        # In MVP, this is just a placeholder
        # In full implementation, this would handle routing, queuing, etc.
        
        message['status'] = 'sent'
        logger.info(f"Message sent: {message['id']}")
        return message
    
    def get_conversation_history(self, conversation_id: str) -> list:
        """Get conversation history"""
        return [
            msg for msg in self.message_log 
            if msg.get('conversation_id') == conversation_id
        ]
    
    def get_message_log(self, limit: int = 100) -> list:
        """Get recent message log"""
        return self.message_log[-limit:]
    
    def validate_message(self, message: Dict[str, Any]) -> bool:
        """Validate message structure"""
        required_fields = [
            'id', 'timestamp', 'source_agent', 'target_agent', 
            'action', 'data', 'type'
        ]
        
        for field in required_fields:
            if field not in message:
                logger.error(f"Missing required field: {field}")
                return False
        
        return True
    
    def cleanup_old_messages(self, max_age_hours: int = 24):
        """Clean up old messages (MVP version)"""
        # Simple cleanup for MVP
        if len(self.message_log) > 1000:
            self.message_log = self.message_log[-500:]
            logger.info("Message log cleaned up")