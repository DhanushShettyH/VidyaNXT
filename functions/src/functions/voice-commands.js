const { onCall } = require("firebase-functions/v2/https");
const { db, admin } = require("../config/firebase-config");
const SahayakOrchestrator = require("../agents/sahayak-orchestrator");

// Your config objects (make sure these are defined somewhere accessible):
const heavyProcessingConfig = {
  timeoutSeconds: 300,
  memory: "2GiB",
  maxInstances: 10,
};
const lightConfig = {
  timeoutSeconds: 60,
  memory: "512MiB",
};

// Function to transcribe audio via Vertex AI Chirp model
const { VertexAIService } = require("../services/vertex-ai");

const processVoiceCommand = onCall(lightConfig, async (request) => {
  try {
    const { audioBase64, language = "hi-IN" } = request.data;
    if (!audioBase64) throw new Error("Audio data is required");

    const result = await VertexAIService.transcribeAudioWithChirp(audioBase64, {
      languageCode: language,
      encoding: "WEBM_OPUS",
    });

    return {
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("Voice processing error:", error);
    throw new Error(`Failed to process voice: ${error.message}`);
  }
});

// Simple intent analysis function for voice command text
const analyzeVoiceIntent = onCall(lightConfig, async (request) => {
  try {
    const { command, userId } = request.data;
    if (!command) throw new Error("Command text is required");

    const lowerCommand = command.toLowerCase();
    const intent = { action: null, parameters: {}, missingFields: [] };

    if (lowerCommand.includes("create") || lowerCommand.includes("generate")) {
      intent.action = "create_content";

      // Extract topic if present
      const topicMatch = command.match(
        /(?:create|generate)(?:\s+(?:content|story|material))?\s+(?:about|on|for)?\s*(.+)/i
      );
      if (topicMatch && topicMatch[1]) {
        intent.parameters.contentRequest = topicMatch[1].trim();
      } else {
        intent.missingFields.push("contentRequest");
      }

      // Extract grades if present
      const gradeMatches = command.match(/grade\s*(\d+)/gi);
      if (gradeMatches) {
        intent.parameters.grades = gradeMatches.map(
          (match) => match.match(/\d+/)[0]
        );
      } else {
        intent.missingFields.push("grades");
      }
    }

    return {
      success: true,
      intent,
      missingFields: intent.missingFields,
    };
  } catch (error) {
    console.error("Intent analysis error:", error);
    throw new Error(`Failed to analyze intent: ${error.message}`);
  }
});

// Execute content creation based on intent and parameters
const executeVoiceCommand = onCall(heavyProcessingConfig, async (request) => {
  try {
    const { intent, userId, additionalInfo } = request.data;
    if (intent.action !== "create_content") {
      throw new Error("Unknown intent action");
    }

    const sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const parameters = { ...intent.parameters, ...additionalInfo };

    const orchestrator = new SahayakOrchestrator();

    // Background asynchronous processing
    orchestrator
      .processRequest(
        userId,
        parameters.contentRequest,
        parameters.grades || ["1", "2", "3", "4", "5"]
      )
      .then((result) => {
        return db.collection("voice_sessions").doc(sessionId).set({
          status: "completed",
          result,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          navigateTo: "/content-hub",
        });
      })
      .catch((error) => {
        return db.collection("voice_sessions").doc(sessionId).set({
          status: "error",
          error: error.message,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

    await db.collection("voice_sessions").doc(sessionId).set({
      status: "processing",
      userId,
      parameters,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      sessionId,
      status: "processing",
    };
  } catch (error) {
    console.error("Command execution error:", error);
    throw new Error(`Failed to execute command: ${error.message}`);
  }
});

// Poll the status of the content generation session
const pollContentGeneration = onCall(lightConfig, async (request) => {
  try {
    const { sessionId } = request.data;
    if (!sessionId) throw new Error("Session ID is required");

    const sessionDoc = await db
      .collection("voice_sessions")
      .doc(sessionId)
      .get();
    if (!sessionDoc.exists) throw new Error("Session not found");

    const sessionData = sessionDoc.data();

    return {
      success: true,
      status: sessionData.status,
      result: sessionData.result,
      navigateTo: sessionData.navigateTo,
      error: sessionData.error,
    };
  } catch (error) {
    console.error("Polling error:", error);
    throw new Error(`Failed to poll session: ${error.message}`);
  }
});

module.exports = {
  processVoiceCommand,
  analyzeVoiceIntent,
  executeVoiceCommand,
  pollContentGeneration,
};
