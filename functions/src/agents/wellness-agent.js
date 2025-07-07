const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class WellnessAgent {
  // Analyze challenge wellness
  async analyzeChallengeWellness(teacherId, challengeContent) {
    try {
      const prompt = `
        Analyze the wellness indicators in this teacher's challenge:
        Challenge: "${challengeContent}"
        
        Return JSON with:
        {
          "wellness_scores": {
            "stress_level": 1-10,
            "emotional_state": 1-10,
            "support_needed": 1-10,
            "overall_wellness": 1-10
          },
          "critical_alert": boolean,
          "urgency_level": "low|medium|high",
          "recommendations": ["recommendation1", "recommendation2"],
          "analysis_type": "challenge",
          "key_indicators": ["indicator1", "indicator2"]
        }
      `;

      const response = await generateText(prompt);
      const analysis = parseGeminiResponse(response);

      return {
        ...analysis,
        teacher_id: teacherId,
        analyzed_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Challenge wellness analysis failed:", error);
      throw error;
    }
  }

  // Analyze chat wellness
  async analyzeChatWellness(teacherId, messagesData, sessionData) {
    try {
      const userMessages = messagesData.filter((msg) => msg.type === "user");
      const conversationText = userMessages.map((msg) => msg.message).join(" ");

      const prompt = `
        Analyze the wellness indicators in this teacher's chat conversation:
        Messages: ${conversationText}
        Session Duration: ${sessionData.duration || 0}ms
        Message Count: ${sessionData.message_count || 0}
        
        Return JSON with:
        {
          "wellness_scores": {
            "engagement_level": 1-10,
            "emotional_state": 1-10,
            "support_needed": 1-10,
            "overall_wellness": 1-10
          },
          "critical_alert": boolean,
          "urgency_level": "low|medium|high",
          "recommendations": ["recommendation1", "recommendation2"],
          "analysis_type": "chat",
          "key_indicators": ["indicator1", "indicator2"]
        }
      `;

      const response = await generateText(prompt);
      const analysis = parseGeminiResponse(response);

      return {
        ...analysis,
        teacher_id: teacherId,
        session_data: sessionData,
        analyzed_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Chat wellness analysis failed:", error);
      throw error;
    }
  }

  // Generate wellness insights
  async generateWellnessInsights(teacherId, wellnessData) {
    try {
      const prompt = `
        Generate wellness insights for teacher based on their data:
        Wellness Data: ${JSON.stringify(wellnessData)}
        
        Return JSON with:
        {
          "insights": ["insight1", "insight2"],
          "recommendations": ["recommendation1", "recommendation2"],
          "action_items": ["action1", "action2"],
          "wellness_trend": "improving|declining|stable"
        }
      `;

      const response = await generateText(prompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("Wellness insights generation failed:", error);
      throw error;
    }
  }

  // Get wellness dashboard summary
  async getWellnessDashboardSummary(teacherId, dashboardData) {
    try {
      const prompt = `
        Create a wellness dashboard summary for teacher:
        Dashboard Data: ${JSON.stringify(dashboardData)}
        
        Return JSON with:
        {
          "summary": "Brief wellness summary",
          "status": "good|concerning|critical",
          "priority_actions": ["action1", "action2"],
          "next_steps": ["step1", "step2"]
        }
      `;

      const response = await generateText(prompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("Wellness dashboard summary failed:", error);
      throw error;
    }
  }
}

module.exports = new WellnessAgent();
