const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
// const ProfileAgent = require("../agents/profile-agent");
const { COLLECTIONS } = require("../config/constants");
const { getTeacherProfile_ } = require("../services/teacher");
const { orchestrationAgent } = require("../agents/orchestration-agent");
const { matchingAgent } = require("../agents/matching-agent");
const { classificationAgent } = require("../agents/calssification-agent");
const {
  sendWellnessCriticalAlert,
  updateTeacherWellnessSummary,
} = require("../services/wellness");
const {
  onDocumentCreated: onDocCreated,
} = require("firebase-functions/v2/firestore");
const { FieldValue } = require("firebase-admin/firestore");
const wellnessAgent = require("../agents/wellness-agent");

const { db } = require("../config/firebase-config");
const { VertexAIService } = require("../config/vertex-ai");
const {
  getExperienceLevel,
  getAIPreferences,
  calculateProfileStrength,
} = require("../utils/helpers");

// ! profile agent is triggered.
const profileAgent = onDocumentCreated(
  "teachers/{teacherId}",
  async (event) => {
    const teacherData = event.data.data();
    const teacherId = event.params.teacherId;

    // Define fallback summary early so it can be used anywhere
    const fallbackSummary = `${teacherData.displayName} teaches grades ${teacherData.grades.join(", ")} in ${teacherData.location} with ${teacherData.experienceYears} years of experience.`;

    try {
      console.log(`🤖 Profile Agent: Processing teacher ${teacherId}`);

      // ✅ FORMAT THE MESSAGE HERE - All formatting done before calling agent
      const teacherInfo = `Name: ${teacherData.displayName}, Grades: ${teacherData.grades.join(", ")}, Location: ${teacherData.location}, Experience: ${teacherData.experienceYears} years`;
      const formattedMessage = `Generate a professional summary for this teacher profile: ${teacherInfo}`;

      // ✅ Call agent with only the formatted message
      const summaryResponse =
        await VertexAIService.callDeployedAgent(formattedMessage);
      console.log(summaryResponse);

      let summary;
      try {
        if (summaryResponse?.content?.parts?.[0]?.text) {
          summary = summaryResponse.content.parts[0].text;
        } else if (summaryResponse?.summary) {
          summary = summaryResponse.summary;
        } else {
          summary = summaryResponse.toString().trim();
        }
      } catch (parseError) {
        console.warn("Failed to parse ADK response, using fallback");
        summary = fallbackSummary;
      }

      // Process the complete profile using helper functions
      const experienceLevel = getExperienceLevel(teacherData.experienceYears);
      const aiPreferences = getAIPreferences(
        teacherData.grades,
        teacherData.experienceYears
      );
      const profileStrength = calculateProfileStrength(
        teacherData.experienceYears,
        teacherData.grades
      );

      // Create matching criteria
      const matchingCriteria = {
        grades: teacherData.grades,
        location: teacherData.location,
        experienceLevel: experienceLevel,
        gradeScore: teacherData.grades.length * 10,
        regionKey: teacherData.location.toLowerCase().replace(/\s+/g, "_"),
      };

      // Build the complete profile object
      const profileResult = {
        teacherId: teacherId,
        summary: summary,
        matchingCriteria: matchingCriteria,
        aiPreferences: aiPreferences,
        profileStrength: profileStrength,
        createdAt: new Date().toISOString(),
      };

      await db
        .collection(COLLECTIONS.TEACHER_PROFILES)
        .doc(teacherId)
        .set({
          ...profileResult,
          processedAt: new Date().toISOString(),
        });

      console.log(`✅ Profile Agent: Stored profile for ${teacherId}`);
    } catch (error) {
      console.error(`❌ Profile Agent failed for ${teacherId}:`, error.message);

      // Fallback: create profile with basic summary if ADK agent fails
      const experienceLevel = getExperienceLevel(teacherData.experienceYears);
      const aiPreferences = getAIPreferences(
        teacherData.grades,
        teacherData.experienceYears
      );
      const profileStrength = calculateProfileStrength(
        teacherData.experienceYears,
        teacherData.grades
      );

      const matchingCriteria = {
        grades: teacherData.grades,
        location: teacherData.location,
        experienceLevel: experienceLevel,
        gradeScore: teacherData.grades.length * 10,
        regionKey: teacherData.location.toLowerCase().replace(/\s+/g, "_"),
      };

      await db.collection(COLLECTIONS.TEACHER_PROFILES).doc(teacherId).set({
        teacherId: teacherId,
        summary: fallbackSummary,
        matchingCriteria: matchingCriteria,
        aiPreferences: aiPreferences,
        profileStrength: profileStrength,
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        fallbackUsed: true,
        originalError: error.message,
      });
    }
  }
);

//! Classification trigger
const classificationTrigger = onDocumentCreated(
  "challenges/{challengeId}",
  async (event) => {
    const challengeId = event.params.challengeId;
    const challengeData = event.data.data();

    try {
      console.log(`📝 Classification trigger for ${challengeId}`);

      // Build classification prompt message
      const message = buildClassificationPrompt(challengeData.text);

      // Call deployed ADK agent with formatted message
      const classificationResult = await callDeployedAgent({
        content: message,
      });

      // Extract summary JSON string from your ADK parsing (assumed to be stringified JSON)
      const classificationJson = classificationResult.summary;
      const classificationObj = JSON.parse(classificationJson);

      // Prepare Firestore update fields matching your schema and agent response
      await db
        .collection("challenges")
        .doc(challengeId)
        .update({
          classification: {
            type: classificationObj.primaryType,
            confidence: classificationObj.confidence,
            secondaryTypes: classificationObj.secondaryTypes,
            reasoning: classificationObj.reasoning,
          },
          status: "CLASSIFIED",
          classifiedAt: new Date().toISOString(),
        });

      console.log(`✅ Classification completed for ${challengeId}`);
    } catch (error) {
      console.error(
        `❌ Classification failed for ${challengeId}:`,
        error.message
      );
      await db.collection("challenges").doc(challengeId).update({
        classificationError: error.message,
        status: "CLASSIFICATION_FAILED",
        classifiedAt: new Date().toISOString(),
      });
    }
  }
);
// Example prompt builder function (adjust category list accordingly)
function buildClassificationPrompt(text) {
  const labels = [
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

  return `
You are an expert in educational challenges classification. Analyze the following teacher challenge and classify it.

Available Categories:
${labels.map((label) => `- ${label}`).join("\n")}

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

//! Matching trigger
const matchingTrigger = onDocumentUpdated(
  "challenges/{challengeId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const challengeId = event.params.challengeId;

    // Only trigger when status changes from POSTED to CLASSIFIED
    if (!(before.status === "POSTED" && after.status === "CLASSIFIED")) {
      return;
    }

    const { classification, teacherId } = after;

    try {
      // Get current teacher profile
      const teacherProfile = await getTeacherProfile_(teacherId);

      // Fetch all peer profiles from your DB excluding current teacher
      const allProfilesSnapshot = await db.collection("teachers").get();
      let allProfiles = allProfilesSnapshot.docs
        .map((doc) => doc.data())
        .filter((profile) => profile.teacherId !== teacherId);

      // Build prompt message for matching agent
      const message = buildMatchingPrompt(
        teacherProfile,
        classification,
        allProfiles
      );

      // Call deployed matching agent
      const matchingResultRaw = await callDeployedAgent({ content: message });

      // Extract JSON string from ADK agent response
      const matchingResultJson = matchingResultRaw.summary;
      const matchingResult = JSON.parse(matchingResultJson);

      // Normalize returned field 'aiRecommended' to 'aiChatRecommended' for your DB
      const aiChatRecommended = matchingResult.aiRecommended ?? false;

      // Persist matches, AI recommendation, and updated status
      await db
        .collection("challenges")
        .doc(challengeId)
        .update({
          matches: matchingResult.matches || [],
          aiChatRecommended,
          status: "MATCHED",
          matchedAt: new Date().toISOString(),
        });

      console.log(`✅ Matching completed for ${challengeId}`, matchingResult);
    } catch (error) {
      console.error(`❌ Matching failed for ${challengeId}:`, error);
      await db.collection("challenges").doc(challengeId).update({
        matches: [],
        aiChatRecommended: true,
        matchingError: error.message,
        status: "MATCHED",
        matchedAt: new Date().toISOString(),
      });
    }
  }
);
function buildMatchingPrompt(teacherProfile, classification, allProfiles) {
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

//! Orchestration trigger
const orchestrationTrigger = onDocumentUpdated(
  "challenges/{challengeId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const challengeId = event.params.challengeId;
    if (before.status !== "CLASSIFIED" || after.status !== "MATCHED") {
      return;
    }
    const { matches, teacherId, text, classification } = after;
    try {
      const teacherProfile = await getTeacherProfile_(teacherId);
      const orchestrationResult = await orchestrationAgent.orchestrate({
        challengeId,
        teacherId,
        matches: matches || [],
        text,
        classification,
        teacherProfile,
      });
      const updateData = {
        ...orchestrationResult,
        status: "ORCHESTRATED",
        orchestratedAt: new Date().toISOString(),
      };
      if (orchestrationResult.recommendAiChat) {
        try {
          const aiSessionResult = await orchestrationAgent.createAiSession({
            teacherId,
            challengeId,
            challengeText: text,
            teacherProfile,
          });
          updateData.aiSessionId = aiSessionResult.sessionId;
          updateData.aiSessionCreated = true;
          await db
            .collection("aiChatSessions")
            .doc(aiSessionResult.sessionId)
            .set({
              sessionId: aiSessionResult.sessionId,
              challengeId,
              teacherId,
              challengeText: text,
              persona: aiSessionResult.persona,
              welcomeMessage: aiSessionResult.welcomeMessage,
              suggestedQuestions: aiSessionResult.suggestedQuestions,
              createdAt: new Date().toISOString(),
              status: "active",
              messageCount: 0,
              lastMessageAt: new Date().toISOString(),
              createdBy: "orchestration-agent",
            });
        } catch (aiError) {
          console.error(
            `❌ AI session creation failed for ${challengeId}:`,
            aiError
          );
          updateData.aiSessionError = aiError.message;
        }
      }
      await db.collection("challenges").doc(challengeId).update(updateData);
    } catch (error) {
      console.error(`❌ Orchestration failed for ${challengeId}:`, error);
      await db.collection("challenges").doc(challengeId).update({
        orchestrationError: error.message,
        status: "ORCHESTRATION_FAILED",
        orchestratedAt: new Date().toISOString(),
      });
    }
  }
);

//! Wellness analysis trigger
const wellnessAnalysisAgent = onDocumentCreated(
  "teachers/{teacherId}/wellness_reports/{reportId}",
  async (event) => {
    try {
      const wellnessData = event.data.data();
      const teacherId = event.params.teacherId;
      const reportId = event.params.reportId;

      console.log("Processing wellness analysis for teacher:", teacherId);

      let analysis;

      // Analyze based on type
      if (wellnessData.analysis_type === "challenge") {
        analysis = await wellnessAgent.analyzeChallengeWellness(
          teacherId,
          wellnessData.content
        );
      } else if (wellnessData.analysis_type === "chat") {
        analysis = await wellnessAgent.analyzeChatWellness(
          teacherId,
          wellnessData.content,
          wellnessData.session_data || {}
        );
      }

      // Update wellness report with analysis
      await event.data.ref.update({
        ...analysis,
        processed_at: FieldValue.serverTimestamp(),
        status: "analyzed",
      });

      // Send critical alert if needed
      if (analysis.critical_alert) {
        await sendWellnessCriticalAlert(teacherId, analysis);
      }

      // Update teacher's wellness summary
      await updateTeacherWellnessSummary(teacherId, analysis);

      console.log("Wellness analysis completed for teacher:", teacherId);
      return { success: true };
    } catch (error) {
      console.error("Wellness analysis failed:", error);

      // Update report with error status
      await event.data.ref.update({
        status: "error",
        error_message: error.message,
        processed_at: FieldValue.serverTimestamp(),
      });

      return { error: error.message };
    }
  }
);

const incrementUnread = onDocCreated(
  "conversations/{convoId}/messages/{msgId}",
  async (event) => {
    const convoDoc = await db
      .collection("conversations")
      .doc(event.params.convoId)
      .get();

    const { members } = convoDoc.data();
    const sender = event.data.data().sender;
    const recipient = members.find((u) => u !== sender);

    const convoRef = db.collection("conversations").doc(event.params.convoId);
    await convoRef.update({
      [`unreadCounts.${recipient}`]: FieldValue.increment(1),
      lastUpdated: new Date().toISOString(),
    });
  }
);
// Export all triggers
module.exports = {
  profileAgent,
  classificationTrigger,
  matchingTrigger,
  orchestrationTrigger,
  wellnessAnalysisAgent,
  incrementUnread,
};
