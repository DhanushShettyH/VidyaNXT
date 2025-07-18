// functions/src/services/chat.js
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const { db } = require("../config/firebase-config");

/**
 * Find existing conversation between two teachers
 */
async function findConversation(teacherId1, teacherId2) {
  const convosRef = db.collection("conversations");
  const existing = await convosRef
    .where("members", "array-contains", teacherId1)
    .get();

  return existing.docs.find((d) => {
    const members = d.data().members;
    return members.includes(teacherId2) && members.length === 2;
  });
}

/**
 * Create new conversation between two teachers
 */
async function createConversation(teacherId1, teacherId2) {
  const now = new Date().toISOString();
  const convosRef = db.collection("conversations");

  const newConvo = await convosRef.add({
    members: [teacherId1, teacherId2],
    createdAt: now,
    lastUpdated: now,
    unreadCounts: {
      [teacherId1]: 0,
      [teacherId2]: 0,
    },
  });

  return newConvo.id;
}

/**
 * Get conversation messages
 */
async function getConversationMessages(convoId, limit = 50) {
  const messagesRef = db
    .collection("conversations")
    .doc(convoId)
    .collection("messages")
    .orderBy("timestamp", "desc")
    .limit(limit);

  const messages = await messagesRef.get();
  return messages.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Add message to conversation
 */
async function addMessage(convoId, messageData) {
  const messagesRef = db
    .collection("conversations")
    .doc(convoId)
    .collection("messages");

  return await messagesRef.add({
    ...messageData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get AI chat session
 */
async function getAiChatSession(sessionId) {
  const sessionDoc = await db.collection("aiChatSessions").doc(sessionId).get();

  if (!sessionDoc.exists) {
    throw new Error("AI chat session not found");
  }

  return sessionDoc.data();
}

/**
 * Get AI chat session messages
 */
async function getAiChatMessages(sessionId, limit = 50) {
  const messagesRef = db
    .collection("aiChatSessions")
    .doc(sessionId)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .limit(limit);

  const messages = await messagesRef.get();
  return messages.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get teacher's AI chat sessions
 */
async function getTeacherAiSessions(teacherId, limit = 10) {
  const sessionsRef = db
    .collection("aiChatSessions")
    .where("teacherId", "==", teacherId)
    .orderBy("createdAt", "desc")
    .limit(limit);

  const sessions = await sessionsRef.get();
  return sessions.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get teacher's conversations
 */
async function getTeacherConversations(teacherId, limit = 20) {
  const convosRef = db
    .collection("conversations")
    .where("members", "array-contains", teacherId)
    .orderBy("lastUpdated", "desc")
    .limit(limit);

  const conversations = await convosRef.get();
  return conversations.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Update conversation last activity
 */
async function updateConversationActivity(convoId) {
  const convoRef = db.collection("conversations").doc(convoId);
  await convoRef.update({
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Add peers to teacher's network
 */
async function addPeersToNetwork(teacherId, peerIds) {
  const teacherRef = db.collection("teachers").doc(teacherId);
  await teacherRef.update({
    peers: FieldValue.arrayUnion(...peerIds),
  });
}

module.exports = {
  findConversation,
  createConversation,
  getConversationMessages,
  addMessage,
  getAiChatSession,
  getAiChatMessages,
  getTeacherAiSessions,
  getTeacherConversations,
  updateConversationActivity,
  addPeersToNetwork,
};
