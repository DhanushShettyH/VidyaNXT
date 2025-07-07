// App constants
const COLLECTIONS = {
  TEACHERS: "teachers",
  TEACHER_PROFILES: "teacherProfiles",
  NETWORK_STATS: "networkStats",
};

const EXPERIENCE_LEVELS = {
  NOVICE: "novice",
  EXPERIENCED: "experienced",
  VETERAN: "veteran",
};

const AI_PREFERENCES = {
  SUPPORTIVE: "supportive",
  COLLABORATIVE: "collaborative",
  DETAILED: "detailed",
  CONCISE: "concise",
};

const STATUS = {
  REGISTERED: "registered",
  ACTIVE: "active",
  INACTIVE: "inactive",
};

// functions/src/config/constants.js

const COLLECTIONS_CHAT = {
  TEACHERS: "teachers",
  TEACHER_PROFILES: "teacherProfiles",
  CHALLENGES: "challenges",
  CONVERSATIONS: "conversations",
  AI_CHAT_SESSIONS: "aiChatSessions",
  WELLNESS_REPORTS: "wellness_reports",
  MESSAGES: "messages",
};

const AI_CHAT_CONFIG = {
  MAX_SESSION_DURATION: 60 * 60 * 1000, // 1 hour in milliseconds
  WELLNESS_CHECK_INTERVAL: 3, // Every 3 message exchanges
  MAX_SUGGESTED_QUESTIONS: 4,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
};

const CHAT_TYPES = {
  PEER: "peer",
  AI: "ai",
  GROUP: "group",
};

const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  DOCUMENT: "document",
  SYSTEM: "system",
};

const AI_RESPONSE_TYPES = {
  ADVICE: "advice",
  STRATEGY: "strategy",
  ENCOURAGEMENT: "encouragement",
  QUESTION: "question",
  RESOURCE: "resource",
};

const WELLNESS_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

module.exports = {
  COLLECTIONS,
  EXPERIENCE_LEVELS,
  AI_PREFERENCES,
  STATUS,
  COLLECTIONS_CHAT,
  AI_CHAT_CONFIG,
  CHAT_TYPES,
  MESSAGE_TYPES,
  AI_RESPONSE_TYPES,
  WELLNESS_LEVELS,
};
