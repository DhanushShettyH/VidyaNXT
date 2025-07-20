const { GoogleGenerativeAI } = require("@google/generative-ai");
const { parseGeminiResponse } = require("../utils/helpers");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Gemini

/**
 * Classification Agent
 * Classifies challenges and determines urgency using Gemini AI
 */

class ClassificationAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    this.labels = [
      "classroom management",
      "content delivery",
      "parent communication",
      "student engagement",
      "assessment and grading",
      "technology integration",
      "special needs support",
      "behavior management",
      "curriculum planning",
      "time management",
      "professional development",
      "work-life balance",
    ];
  }

  /**
   * Classify a challenge text
   */
  async classify({ id, text, teacherId }) {
    try {
      //   logger.info(`Classifying challenge: ${id}`);

      // Create classification prompt
      const prompt = this.buildClassificationPrompt(text);

      // Get classification from Gemini
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const classification = parseGeminiResponse(response.text());

      // Calculate urgency score
      const urgencyScore = this.calculateUrgencyScore(text);

      // Build final classification result
      const classificationResult = {
        type: classification.primaryType,
        confidence: classification.confidence,
        urgency: urgencyScore.level,
        urgencyScore: urgencyScore.score,
        secondaryTypes: classification.secondaryTypes || [],
        aiChatRecommended: this.shouldRecommendAiChat(
          text,
          classification.primaryType
        ),
        estimatedResolutionTime: this.estimateResolutionTime(
          classification.primaryType,
          urgencyScore.level
        ),
        classifiedAt: new Date().toISOString(),
      };

      //---------------------------------------------
      // * here wellness analysis need to be triggered
      //! Trigger wellness analysis
      //---------------------------------------------
      // Trigger wellness analysis if teacherId is provided
      //   if (teacherId) {
      //     try {
      //       const wellnessAnalysis = await wellnessAgent.analyzeChallengeWellness(
      //         teacherId,
      //         text
      //       );
      //       classificationResult.wellness_analysis = wellnessAnalysis;
      //     } catch (wellnessError) {
      //       logger.warn(
      //         `Wellness analysis failed for challenge ${id}:`,
      //         wellnessError
      //       );
      //       // Don't fail the main classification
      //     }
      //   }

      //   logger.info(`Classification completed for challenge: ${id}`, {
      //     type: classificationResult.type,
      //     confidence: classificationResult.confidence,
      //     urgency: classificationResult.urgency,
      //   });

      return classificationResult;
    } catch (error) {
      //   logger.error(`Classification failed for challenge ${id}:`, error);
      console.error(`Classification failed for challenge ${id}:`, error);
      throw error;
    }
  }

  /**
   * Build classification prompt for Gemini
   */
  buildClassificationPrompt(text) {
    return `
You are an expert in educational challenges classification. Analyze the following teacher challenge and classify it.

Available Categories:
${this.labels.map((label) => `- ${label}`).join("\n")}

Challenge Text: "${text}"

Respond with a JSON object containing:
{
  "primaryType": "most relevant category from the list",
  "confidence": confidence_score_0_to_1,
  "secondaryTypes": ["up to 2 other relevant categories"],
  "reasoning": "brief explanation of classification"
}

Focus on the main educational challenge being described. Be precise and use only the categories provided.
`;
  }

  /**
   * Calculate urgency score based on text content
   */
  calculateUrgencyScore(text) {
    const urgentKeywords = [
      "urgent",
      "emergency",
      "crisis",
      "immediate",
      "asap",
      "help",
      "struggling",
      "failing",
      "serious",
      "critical",
      "desperate",
    ];

    const moderateKeywords = [
      "problem",
      "issue",
      "difficult",
      "challenge",
      "concern",
      "need advice",
      "not sure",
      "confused",
      "worried",
    ];

    const textLower = text.toLowerCase();
    let urgentCount = 0;
    let moderateCount = 0;

    urgentKeywords.forEach((keyword) => {
      if (textLower.includes(keyword)) urgentCount++;
    });

    moderateKeywords.forEach((keyword) => {
      if (textLower.includes(keyword)) moderateCount++;
    });

    // Calculate score
    const urgentScore = urgentCount * 0.3;
    const moderateScore = moderateCount * 0.1;
    const totalScore = urgentScore + moderateScore;

    // Determine level
    let level = "low";
    if (totalScore >= 0.5) level = "high";
    else if (totalScore >= 0.2) level = "medium";

    return {
      score: Math.min(totalScore, 1.0),
      level,
    };
  }

  /**
   * Determine if AI chat should be recommended
   */
  shouldRecommendAiChat(text, primaryType) {
    const aiPreferredTypes = [
      "work-life balance",
      "professional development",
      "time management",
      "curriculum planning",
    ];

    const complexityKeywords = [
      "complex",
      "complicated",
      "multiple",
      "various",
      "many",
      "different",
      "several",
      "numerous",
    ];

    const hasComplexity = complexityKeywords.some((keyword) =>
      text.toLowerCase().includes(keyword)
    );

    return aiPreferredTypes.includes(primaryType) || hasComplexity;
  }

  /**
   * Estimate resolution time based on type and urgency
   */
  estimateResolutionTime(type, urgency) {
    const timeMap = {
      "behavior management": {
        high: "1-2 hours",
        medium: "2-4 hours",
        low: "4-8 hours",
      },
      "classroom management": {
        high: "1-2 hours",
        medium: "2-4 hours",
        low: "4-8 hours",
      },
      "student engagement": {
        high: "2-4 hours",
        medium: "4-8 hours",
        low: "8-24 hours",
      },
      "parent communication": {
        high: "30 minutes",
        medium: "1-2 hours",
        low: "2-4 hours",
      },
      "content delivery": {
        high: "1-2 hours",
        medium: "4-8 hours",
        low: "1-2 days",
      },
      "assessment and grading": {
        high: "2-4 hours",
        medium: "4-8 hours",
        low: "1-2 days",
      },
      "technology integration": {
        high: "1-2 hours",
        medium: "2-4 hours",
        low: "4-8 hours",
      },
      "special needs support": {
        high: "1-2 hours",
        medium: "4-8 hours",
        low: "1-2 days",
      },
      "curriculum planning": {
        high: "4-8 hours",
        medium: "1-2 days",
        low: "2-3 days",
      },
      "time management": {
        high: "2-4 hours",
        medium: "4-8 hours",
        low: "1-2 days",
      },
      "professional development": {
        high: "1-2 days",
        medium: "2-3 days",
        low: "1 week",
      },
      "work-life balance": {
        high: "4-8 hours",
        medium: "1-2 days",
        low: "2-3 days",
      },
    };

    return timeMap[type]?.[urgency] || "2-4 hours";
  }
}

module.exports = {
  classificationAgent: new ClassificationAgent(),
};
