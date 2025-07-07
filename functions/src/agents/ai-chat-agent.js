// functions/src/agents/ai-chat-agent.js
const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class AiChatAgent {
  constructor() {
    this.name = "AI Chat Agent";
  }

  async createPersona(teacherProfile, challengeText) {
    try {
      const prompt = `
        Create a personalized AI teaching assistant persona for this teacher:
        
        Teacher Profile: ${JSON.stringify(teacherProfile)}
        Teaching Challenge: ${challengeText}
        
        Based on their profile, create a persona that matches their teaching style and needs.
        
        Return ONLY a JSON object with:
        {
          "persona": "Brief description of the AI assistant persona (2-3 sentences)",
          "welcomeMessage": "Warm, personalized greeting that references their challenge",
          "suggestedQuestions": [
            "Question 1 - specific to their challenge",
            "Question 2 - related to their teaching context",
            "Question 3 - about implementation strategies",
            "Question 4 - about measuring success"
          ]
        }
      `;

      const response = await generateText(prompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("❌ Persona creation failed:", error);
      return this.getFallbackPersona();
    }
  }

  async generateResponse(sessionContext, userMessage) {
    try {
      const {
        persona,
        challengeText,
        conversationHistory = [],
      } = sessionContext;

      // Build conversation context
      const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
      const historyText =
        recentHistory.length > 0
          ? `Previous conversation:\n${recentHistory.map((msg) => `${msg.type}: ${msg.message}`).join("\n")}\n\n`
          : "";

      const prompt = `
        You are: ${persona}
        
        Teaching Challenge Context: ${challengeText}
        
        ${historyText}Teacher: ${userMessage}
        
        Respond as a knowledgeable, supportive teaching assistant. Be:
        - Practical and actionable
        - Encouraging and positive
        - Specific to their context
        - Conversational, not formal
        
        Return ONLY a JSON object with:
        {
          "response": "Your helpful response (2-4 sentences)",
          "suggestedFollowUps": [
            "Follow-up question 1",
            "Follow-up question 2",
            "Follow-up question 3"
          ],
          "confidence": 0.85,
          "type": "advice|strategy|encouragement|question"
        }
      `;

      const response = await generateText(prompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("❌ AI response generation failed:", error);
      return this.getFallbackResponse();
    }
  }

  async analyzeSession(sessionData, messages) {
    try {
      const userMessages = messages.filter((msg) => msg.type === "user");
      const aiMessages = messages.filter((msg) => msg.type === "ai");

      const prompt = `
        Analyze this AI chat session about teaching:
        
        Original Challenge: ${sessionData.challengeText}
        Session Duration: ${sessionData.messageCount} messages
        
        Teacher Messages: ${JSON.stringify(userMessages.map((m) => m.message))}
        AI Responses: ${JSON.stringify(aiMessages.map((m) => m.message))}
        
        Provide analysis focusing on:
        - How well the challenge was addressed
        - Key insights discovered
        - Actionable recommendations
        - Teacher engagement level
        
        Return ONLY a JSON object with:
        {
          "summary": "Brief summary of the session (2-3 sentences)",
          "keyInsights": [
            "Main insight 1",
            "Main insight 2",
            "Main insight 3"
          ],
          "recommendations": [
            "Specific action 1",
            "Specific action 2",
            "Specific action 3"
          ],
          "satisfaction": 8,
          "challengeResolved": true,
          "followUpNeeded": false
        }
      `;

      const response = await generateText(prompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("❌ Session analysis failed:", error);
      return this.getFallbackAnalysis();
    }
  }

  async generateWellnessInsights(teacherId, messages, sessionMetrics) {
    try {
      const userMessages = messages.filter((msg) => msg.type === "user");

      const prompt = `
        Analyze these teacher messages for wellness indicators:
        
        Messages: ${JSON.stringify(userMessages.map((m) => m.message))}
        Session Info: ${JSON.stringify(sessionMetrics)}
        
        Look for signs of:
        - Stress or burnout
        - Confidence levels
        - Support needs
        - Emotional state
        
        Return ONLY a JSON object with:
        {
          "stressLevel": "low|medium|high",
          "confidenceLevel": "low|medium|high",
          "supportNeeds": ["need1", "need2"],
          "emotionalState": "positive|neutral|concerned",
          "recommendations": ["rec1", "rec2"],
          "urgency": "low|medium|high"
        }
      `;

      const response = await generateText(prompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("❌ Wellness analysis failed:", error);
      // wellness analysis yet need to define
      return null;
    }
  }

  getFallbackPersona() {
    return {
      persona:
        "I'm your AI teaching assistant, here to help you navigate teaching challenges with practical advice and support.",
      welcomeMessage:
        "Hello! I'm here to help you with your teaching challenge. Let's work through this together!",
      suggestedQuestions: [
        "What specific aspect of this challenge is most concerning?",
        "What have you already tried to address this?",
        "How are your students responding currently?",
        "What would success look like for you?",
      ],
    };
  }

  getFallbackResponse() {
    return {
      response:
        "I understand you're facing a teaching challenge. Could you tell me more about what's happening in your classroom so I can provide more targeted support?",
      suggestedFollowUps: [
        "What strategies have you tried so far?",
        "How are students responding?",
        "What's your biggest concern right now?",
      ],
      confidence: 0.5,
      type: "question",
    };
  }

  getFallbackAnalysis() {
    return {
      summary:
        "Session completed with teacher engagement on their teaching challenge.",
      keyInsights: [
        "Teacher actively engaged in problem-solving",
        "Multiple strategies discussed",
        "Follow-up actions identified",
      ],
      recommendations: [
        "Implement discussed strategies",
        "Monitor progress over next week",
        "Return for follow-up session if needed",
      ],
      satisfaction: 7,
      challengeResolved: false,
      followUpNeeded: true,
    };
  }
}

module.exports = AiChatAgent;
