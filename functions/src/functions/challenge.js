const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");

const admin = require("firebase-admin");
const { createWellnessReport } = require("../services/wellness");

// Initialize
const { db } = require("../config/firebase-config");
/**
 * Post a new challenge
 * Callable function that creates a challenge and triggers wellness analysis
 */
exports.postChallenge = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    const { text, urgency = "medium", teacherId } = request.data;

    // Verify teacher ownership
    const teacherDoc = await db.collection("teachers").doc(teacherId).get();
    if (!teacherDoc.exists) {
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to post as this teacher"
      );
    }

    // Create challenge document
    const challenge = {
      ownerUid: request.auth.uid,
      teacherId,
      text: text.trim(),
      urgency,
      createdAt: new Date().toISOString(),
      status: "POSTED",
      responses: [],
    };

    const challengeRef = await db.collection("challenges").add(challenge);

    // Trigger wellness analysis
    await createWellnessReport(teacherId, "challenge", text.trim());

    console.log(
      `Wellness analysis triggered for challenge: ${challengeRef.id}`
    );

    return {
      success: true,
      challengeId: challengeRef.id,
      message: "Challenge posted successfully",
    };
  } catch (error) {
    console.error("Error posting challenge:", error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      `Failed to post challenge: ${error.message}`
    );
  }
});

/**
 * Get challenges for a teacher
 */
exports.getChallenges = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    const { teacherId, limit = 20, status } = request.data;

    if (!teacherId) {
      throw new HttpsError("invalid-argument", "teacherId is required");
    }

    let query = db
      .collection("challenges")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const challenges = [];

    snapshot.forEach((doc) => {
      challenges.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      challenges,
      count: challenges.length,
    };
  } catch (error) {
    console.error("Error getting challenges:", error);
    // logger.error("Error getting challenges:", error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      `Failed to get challenges: ${error.message}`
    );
  }
});

/**
 * Update challenge status
 */
exports.updateChallengeStatus = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    const { challengeId, status, additionalData = {} } = request.data;

    if (!challengeId || !status) {
      throw new HttpsError(
        "invalid-argument",
        "challengeId and status are required"
      );
    }

    const challengeRef = db.collection("challenges").doc(challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      throw new HttpsError("not-found", "Challenge not found");
    }

    const challengeData = challengeDoc.data();

    // Verify ownership
    if (challengeData.ownerUid !== request.auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "You can only update your own challenges"
      );
    }

    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
      ...additionalData,
    };

    await challengeRef.update(updateData);

    // logger.info(`Challenge status updated: ${challengeId} -> ${status}`);

    return {
      success: true,
      message: "Challenge status updated successfully",
    };
  } catch (error) {
    console.error("Error updating challenge status:", error);
    // logger.error("Error updating challenge status:", error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      `Failed to update challenge status: ${error.message}`
    );
  }
});
