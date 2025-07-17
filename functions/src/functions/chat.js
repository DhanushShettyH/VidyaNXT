// functions/src/functions/chat.js
const { onCall, onDocumentCreated } = require("firebase-functions/v2/https");

const { HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { generateText } = require("../config/gemini");
const { delay, parseGeminiResponse } = require("../utils/helpers");
const { createWellnessReport } = require("../services/wellness");
const { incrementUnread } = require("./triggers");

const db = admin.firestore();

// ======================== PEER CHAT FUNCTIONS ===========================

const startChatWith = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in required");
  }

  const { peerId, teacherId } = request.data;

  // Find or create the 1:1 conversation
  const convosRef = db.collection("conversations");
  const existing = await convosRef
    .where("members", "array-contains", teacherId)
    .get();

  let convoId = existing.docs.find((d) => {
    const m = d.data().members;
    return m.includes(peerId) && m.length === 2;
  })?.id;

  if (!convoId) {
    const now = new Date().toISOString();
    const newConvo = await convosRef.add({
      members: [teacherId, peerId],
      createdAt: now,
      lastUpdated: now,
      unreadCounts: {},
    });
    convoId = newConvo.id;
  }

  // Add peerId to your peers
  await db
    .collection("teachers")
    .doc(teacherId)
    .update({
      peers: FieldValue.arrayUnion(peerId),
    });

  // Reciprocal: add teacherId to their peers
  await db
    .collection("teachers")
    .doc(peerId)
    .update({
      peers: FieldValue.arrayUnion(teacherId),
    });

  return { convoId };
});

const markAsRead = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in required");
  }

  const { convoId, teacherId } = request.data;

  const convoRef = db.collection("conversations").doc(convoId);
  const convoSnap = await convoRef.get();

  if (!convoSnap.exists) {
    throw new HttpsError("not-found", "Conversation not found");
  }

  // Reset unread count
  await convoRef.update({ [`unreadCounts.${teacherId}`]: 0 });
  return { success: true };
});

// ======================== AI CHAT FUNCTIONS ===========================

const createAiChatSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in required");
  }

  const { challengeId, challengeText, teacherId } = request.data;

  // Get teacher profile for context
  const profileSnap = await db
    .collection("teacherProfiles")
    .doc(teacherId)
    .get();
  const teacherProfile = profileSnap.data() || {};

  console.log(`🤖 Creating AI chat session for challenge ${challengeId}`);

  let sessionResult;
  try {
    // Create AI persona using Gemini
    const personaPrompt = `
      Create an AI teaching assistant persona based on:
      Teacher Profile: ${JSON.stringify(teacherProfile)}
      Challenge: ${challengeText}
      
      Return a JSON object with:
      - persona: brief description
      - welcomeMessage: personalized greeting
      - suggestedQuestions: array of 3-4 relevant questions
    `;

    const aiResponse = await generateText(personaPrompt);
    sessionResult = parseGeminiResponse(aiResponse);
  } catch (error) {
    console.error("❌ AI persona creation failed:", error);
    // Fallback session
    sessionResult = {
      persona: "AI Teaching Assistant",
      welcomeMessage:
        "Hello! I'm your AI teaching assistant. How can I help you with your teaching challenge?",
      suggestedQuestions: [
        "How can I improve student engagement?",
        "What are effective classroom management strategies?",
        "How can I differentiate instruction?",
        "What are creative assessment techniques?",
      ],
    };
  }

  const sessionId = `ai-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const sessionData = {
    sessionId,
    challengeId,
    teacherId,
    challengeText: challengeText.trim(),
    persona: sessionResult.persona,
    welcomeMessage: sessionResult.welcomeMessage,
    suggestedQuestions: sessionResult.suggestedQuestions,
    createdAt: new Date().toISOString(),
    status: "active",
    messageCount: 0,
    lastMessageAt: new Date().toISOString(),
  };

  // Store session in Firestore
  await db.collection("aiChatSessions").doc(sessionId).set(sessionData);

  return {
    success: true,
    session: {
      sessionId,
      persona: sessionResult.persona,
      welcomeMessage: sessionResult.welcomeMessage,
      suggestedQuestions: sessionResult.suggestedQuestions,
    },
  };
});

const sendAiChatMessage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in required");
  }

  const { sessionId, message, endSession = false } = request.data;

  // Verify session exists and is active
  const sessionDoc = await db.collection("aiChatSessions").doc(sessionId).get();
  if (!sessionDoc.exists) {
    throw new HttpsError("not-found", "AI chat session not found");
  }

  const sessionData = sessionDoc.data();
  if (sessionData.status !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "AI chat session is not active"
    );
  }

  console.log(`💬 AI Chat: Processing message for session ${sessionId}`);

  // Generate AI response using Gemini
  let responseText = "";
  let suggestedFollowUps = [];

  try {
    const contextPrompt = `
      You are: ${sessionData.persona}
      Challenge Context: ${sessionData.challengeText}
      User Message: ${message}
      
      Provide a helpful, personalized response as a teaching assistant.
      Keep it conversational and practical.
      
      Return JSON with:
      - response: your helpful response
      - suggestedFollowUps: array of 2-3 follow-up questions
    `;

    const aiResponse = await generateText(contextPrompt);
    const parsed = parseGeminiResponse(aiResponse);
    responseText = parsed.response;
    suggestedFollowUps = parsed.suggestedFollowUps || [];
  } catch (error) {
    console.error("❌ AI response generation failed:", error);
    responseText =
      "I apologize, but I'm having trouble processing your question right now. Could you please rephrase it or try asking something different?";
  }

  // Get current message count for wellness analysis trigger
  const currentMessageCount = sessionData.messageCount || 0;
  const newMessageCount = currentMessageCount + 1;

  // Update session
  const sessionUpdate = {
    messageCount: FieldValue.increment(1),
    lastMessageAt: new Date().toISOString(),
    lastUserMessage: message.trim(),
    lastAiResponse: responseText,
    status: endSession ? "ended" : "active",
  };

  if (suggestedFollowUps.length > 0) {
    sessionUpdate.suggestedFollowUps = suggestedFollowUps;
  }

  await db.collection("aiChatSessions").doc(sessionId).update(sessionUpdate);

  // Store messages
  await db
    .collection("aiChatSessions")
    .doc(sessionId)
    .collection("messages")
    .add({
      type: "user",
      message: message.trim(),
      timestamp: new Date().toISOString(),
    });

  await db
    .collection("aiChatSessions")
    .doc(sessionId)
    .collection("messages")
    .add({
      type: "ai",
      message: responseText,
      timestamp: new Date().toISOString(),
      suggestedFollowUps:
        suggestedFollowUps.length > 0 ? suggestedFollowUps : undefined,
    });

  // Trigger wellness analysis every 3 message exchanges or when session ends
  if (newMessageCount % 3 === 0 || endSession) {
    // Get all messages for analysis
    const allMessages = await db
      .collection("aiChatSessions")
      .doc(sessionId)
      .collection("messages")
      .orderBy("timestamp", "asc")
      .get();

    const messagesData = allMessages.docs.map((doc) => doc.data());
    const teacherMessageCount = messagesData.filter(
      (msg) => msg.type === "user"
    ).length;

    // Create wellness report
    await createWellnessReport(sessionData.teacherId, "chat", messagesData, {
      session_id: sessionId,
      message_count: messagesData.length,
      teacher_message_count: teacherMessageCount,
      duration: Date.now() - new Date(sessionData.createdAt).getTime(),
      ended: endSession,
    });
  }

  return {
    success: true,
    response: responseText,
    suggestedFollowUps: suggestedFollowUps,
  };
});
const endAiChatSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in required");
  }

  const { sessionId } = request.data;

  // Verify session exists
  const sessionDoc = await db.collection("aiChatSessions").doc(sessionId).get();
  if (!sessionDoc.exists) {
    throw new HttpsError("not-found", "AI chat session not found");
  }

  console.log(`📊 Analyzing AI chat session ${sessionId}`);

  // Simple session analysis using Gemini
  let analysis = null;
  try {
    const sessionData = sessionDoc.data();
    const messages = await db
      .collection("aiChatSessions")
      .doc(sessionId)
      .collection("messages")
      .orderBy("timestamp", "asc")
      .get();

    const messagesData = messages.docs.map((doc) => doc.data());

    const analysisPrompt = `
      Analyze this AI chat session:
      Challenge: ${sessionData.challengeText}
      Messages: ${JSON.stringify(messagesData)}
      
      Provide JSON analysis with:
      - summary: brief session summary
      - keyInsights: array of main insights
      - recommendations: array of next steps
      - satisfaction: estimated satisfaction (1-10)
    `;

    const aiAnalysis = await generateText(analysisPrompt);
    analysis = parseGeminiResponse(aiAnalysis);
  } catch (error) {
    console.error("❌ Session analysis failed:", error);
  }

  // Update session status
  const updateData = {
    status: "completed",
    endedAt: new Date().toISOString(),
  };

  if (analysis) {
    updateData.analysis = analysis;
  }

  await db.collection("aiChatSessions").doc(sessionId).update(updateData);

  return {
    success: true,
    analysis: analysis,
  };
});




module.exports = {
  startChatWith,
  markAsRead,
  createAiChatSession,
  sendAiChatMessage,
  endAiChatSession,

};
