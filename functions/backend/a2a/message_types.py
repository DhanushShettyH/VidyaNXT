from enum import Enum

class MessageType(Enum):
    """A2A Message types"""
    REQUEST = "request"
    RESPONSE = "response"
    EVENT = "event"
    BROADCAST = "broadcast"
    ERROR = "error"

class AgentAction(Enum):
    """Standard agent actions"""
    PROCESS_PROFILE = "process_profile"
    CLASSIFY_CONTENT = "classify_content"
    FIND_MATCHES = "find_matches"
    GENERATE_CHAT = "generate_chat"
    CHECK_WELLNESS = "check_wellness"
    CONNECT_TEACHERS = "connect_teachers"
    COORDINATE_ACTIVITY = "coordinate_activity"
    MONITOR_SYSTEM = "monitor_system"
    UPDATE_NETWORK = "update_network"

class Priority(Enum):
    """Message priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4

class AgentStatus(Enum):
    """Agent status values"""
    ACTIVE = "active"
    BUSY = "busy"
    IDLE = "idle"
    ERROR = "error"
    OFFLINE = "offline"