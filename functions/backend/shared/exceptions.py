class VidyaNXTError(Exception):
    """Base exception for VidyaNXT application"""
    
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

class AgentError(VidyaNXTError):
    """Agent-related errors"""
    
    def __init__(self, agent_id: str, message: str, details: dict = None):
        super().__init__('agent-error', message, details)
        self.agent_id = agent_id

class A2AProtocolError(VidyaNXTError):
    """A2A Protocol errors"""
    
    def __init__(self, message: str, message_id: str = None, details: dict = None):
        super().__init__('a2a-error', message, details)
        self.message_id = message_id

class MCPError(VidyaNXTError):
    """MCP Server errors"""
    
    def __init__(self, server_id: str, message: str, details: dict = None):
        super().__init__('mcp-error', message, details)
        self.server_id = server_id

class ValidationError(VidyaNXTError):
    """Data validation errors"""
    
    def __init__(self, field: str, message: str, details: dict = None):
        super().__init__('validation-error', message, details)
        self.field = field

class AuthenticationError(VidyaNXTError):
    """Authentication errors"""
    
    def __init__(self, message: str = "Authentication required", details: dict = None):
        super().__init__('unauthenticated', message, details)

class AuthorizationError(VidyaNXTError):
    """Authorization errors"""
    
    def __init__(self, message: str = "Insufficient permissions", details: dict = None):
        super().__init__('permission-denied', message, details)