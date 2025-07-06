from typing import Dict, Any, Optional, List
import logging
from firebase_admin import firestore
from .base_server import MCPServer

logger = logging.getLogger(__name__)

class FirestoreServer(MCPServer):
    """MCP server for Firestore context management"""
    
    def __init__(self):
        super().__init__('firestore')
        self.db = None
        self.connect()
    
    def connect(self) -> bool:
        """Connect to Firestore"""
        try:
            self.db = firestore.client()
            self.is_connected = True
            logger.info("Firestore MCP server connected")
            return True
        except Exception as e:
            logger.error(f"Firestore connection failed: {e}")
            self.is_connected = False
            return False
    
    def disconnect(self):
        """Disconnect from Firestore"""
        self.db = None
        self.is_connected = False
        logger.info("Firestore MCP server disconnected")
    
    def store_context(self, collection: str, doc_id: str, data: Dict[str, Any]):
        """Store context in Firestore"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            self.db.collection(collection).document(doc_id).set(data)
            logger.info(f"Context stored: {collection}/{doc_id}")
            
        except Exception as e:
            logger.error(f"Failed to store context: {e}")
            raise
    
    def get_context_from_firestore(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get context from Firestore"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            doc = self.db.collection(collection).document(doc_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
            
        except Exception as e:
            logger.error(f"Failed to get context: {e}")
            return None
    
    def query_context(self, collection: str, field: str, value: Any) -> List[Dict[str, Any]]:
        """Query context from Firestore"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            docs = self.db.collection(collection).where(field, '==', value).get()
            return [doc.to_dict() for doc in docs]
            
        except Exception as e:
            logger.error(f"Failed to query context: {e}")
            return []
    
    def update_context(self, collection: str, doc_id: str, updates: Dict[str, Any]):
        """Update context in Firestore"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            self.db.collection(collection).document(doc_id).update(updates)
            logger.info(f"Context updated: {collection}/{doc_id}")
            
        except Exception as e:
            logger.error(f"Failed to update context: {e}")
            raise
    
    def delete_context(self, collection: str, doc_id: str):
        """Delete context from Firestore"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            self.db.collection(collection).document(doc_id).delete()
            logger.info(f"Context deleted: {collection}/{doc_id}")
            
        except Exception as e:
            logger.error(f"Failed to delete context: {e}")
            raise
    
    # Teacher Profile Methods
    def get_teacher_profile(self, teacher_id: str) -> Optional[Dict[str, Any]]:
        """Get teacher profile from Firestore"""
        return self.get_context_from_firestore('teacherProfiles', teacher_id)
    
    def store_teacher_profile(self, teacher_id: str, profile_data: Dict[str, Any]):
        """Store teacher profile in Firestore"""
        self.store_context('teacherProfiles', teacher_id, profile_data)
    
    def update_teacher_profile(self, teacher_id: str, updates: Dict[str, Any]):
        """Update teacher profile in Firestore"""
        self.update_context('teacherProfiles', teacher_id, updates)
    
    def get_teachers_by_subject(self, subject: str) -> List[Dict[str, Any]]:
        """Get teachers by subject"""
        return self.query_context('teacherProfiles', 'subject', subject)
    
    def get_teachers_by_location(self, location: str) -> List[Dict[str, Any]]:
        """Get teachers by location"""
        return self.query_context('teacherProfiles', 'location', location)
    
    def get_teachers_by_experience(self, min_experience: int) -> List[Dict[str, Any]]:
        """Get teachers by minimum experience"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            docs = self.db.collection('teacherProfiles').where('experience', '>=', min_experience).get()
            return [doc.to_dict() for doc in docs]
            
        except Exception as e:
            logger.error(f"Failed to query teachers by experience: {e}")
            return []
    
    # Student Profile Methods
    def get_student_profile(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Get student profile from Firestore"""
        return self.get_context_from_firestore('studentProfiles', student_id)
    
    def store_student_profile(self, student_id: str, profile_data: Dict[str, Any]):
        """Store student profile in Firestore"""
        self.store_context('studentProfiles', student_id, profile_data)
    
    def update_student_profile(self, student_id: str, updates: Dict[str, Any]):
        """Update student profile in Firestore"""
        self.update_context('studentProfiles', student_id, updates)
    
    # Matching Methods
    def store_match(self, match_id: str, match_data: Dict[str, Any]):
        """Store teacher-student match"""
        self.store_context('matches', match_id, match_data)
    
    def get_matches_for_teacher(self, teacher_id: str) -> List[Dict[str, Any]]:
        """Get all matches for a teacher"""
        return self.query_context('matches', 'teacher_id', teacher_id)
    
    def get_matches_for_student(self, student_id: str) -> List[Dict[str, Any]]:
        """Get all matches for a student"""
        return self.query_context('matches', 'student_id', student_id)
    
    def update_match_status(self, match_id: str, status: str):
        """Update match status"""
        self.update_context('matches', match_id, {'status': status, 'updated_at': firestore.SERVER_TIMESTAMP})
    
    # Chat/Communication Methods
    def store_chat_message(self, chat_id: str, message_data: Dict[str, Any]):
        """Store chat message"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            self.db.collection('chats').document(chat_id).collection('messages').add(message_data)
            logger.info(f"Chat message stored: {chat_id}")
            
        except Exception as e:
            logger.error(f"Failed to store chat message: {e}")
            raise
    
    def get_chat_messages(self, chat_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get chat messages"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            docs = self.db.collection('chats').document(chat_id).collection('messages').order_by('timestamp').limit(limit).get()
            return [doc.to_dict() for doc in docs]
            
        except Exception as e:
            logger.error(f"Failed to get chat messages: {e}")
            return []
    
    # Analytics Methods
    def store_analytics_event(self, event_data: Dict[str, Any]):
        """Store analytics event"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            self.db.collection('analytics').add(event_data)
            logger.info("Analytics event stored")
            
        except Exception as e:
            logger.error(f"Failed to store analytics event: {e}")
            raise
    
    def get_platform_stats(self) -> Dict[str, Any]:
        """Get platform statistics"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            # Get teacher count
            teachers_count = len(self.db.collection('teacherProfiles').get())
            
            # Get student count
            students_count = len(self.db.collection('studentProfiles').get())
            
            # Get active matches count
            active_matches = len(self.query_context('matches', 'status', 'active'))
            
            return {
                'total_teachers': teachers_count,
                'total_students': students_count,
                'active_matches': active_matches,
                'timestamp': firestore.SERVER_TIMESTAMP
            }
            
        except Exception as e:
            logger.error(f"Failed to get platform stats: {e}")
            return {}
    
    # Bulk Operations
    def bulk_update_profiles(self, profile_updates: List[Dict[str, Any]]):
        """Bulk update multiple profiles"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            batch = self.db.batch()
            
            for update in profile_updates:
                collection = update.get('collection', 'teacherProfiles')
                doc_id = update.get('doc_id')
                data = update.get('data', {})
                
                if doc_id and data:
                    doc_ref = self.db.collection(collection).document(doc_id)
                    batch.update(doc_ref, data)
            
            batch.commit()
            logger.info(f"Bulk updated {len(profile_updates)} profiles")
            
        except Exception as e:
            logger.error(f"Failed to bulk update profiles: {e}")
            raise
    
    # Search Methods
    def search_profiles(self, search_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search profiles with multiple criteria"""
        try:
            if not self.is_connected:
                raise Exception("Firestore not connected")
            
            collection = search_params.get('collection', 'teacherProfiles')
            query = self.db.collection(collection)
            
            # Apply filters
            for field, value in search_params.get('filters', {}).items():
                if field != 'collection':
                    query = query.where(field, '==', value)
            
            # Apply limit
            limit = search_params.get('limit', 10)
            query = query.limit(limit)
            
            docs = query.get()
            return [doc.to_dict() for doc in docs]
            
        except Exception as e:
            logger.error(f"Failed to search profiles: {e}")
            return []
    
    def health_check(self) -> Dict[str, Any]:
        """Check Firestore connection health"""
        try:
            if not self.is_connected:
                return {'status': 'disconnected', 'message': 'Firestore not connected'}
            
            # Try a simple read operation
            self.db.collection('_health').limit(1).get()
            
            return {
                'status': 'healthy',
                'message': 'Firestore connection is working',
                'server_id': self.server_id
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'server_id': self.server_id
            }