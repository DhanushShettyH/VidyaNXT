const { onCall } = require("firebase-functions/v2/https");
const sahayakOrchestrator = require("../agents/sahayak-orchestrator");

exports.generateSahayakContent = onCall(async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  try {
    const requestData = {
      ...data,
      teacherId: auth.uid,
      timestamp: new Date().toISOString(),
    };

    const result =
      await sahayakOrchestrator.processTeachingRequest(requestData);

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error("Sahayak content generation failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Content generation failed"
    );
  }
});
