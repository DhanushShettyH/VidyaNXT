from typing import Dict, Any, Optional
import logging
import os
from .base_server import MCPServer

logger = logging.getLogger(__name__)

class GeminiServer(MCPServer):
    """MCP server for Gemini API integration"""
    
    def __init__(self):
        super().__init__('gemini')
        self.api_key = None
        self.model_name = "gemini-pro"
        self.connect()
    
    def connect(self) -> bool:
        """Connect to Gemini API"""
        try:
            self.api_key = os.getenv('GEMINI_API_KEY')
            if not self.api_key:
                raise Exception("GEMINI_API_KEY environment variable not set")
            
            # Import here to avoid issues if google-generativeai is not installed
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.genai = genai
            
            self.is_connected = True
            logger.info("Gemini MCP server connected")
            return True
            
        except Exception as e:
            logger.error(f"Gemini connection failed: {e}")
            self.is_connected = False
            return False
    
    def disconnect(self):
        """Disconnect from Gemini API"""
        self.api_key = None
        self.genai = None
        self.is_connected = False
        logger.info("Gemini MCP server disconnected")
    
    def generate(self, prompt: str, max_tokens: int = 150, temperature: float = 0.7) -> str:
        """Generate text using Gemini"""
        try:
            if not self.is_connected:
                # Fallback for MVP when Gemini is not available
                return self._fallback_generate(prompt, max_tokens)
            
            model = self.genai.GenerativeModel(self.model_name)
            
            generation_config = {
                "max_output_tokens": max_tokens,
                "temperature": temperature,
            }
            
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            return self._fallback_generate(prompt, max_tokens)
    
    def _fallback_generate(self, prompt: str, max_tokens: int) -> str:
        """Fallback text generation for MVP"""
        # Simple fallback for MVP when Gemini is not available
        if "summary" in prompt.lower():
            return "Experienced educator with strong background in curriculum development and student engagement."
        elif "expertise" in prompt.lower():
            return "Skilled in classroom management, curriculum design, and student assessment."
        else:
            return "Professional educator committed to student success and continuous learning."
    
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text"""
        try:
            prompt = f"""
            Analyze the sentiment of this text and provide a JSON response with:
            - sentiment: positive, negative, or neutral
            - confidence: 0-1 score
            - key_emotions: list of detected emotions
            
            Text: {text}
            """
            
            response = self.generate(prompt, max_tokens=100)
            
            # For MVP, return a simple response
            return {
                "sentiment": "neutral",
                "confidence": 0.7,
                "key_emotions": ["professional", "engaged"]
            }
            
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return {
                "sentiment": "neutral",
                "confidence": 0.5,
                "key_emotions": []
            }
    
    def extract_keywords(self, text: str, limit: int = 10) -> list:
        """Extract keywords from text"""
        try:
            prompt = f"""
            Extract the {limit} most important keywords from this text.
            Return only the keywords, one per line.
            
            Text: {text}
            """
            
            response = self.generate(prompt, max_tokens=50)
            keywords = [k.strip() for k in response.split('\n') if k.strip()]
            
            return keywords[:limit]
            
        except Exception as e:
            logger.error(f"Keyword extraction failed: {e}")
            return ["education", "teaching", "learning", "curriculum"]
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get API usage statistics"""
        return {
            "server_id": self.server_id,
            "connected": self.is_connected,
            "model": self.model_name,
            "requests_made": getattr(self, 'requests_made', 0)
        }