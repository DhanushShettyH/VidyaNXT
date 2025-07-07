const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const { parseGeminiResponse } = require("../utils/helpers");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize
const db = admin.firestore();

/**
 * Matching Agent
 * Finds peer matches and AI recommendations using Gemini AI
 */
class MatchingAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }
  /**
   * Find matches for a challenge
   */
  async findMatches({ challengeId, teacherProfile, classification }) {
    try {
      //   logger.info(`Finding matches for challenge: ${challengeId}`);

      let matches = [];
      let aiChatRecommended = false;

      try {
        // Get AI-powered matches
        const aiMatches = await this.getAiMatches(
          teacherProfile,
          classification
        );

        // Filter for peer matches and ensure no self-matching
        const peerMatches = aiMatches.filter(
          (match) =>
            match.type === "peer" && match.peerId !== teacherProfile.teacherId
        );

        // Check if AI chat is recommended
        const aiMatch = aiMatches.find((match) => match.type === "ai");
        aiChatRecommended = !!aiMatch;

        matches = peerMatches;

        // logger.info(
        //   `AI matching found ${peerMatches.length} peer matches, AI recommended: ${aiChatRecommended}`
        // );
      } catch (aiError) {
        console.error(`AI matching failed:`, aiError);
        // logger.warn(`AI matching failed, using fallback:`, aiError);

        // Fallback to manual matching
        matches = await this.findPeerMatchesFallback(
          teacherProfile,
          classification
        );
        aiChatRecommended = true; // Always recommend AI when agent fails
      }

      // If no peer matches found, ensure AI chat is recommended
      if (matches.length === 0) {
        aiChatRecommended = true;
        // logger.info(`No peer matches found, recommending AI chat`);
      }

      return {
        matches,
        aiChatRecommended,
      };
    } catch (error) {
      console.error(`Matching failed for challenge ${challengeId}:`, error);
      //   logger.error(`Matching failed for challenge ${challengeId}:`, error);

      // Return fallback response
      return {
        matches: [],
        aiChatRecommended: true,
      };
    }
  }

  /**
   * Get AI-powered matches using Gemini
   */
  async getAiMatches(teacherProfile, classification) {
    try {
      // Get all teacher profiles for matching
      const profilesSnap = await db.collection("teacherProfiles").get();
      const allProfiles = [];

      profilesSnap.forEach((doc) => {
        const profile = doc.data();
        // Ensure we don't include the current user's profile
        if (profile.teacherId !== teacherProfile.teacherId) {
          allProfiles.push(profile);
        }
      });

      if (allProfiles.length === 0) {
        return [{ type: "ai", score: 1.0, reason: "No peers available" }];
      }

      // Create matching prompt
      const prompt = this.buildMatchingPrompt(
        teacherProfile,
        classification,
        allProfiles
      );

      // Get matches from Gemini
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = parseGeminiResponse(response.text());

      // Additional safety check to filter out current user's ID
      const filteredMatches = (aiResponse.matches || []).filter(
        (match) => match.peerId !== teacherProfile.teacherId
      );

      return filteredMatches.length > 0
        ? filteredMatches
        : [{ type: "ai", score: 1.0, reason: "No valid peer matches found" }];
    } catch (error) {
      console.error("AI matching failed:", error);
      //   logger.error("AI matching failed:", error);
      throw error;
    }
  }

  /**
   * Build matching prompt for Gemini
   */
  buildMatchingPrompt(teacherProfile, classification, allProfiles) {
    return `
You are an expert teacher matching system. Find the best peer matches for a teacher based on their profile and challenge.

IMPORTANT: DO NOT include the current teacher (ID: ${teacherProfile.teacherId}) in your matches. Only match with OTHER teachers.

Current Teacher Profile:
${JSON.stringify(teacherProfile, null, 2)}

Challenge Classification:
${JSON.stringify(classification, null, 2)}

Available Peer Profiles (excluding current teacher):
${JSON.stringify(allProfiles.slice(0, 20), null, 2)}

Find the best matches considering:
1. Grade level overlap
2. Subject expertise
3. Experience level compatibility
4. Geographic location
5. Challenge type relevance

Also determine if AI chat should be recommended based on:
- Challenge complexity
- Challenge type
- Available peer quality

Respond with JSON:
{
  "matches": [
    {
      "type": "peer",
      "peerId": "teacher_id_of_peer_NOT_current_teacher",
      "score": 0.0-1.0,
      "reasons": ["specific matching reasons"]
    }
  ],
  "aiRecommended": true/false,
  "aiReason": "reason for AI recommendation"
}

CRITICAL: Ensure peerId is NEVER ${teacherProfile.teacherId}. Only return OTHER teachers' IDs.
Return top 3 peer matches maximum. Score based on relevance and compatibility.
`;
  }

  /**
   * Fallback matching when AI is unavailable
   */
  async findPeerMatchesFallback(currentProfile, classification) {
    try {
      //   logger.info("Using fallback matching logic");

      const profilesSnap = await db.collection("teacherProfiles").get();
      const matches = [];

      profilesSnap.forEach((doc) => {
        const profile = doc.data();

        // Don't match with self - this is the key fix
        if (profile.teacherId === currentProfile.teacherId) return;

        // Simple matching logic
        let score = 0;

        // Grade overlap
        const currentGrades = currentProfile.matchingCriteria?.grades || [];
        const peerGrades = profile.matchingCriteria?.grades || [];
        const gradeOverlap = currentGrades.filter((g) =>
          peerGrades.includes(g)
        );
        score += gradeOverlap.length * 0.3;

        // Location match
        if (
          currentProfile.matchingCriteria?.location ===
          profile.matchingCriteria?.location
        ) {
          score += 0.2;
        }

        // Experience level compatibility
        const currentExp = currentProfile.matchingCriteria?.experienceLevel;
        const peerExp = profile.matchingCriteria?.experienceLevel;
        if (
          currentExp === peerExp ||
          (currentExp === "novice" && peerExp === "experienced") ||
          (currentExp === "experienced" && peerExp === "veteran")
        ) {
          score += 0.2;
        }

        // Challenge type relevance
        const challengeType = classification.type;
        const peerExpertise = profile.expertise || [];
        if (peerExpertise.includes(challengeType)) {
          score += 0.2;
        }

        // Add some randomness for variety
        score += Math.random() * 0.1;

        // Only include if score is meaningful
        if (score > 0.2) {
          matches.push({
            peerId: profile.teacherId,
            score: Math.min(score, 1.0),
            type: "peer",
            reasons: ["Experience match", "Grade compatibility"],
          });
        }
      });

      // Sort by score and return top 3
      return matches.sort((a, b) => b.score - a.score).slice(0, 3);
    } catch (error) {
      console.error("Fallback matching failed:", error);
      //   logger.error("Fallback matching failed:", error);
      return [];
    }
  }
}

module.exports = {
  matchingAgent: new MatchingAgent(),
};
