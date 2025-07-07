const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const { parseGeminiResponse } = require("../utils/helpers");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize
const db = admin.firestore();

/**
 * Orchestration Agent
 * Orchestrates connections and creates AI sessions
 */
class OrchestrationAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }
  /**
   * Orchestrate challenge connections
   */
  async orchestrate({
    challengeId,
    teacherId,
    matches,
    text,
    classification,
    teacherProfile,
  }) {
    try {
      //   logger.info(`Orchestrating challenge: ${challengeId}`);

      // Create orchestration prompt
      const prompt = this.buildOrchestrationPrompt({
        matches,
        text,
        classification,
        teacherProfile,
      });

      // Get orchestration result from Gemini
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const orchestrationData = parseGeminiResponse(response.text());

      // Build final orchestration result
      const orchestrationResult = {
        recommendedConnections: orchestrationData.recommendedConnections || [],
        recommendAiChat: orchestrationData.recommendAiChat || false,
        connectionStrategy:
          orchestrationData.connectionStrategy || "peer-first",
        priorityOrder: orchestrationData.priorityOrder || ["peer", "ai"],
        estimatedHelpTime: orchestrationData.estimatedHelpTime || "2-4 hours",
        suggestedNextSteps: orchestrationData.suggestedNextSteps || [],
        orchestrationEnhanced: true,
      };

      //   logger.info(`Orchestration completed for challenge: ${challengeId}`, {
      //     connections: orchestrationResult.recommendedConnections.length,
      //     aiRecommended: orchestrationResult.recommendAiChat,
      //   });

      return orchestrationResult;
    } catch (error) {
      console.error(
        `Orchestration failed for challenge ${challengeId}:`,
        error
      );
      //   logger.error(`Orchestration failed for challenge ${challengeId}:`, error);

      // Return fallback orchestration
      return {
        recommendedConnections: matches.map((match) => ({
          type: "peer",
          peerId: match.peerId,
          priority: "medium",
          reason: "Fallback match",
        })),
        recommendAiChat: true,
        connectionStrategy: "hybrid",
        priorityOrder: ["ai", "peer"],
        estimatedHelpTime: "2-4 hours",
        suggestedNextSteps: ["Start with AI chat for immediate guidance"],
        orchestrationEnhanced: false,
      };
    }
  }

  /**
   * Build orchestration prompt for Gemini
   */
  buildOrchestrationPrompt({ matches, text, classification, teacherProfile }) {
    return `
You are an expert education connection orchestrator. Analyze the challenge and create an optimal connection strategy.

Teacher Profile:
${JSON.stringify(teacherProfile, null, 2)}

Challenge Text: "${text}"

Classification:
${JSON.stringify(classification, null, 2)}

Available Matches:
${JSON.stringify(matches, null, 2)}

Create an orchestration strategy that considers:
1. Challenge urgency and complexity
2. Teacher experience level
3. Available peer quality
4. Time sensitivity
5. Support type needed

Respond with JSON:
{
  "recommendedConnections": [
    {
      "type": "peer",
      "peerId": "teacher_id",
      "priority": "high/medium/low",
      "reason": "why this connection is recommended",
      "estimatedResponseTime": "time estimate"
    }
  ],
  "recommendAiChat": true/false,
  "connectionStrategy": "peer-first/ai-first/hybrid",
  "priorityOrder": ["peer", "ai"] or ["ai", "peer"],
  "estimatedHelpTime": "time estimate",
  "suggestedNextSteps": ["actionable next steps"]
}

Prioritize based on urgency, match quality, and teacher needs.
`;
  }

  /**
   * Create AI session for immediate support
   */
  async createAiSession({
    teacherId,
    challengeId,
    challengeText,
    teacherProfile,
  }) {
    try {
      //   logger.info(`Creating AI session for challenge: ${challengeId}`);

      const sessionId = uuidv4();

      // Create AI session prompt
      const prompt = this.buildAiSessionPrompt({
        challengeText,
        teacherProfile,
      });

      // Get AI session setup from Gemini
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const sessionData = parseGeminiResponse(response.text());

      const aiSessionResult = {
        sessionId,
        persona: sessionData.persona || "supportive-mentor",
        welcomeMessage:
          sessionData.welcomeMessage ||
          "Hello! I'm here to help you work through this challenge.",
        suggestedQuestions: sessionData.suggestedQuestions || [
          "Can you tell me more about the specific situation?",
          "What have you tried so far?",
          "What would an ideal outcome look like?",
        ],
        sessionType: sessionData.sessionType || "problem-solving",
      };

      //   logger.info(`AI session created: ${sessionId}`);
      return aiSessionResult;
    } catch (error) {
      console.error(
        `Failed to create AI session for challenge ${challengeId}:`,
        error
      );
      //   logger.error(`Failed to create AI session:`, error);

      // Return fallback session
      return {
        sessionId: uuidv4(),
        persona: "supportive-mentor",
        welcomeMessage:
          "I'm here to help you work through this challenge. Let's start by understanding your situation better.",
        suggestedQuestions: [
          "What's the main issue you're facing?",
          "How long has this been a problem?",
          "What resources do you have available?",
        ],
        sessionType: "general-support",
      };
    }
  }

  /**
   * Build AI session prompt for Gemini
   */
  buildAiSessionPrompt({ challengeText, teacherProfile }) {
    return `
You are designing a personalized AI chat session for a teacher. Create a session setup that matches their needs.

Teacher Profile:
${JSON.stringify(teacherProfile, null, 2)}

Challenge: "${challengeText}"

Design an AI persona and conversation starter that will be most helpful. Consider:
1. Teacher's experience level
2. Challenge type and complexity
3. Appropriate tone and approach
4. Useful initial questions

Available Personas:
- supportive-mentor: Encouraging, experienced, patient
- problem-solver: Analytical, structured, solution-focused
- collaborative-peer: Friendly, collaborative, peer-to-peer
- expert-advisor: Authoritative, knowledgeable, directive

Respond with JSON:
{
  "persona": "chosen persona",
  "welcomeMessage": "personalized welcome message",
  "suggestedQuestions": ["3-4 helpful starter questions"],
  "sessionType": "problem-solving/brainstorming/emotional-support/general-support"
}

Make it personal and immediately helpful.
`;
  }
}

module.exports = {
  orchestrationAgent: new OrchestrationAgent(),
};
