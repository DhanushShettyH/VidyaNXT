const { onCall } = require("firebase-functions/v2/https");
const SahayakOrchestrator = require("../agents/sahayak-orchestrator");

const createSahayakContent = onCall(async (request) => {
  try {
    const { teacherId, contentRequest, grades } = request.data;

    // console.log({ teacherId, contentRequest, grades });
    if (!teacherId || !contentRequest || !grades || !Array.isArray(grades)) {
      throw new Error("Missing required parameters");
    }

    const orchestrator = new SahayakOrchestrator();
    const result = await orchestrator.processRequest(
      teacherId,
      contentRequest,
      grades
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Create Sahayak content error:", error);
    throw new Error(`Failed to create content: ${error.message}`);
  }
});

const getSahayakSession = onCall(async (request) => {
  try {
    const { sessionId } = request.data;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const admin = require("firebase-admin");
    const { db } = require("../config/firebase-config");

    const sessionDoc = await db
      .collection("sahayak_sessions")
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      throw new Error("Session not found");
    }

    return {
      success: true,
      data: sessionDoc.data(),
    };
  } catch (error) {
    console.error("Get Sahayak session error:", error);
    throw new Error(`Failed to get session: ${error.message}`);
  }
});

const searchContentLibrary = onCall(async (request) => {
  try {
    const { teacherId, subject, grades, language } = request.data;

    const admin = require("firebase-admin");
    const { db } = require("../config/firebase-config");

    let query = db.collection("content_library");

    if (subject) {
      query = query.where("subject", "==", subject);
    }

    if (language) {
      query = query.where("language", "==", language);
    }

    if (grades && grades.length > 0) {
      query = query.where("grades", "array-contains-any", grades);
    }

    const snapshot = await query.limit(20).get();

    const content = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      data: content,
    };
  } catch (error) {
    console.error("Search content library error:", error);
    throw new Error(`Failed to search content: ${error.message}`);
  }
});

module.exports = {
  createSahayakContent,
  getSahayakSession,
  searchContentLibrary,
};
