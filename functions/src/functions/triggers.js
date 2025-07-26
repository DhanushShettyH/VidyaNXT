const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const ProfileAgent = require("../agents/profile-agent");
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

// const COLLECTIONS = {
//   TEACHER_PROFILES: "teacher_profiles",
// };

const profileAgent = onDocumentCreated(
  "teachers/{teacherId}",
  async (event) => {
    const teacherData = event.data.data();
    const teacherId = event.params.teacherId;

    const payload = {
      id: teacherId,
      name: teacherData.displayName,
      grades: teacherData.grades,
      location: teacherData.location,
      experience: teacherData.experienceYears,
      expertise: teacherData.expertise,
    };

    try {
      console.log(`🤖 Profile Agent: Processing teacher ${teacherId}`);

      // Call the deployed ADK agent instead of local ProfileAgent
      const profileResult = await VertexAIService.callDeployedAgent(payload);

      await db
        .collection(COLLECTIONS.TEACHER_PROFILES)
        .doc(teacherId)
        .set({
          ...profileResult,
          processedAt: new Date().toISOString(),
        });

      console.log(`✅ Profile Agent: Stored profile for ${teacherId}`);
      await updateNetworkStats(teacherData);
    } catch (error) {
      console.error(`❌ Profile Agent failed for ${teacherId}:`, error.message);
      await db.collection(COLLECTIONS.TEACHER_PROFILES).doc(teacherId).set({
        error: error.message,
        processingFailed: true,
        processedAt: new Date().toISOString(),
      });
    }
  }
);

async function updateNetworkStats(teacherData) {
  try {
    const statsRef = db.collection(COLLECTIONS.NETWORK_STATS).doc("global");
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(statsRef);
      let stats = {
        totalTeachers: 0,
        gradeCoverage: {},
        locationCoverage: {},
      };
      if (doc.exists) {
        stats = doc.data();
      }
      stats.totalTeachers += 1;
      for (const grade of teacherData.grades) {
        stats.gradeCoverage[grade] = (stats.gradeCoverage[grade] || 0) + 1;
      }
      const location = teacherData.location;
      stats.locationCoverage[location] =
        (stats.locationCoverage[location] || 0) + 1;
      stats.lastUpdated = new Date().toISOString();
      transaction.set(statsRef, stats);
    });
    console.log("✅ Network stats updated");
  } catch (error) {
    console.error("❌ Failed to update network stats:", error);
  }
}

// Classification trigger
const classificationTrigger = onDocumentCreated(
  "challenges/{challengeId}",
  async (event) => {
    const challengeId = event.params.challengeId;
    const challengeData = event.data.data();
    try {
      console.log(`📝 Classification trigger for ${challengeId}`);
      const classificationResult = await classificationAgent.classify({
        id: challengeId,
        text: challengeData.text,
        teacherId: challengeData.teacherId,
      });
      await db.collection("challenges").doc(challengeId).update({
        classification: classificationResult,
        status: "CLASSIFIED",
        classifiedAt: new Date().toISOString(),
      });
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

// Matching trigger
const matchingTrigger = onDocumentUpdated(
  "challenges/{challengeId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const challengeId = event.params.challengeId;
    if (before.status !== "POSTED" || after.status !== "CLASSIFIED") {
      return;
    }
    const { classification, teacherId } = after;
    try {
      const teacherProfile = await getTeacherProfile_(teacherId);
      const matchingResult = await matchingAgent.findMatches({
        challengeId,
        teacherProfile,
        classification,
      });
      console.log(`🤝 Matching trigger for ${challengeId}`, matchingResult);

      await db.collection("challenges").doc(challengeId).update({
        matches: matchingResult.matches,
        aiChatRecommended: matchingResult.aiChatRecommended,
        status: "MATCHED",
        matchedAt: new Date().toISOString(),
      });
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

// Orchestration trigger
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

// Wellness analysis trigger
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
