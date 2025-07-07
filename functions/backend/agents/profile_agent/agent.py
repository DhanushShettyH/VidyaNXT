from typing import Dict, Any
import logging
from datetime import datetime
from ..base_agent import BaseAgent

logger = logging.getLogger(__name__)

class ProfileAgent(BaseAgent):
    """Agent for processing teacher profiles"""
    
    def __init__(self, firestore_server=None, gemini_server=None):
        super().__init__('profile', firestore_server, gemini_server)
        
        # Network stats for MVP
        self.network_stats = {
            'total_teachers': 0,
            'grade_coverage': {},
            'location_coverage': {}
        }
    
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process teacher profile data"""
        try:
            teacher_id = data['id']
            name = data['name']
            grades = data['grades']
            location = data['location']
            experience = data['experience']
            
            # Create profile text
            profile_text = (
                f"Teacher Profile: {name} teaches grades {', '.join(grades)} "
                f"in {location} with {experience} years of experience."
            )
            
            # Generate summary using Gemini
            summary = self._generate_summary(profile_text)
            
            # Determine experience level
            if experience < 3:
                experience_level = "novice"
            elif experience < 10:
                experience_level = "experienced"
            else:
                experience_level = "veteran"
            
            # Create AI interaction preferences
            ai_preferences = {
                "preferredInteractionStyle": "supportive" if experience < 5 else "collaborative",
                "topicExpertise": self._determine_topic_expertise(grades, experience),
                "communicationPreference": "detailed" if experience_level == "novice" else "concise"
            }
            
            # Create matching criteria
            matching_criteria = {
                "grades": grades,
                "location": location,
                "experienceLevel": experience_level,
                "gradeScore": len(grades) * 10,
                "regionKey": location.lower().replace(' ', '_')
            }
            
            # Calculate profile strength
            profile_strength = min(100, experience * 5 + len(grades) * 15)
            
            # Update network stats
            self._update_network_stats(grades, location)
            
            # Build result
            result = {
                "teacherId": teacher_id,
                "summary": summary,
                "matchingCriteria": matching_criteria,
                "aiPreferences": ai_preferences,
                "profileStrength": profile_strength,
                "createdAt": datetime.now().isoformat(),
                "success": True
            }
            
            # Store in context for future use
            self.set_context(f"teacher_profile_{teacher_id}", result)
            
            logger.info(f"Profile processed for teacher {teacher_id}")
            return result
            
        except Exception as e:
            logger.error(f"Profile processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "teacherId": data.get('id', 'unknown')
            }
    
    def _generate_summary(self, profile_text: str) -> str:
        """Generate profile summary using Gemini"""
        try:
            prompt = f"""
            Create a concise professional summary (max 50 words) for this teacher profile:
            {profile_text}
            
            Focus on teaching expertise and experience level.
            """
            
            summary = self.call_llm(prompt, max_tokens=60)
            return summary.strip()
            
        except Exception as e:
            logger.warning(f"LLM summary failed, using fallback: {e}")
            # Fallback summary for MVP
            return f"Experienced educator specializing in multiple grade levels with strong background in curriculum development."
    
    def _determine_topic_expertise(self, grades: list, experience: int) -> list:
        """Determine topic expertise based on grades and experience"""
        expertise = []
        
        # Grade-based expertise
        if any(grade in ['K', '1', '2', '3'] for grade in grades):
            expertise.extend(['early_childhood', 'foundational_literacy'])
        
        if any(grade in ['4', '5', '6'] for grade in grades):
            expertise.extend(['elementary_math', 'reading_comprehension'])
        
        if any(grade in ['7', '8', '9'] for grade in grades):
            expertise.extend(['middle_school_transition', 'adolescent_development'])
        
        if any(grade in ['10', '11', '12'] for grade in grades):
            expertise.extend(['high_school_preparation', 'college_readiness'])
        
        # Experience-based expertise
        if experience >= 10:
            expertise.append('curriculum_development')
        
        if experience >= 5:
            expertise.append('classroom_management')
        
        return list(set(expertise))
    
    def _update_network_stats(self, grades: list, location: str):
        """Update network statistics"""
        self.network_stats['total_teachers'] += 1
        
        # Grade coverage
        for grade in grades:
            self.network_stats['grade_coverage'][grade] = (
                self.network_stats['grade_coverage'].get(grade, 0) + 1
            )
        
        # Location coverage
        self.network_stats['location_coverage'][location] = (
            self.network_stats['location_coverage'].get(location, 0) + 1
        )
        
        # Store updated stats in context
        self.set_context('network_stats', self.network_stats)
    
    def get_network_stats(self) -> Dict[str, Any]:
        """Get current network statistics"""
        return self.network_stats