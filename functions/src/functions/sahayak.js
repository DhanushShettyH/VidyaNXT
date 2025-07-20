const { onCall } = require("firebase-functions/v2/https");
const SahayakOrchestrator = require("../agents/sahayak-orchestrator");
const { db, admin } = require("../config/firebase-config");

// Configuration for resource-intensive functions
const heavyProcessingConfig = {
  timeoutSeconds: 300, // 5 minutes
  memory: "2GiB", // 2GB memory
  maxInstances: 10,
};

// Lightweight functions config
const lightConfig = {
  timeoutSeconds: 60, // 1 minute
  memory: "512MiB", // 512MB memory
};

const createSahayakContent = onCall(heavyProcessingConfig, async (request) => {
  try {
    const { teacherId, contentRequest, grades } = request.data;

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
    if (error.message.includes("socket hang up")) {
      // Retry logic for network errors
      console.log("Retrying due to socket hang up...");
      // Implement simple retry (up to 2 attempts)
      // (Add your retry mechanism here, e.g., wrap in a retry function)
    }
    throw new Error(`Failed to create content: ${error.message}`);
  }
});

const getSahayakSession = onCall(lightConfig, async (request) => {
  try {
    const { sessionId } = request.data;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

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

const searchContentLibrary = onCall(lightConfig, async (request) => {
  try {
    const { teacherId, subject, grades, language } = request.data;

    // console.log({ teacherId, subject, grades, language });
    let query = db.collection("content_library");

    // Filter by teacherId first
    if (teacherId) {
      query = query.where("teacherId", "==", teacherId);
    }

    if (subject) {
      query = query.where("subject", "==", subject);
    }

    if (language) {
      query = query.where("language", "==", language);
    }

    if (grades && grades.length > 0) {
      query = query.where("grades", "array-contains-any", grades);
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(20).get();
    // console.log(snapshot);
    const content = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure gradeVersions is included
        gradeVersions: data.content?.gradeVersions || {},
      };
    });

    // console.log(content.gradeVersions);

    return {
      success: true,
      data: content,
    };
  } catch (error) {
    console.error("Search content library error:", error);
    throw new Error(`Failed to search content: ${error.message}`);
  }
});

const getContentById = onCall(lightConfig, async (request) => {
  try {
    const { contentId } = request.data;

    if (!contentId) {
      throw new Error("Content ID is required");
    }

    const contentDoc = await db
      .collection("content_library")
      .doc(contentId)
      .get();

    if (!contentDoc.exists) {
      throw new Error("Content not found");
    }

    return {
      success: true,
      data: {
        id: contentDoc.id,
        ...contentDoc.data(),
      },
    };
  } catch (error) {
    console.error("Get content by ID error:", error);
    throw new Error(`Failed to get content: ${error.message}`);
  }
});

module.exports = {
  createSahayakContent,
  getSahayakSession,
  searchContentLibrary,
  getContentById,
};
