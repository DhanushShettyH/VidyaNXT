from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class MCPServer(ABC):
    """Base MCP (Model Context Protocol) server"""
    
    def __init__(self, server_id: str):
        self.server_id = server_id
        self.context_store = {}
        self.is_connected = False
        
    @abstractmethod
    def connect(self) -> bool:
        """Connect to the service"""
        pass
    
    @abstractmethod
    def disconnect(self):
        """Disconnect from the service"""
        pass
    
    def get_context(self, key: str) -> Optional[Any]:
        """Get context value"""
        return self.context_store.get(key)
    
    def set_context(self, key: str, value: Any):
        """Set context value"""
        self.context_store[key] = value
    
    def clear_context(self, key: Optional[str] = None):
        """Clear context"""
        if key:
            self.context_store.pop(key, None)
        else:
            self.context_store.clear()
    
    def get_status(self) -> Dict[str, Any]:
        """Get server status"""
        return {
            'server_id': self.server_id,
            'connected': self.is_connected,
            'context_keys': list(self.context_store.keys())
        }