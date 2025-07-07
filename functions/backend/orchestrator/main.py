import logging
from typing import Dict, Any
from ..agents.profile_agent.agent import ProfileAgent
from ..a2a.protocol import A2AProtocol
from ..mcp.servers.firestore_server import FirestoreServer
from ..mcp.servers.gemini_server import GeminiServer
from ..shared.config import Config

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    """Main orchestrator for all agents using ADK framework"""
    
    def __init__(self):
        self.config = Config()
        self.a2a_protocol = A2AProtocol()
        
        # Initialize MCP servers
        self.firestore_server = FirestoreServer()
        self.gemini_server = GeminiServer()
        
        # Initialize agents
        self.profile_agent = ProfileAgent(
            firestore_server=self.firestore_server,
            gemini_server=self.gemini_server
        )
        
        # Agent registry
        self.agents = {
            'profile': self.profile_agent
        }
        
        logger.info("Agent orchestrator initialized")
    
    def process_teacher_profile(self, teacher_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process teacher profile using profile agent"""
        try:
            logger.info(f"Processing teacher profile: {teacher_data['id']}")
            
            # Create A2A message
            message = self.a2a_protocol.create_message(
                agent_id='profile',
                action='process_profile',
                data=teacher_data
            )
            
            # Route to profile agent
            result = self.profile_agent.handle_message(message)
            
            logger.info(f"Profile processed successfully: {teacher_data['id']}")
            return result
            
        except Exception as e:
            logger.error(f"Profile processing failed: {e}")
            raise
    
    def route_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Route messages between agents"""
        try:
            agent_id = message.get('target_agent')
            
            if agent_id not in self.agents:
                raise ValueError(f"Unknown agent: {agent_id}")
            
            agent = self.agents[agent_id]
            return agent.handle_message(message)
            
        except Exception as e:
            logger.error(f"Message routing failed: {e}")
            raise
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Get status of all agents"""
        status = {}
        for agent_id, agent in self.agents.items():
            status[agent_id] = {
                'active': True,
                'last_used': getattr(agent, 'last_used', None)
            }
        return status