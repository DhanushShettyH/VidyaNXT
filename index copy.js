const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

// Initialize admin SDK
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Agent base URL - use environment variable in production
const AGENT_BASE_URL = "https://c64b-34-125-235-37.ngrok-free.app";

// Helper function to make agent calls with error handling
async function callAgent(endpoint, payload, retries = 2) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `${AGENT_BASE_URL}${endpoint}`;
      console.log(`🔗 Calling agent URL:`, url);
      const response = await fetch(`${AGENT_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Agent call failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `❌ Agent call attempt ${attempt + 1} failed:`,
        error.message
      );
      if (attempt === retries - 1) throw error;

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

// === TEACHER REGISTRATION ===
exports.registerTeacher = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { displayName, grades, location, experienceYears } = request.data;

    // Enhanced validation
    if (!displayName?.trim()) {
      throw new HttpsError("invalid-argument", "Display name is required");
    }
    if (!Array.isArray(grades) || grades.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "At least one grade is required"
      );
    }
    if (!location?.trim()) {
      throw new HttpsError("invalid-argument", "Location is required");
    }
    if (typeof experienceYears !== "number" || experienceYears < 0) {
      throw new HttpsError(
        "invalid-argument",
        "Valid experience years required"
      );
    }

    const docData = {
      displayName: displayName.trim(),
      grades: grades.filter((g) => g && g.trim()), // Clean grades array
      location: location.trim(),
      experienceYears,
      ownerUid: request.auth.uid,
      createdAt: new Date().toISOString(),
      status: "registered",
      lastActiveAt: new Date().toISOString(),
    };

    const teacherRef = await db.collection("teachers").add(docData);

    return {
      success: true,
      teacherId: teacherRef.id,
      message: "Teacher registered successfully",
    };
  } catch (error) {
    console.error("❌ Registration error:", error.message);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", `Registration failed: ${error.message}`);
  }
});

// === TEACHER LOGIN - FIXED VERSION ===
exports.loginTeacher = onCall(async (request) => {
  console.log("🔥 Login attempt started");

  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { displayName } = request.data;

    if (!displayName?.trim()) {
      throw new HttpsError("invalid-argument", "Display name is required");
    }

    const trimmedName = displayName.trim();
    console.log("🔍 Searching for teacher with name:", trimmedName);

    const teachersRef = db.collection("teachers");
    const snapshot = await teachersRef
      .where("displayName", "==", trimmedName)
      .get();

    if (snapshot.empty) {
      console.log("❌ No teacher found with name:", trimmedName);
      return {
        success: false,
        message: "Teacher not found. Please check your name or register first.",
      };
    }

    const teacherDoc = snapshot.docs[0];
    const teacherData = teacherDoc.data();

    console.log("✅ Teacher found:", {
      id: teacherDoc.id,
      name: teacherData.displayName,
    });

    // Update login info
    const currentLoginCount = teacherData.loginCount || 0;
    await teacherDoc.ref.update({
      lastLoginAt: new Date().toISOString(),
      loginCount: currentLoginCount + 1,
      status: "active",
    });

    return {
      success: true,
      message: "Login successful",
      teacher: {
        id: teacherDoc.id,
        displayName: teacherData.displayName,
        grades: teacherData.grades || [],
        location: teacherData.location || "",
        experienceYears: teacherData.experienceYears || 0,
        createdAt: teacherData.createdAt,
        lastLoginAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("❌ Error in loginTeacher:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Failed to login teacher", {
      details: error.message,
    });
  }
});

// === CHALLENGE POSTING ===
exports.postChallenge = onCall(async (req) => {
  try {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    const { text, urgency = "medium", teacherId } = req.data;

    // 1️⃣ Validate inputs
    if (!text?.trim()) {
      throw new HttpsError("invalid-argument", "Challenge text is required");
    }
    if (!teacherId || typeof teacherId !== "string") {
      throw new HttpsError("invalid-argument", "teacherId is required");
    }

    // 2️⃣ Verify the teacherId belongs to this user
    const teacherDoc = await db.collection("teachers").doc(teacherId).get();
    if (!teacherDoc.exists) {
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to post as this teacher"
      );
    }

    // 3️⃣ Build and save the challenge
    const challenge = {
      ownerUid: req.auth.uid,
      teacherId,
      text: text.trim(),
      urgency,
      createdAt: new Date().toISOString(),
      status: "POSTED",
      responses: [],
    };

    const ref = await db.collection("challenges").add(challenge);

    // 🆕 NEW: Trigger wellness analysis for the challenge
    await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_reports")
      .add({
        analysis_type: "challenge",
        content: text.trim(),
        challenge_id: ref.id,
        challenge_type: urgency,
        created_at: FieldValue.serverTimestamp(),
        status: "pending",
      });

    return {
      success: true,
      challengeId: ref.id,
      message: "Challenge posted successfully",
    };
  } catch (error) {
    console.error("❌ Error posting challenge:", error);

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      `Failed to post challenge: ${error.message}`
    );
  }
});

// === AI AGENT FUNCTIONS ===
// 1️⃣ Profile Agent
exports.profileAgent = onDocumentCreated("teachers/{teacherId}", async (e) => {
  const teacher = e.data.data();
  const id = e.params.teacherId;

  const payload = {
    id,
    name: teacher.displayName,
    grades: teacher.grades,
    location: teacher.location,
    experience: teacher.experienceYears,
  };

  try {
    console.log(`🤖 Profile Agent: Processing teacher ${id}`);
    const profileResult = await callAgent("/profile", payload);

    await db
      .collection("teacherProfiles")
      .doc(id)
      .set({
        ...profileResult,
        processedAt: new Date().toISOString(),
      });

    console.log(`✅ Profile Agent: Stored profile for ${id}`);
  } catch (error) {
    console.error(`❌ Profile Agent failed for ${id}:`, error.message);

    // Store error info for debugging
    await db.collection("teacherProfiles").doc(id).set({
      error: error.message,
      processingFailed: true,
      processedAt: new Date().toISOString(),
    });
  }
});

// 2️⃣ Challenge Classification Agent
exports.classificationAgent = onDocumentCreated(
  "challenges/{challengeId}",
  async (e) => {
    const challengeId = e.params.challengeId;
    const data = e.data.data();

    try {
      console.log(
        `🏷️ Classification Agent: Processing challenge ${challengeId}`
      );

      const classificationResult = await callAgent("/classify", {
        id: challengeId,
        text: data.text,
      });

      await db.collection("challenges").doc(challengeId).update({
        classification: classificationResult,
        status: "CLASSIFIED",
        classifiedAt: new Date().toISOString(),
      });

      console.log(
        `✅ Classification Agent: Classified ${challengeId} as ${classificationResult.type}`
      );
    } catch (error) {
      console.error(
        `❌ Classification Agent failed for ${challengeId}:`,
        error.message
      );

      await db.collection("challenges").doc(challengeId).update({
        classificationError: error.message,
        status: "CLASSIFICATION_FAILED",
      });
    }
  }
);

// 3️⃣ Enhanced Peer Matching Agent with AI Fallback
exports.matchingAgent = onDocumentUpdated(
  "challenges/{challengeId}",
  async (e) => {
    const before = e.data.before.data();
    const after = e.data.after.data();
    const challengeId = e.params.challengeId;

    // Only run when status changes to CLASSIFIED
    if (before.status !== "POSTED" || after.status !== "CLASSIFIED") return;

    const { classification, teacherId } = after;

    try {
      console.log(
        `🤝 Matching Agent: Finding matches for challenge ${challengeId}`
      );

      // Get teacher profile using teacherId (which is now the actual doc ID)
      const profileSnap = await db
        .collection("teacherProfiles")
        .doc(teacherId)
        .get();
      let profile = profileSnap.data();

      if (!profile) {
        console.log(`⚠️ No profile found for teacher ${teacherId}`);

        // Fallback: Get basic teacher data using doc ID
        const teacherSnap = await db
          .collection("teachers")
          .doc(teacherId)
          .get();
        const basicProfile = teacherSnap.data();

        if (basicProfile) {
          profile = {
            teacherId,
            matchingCriteria: {
              grades: basicProfile.grades || [],
              location: basicProfile.location || "",
              experienceLevel:
                basicProfile.experienceYears < 3 ? "novice" : "experienced",
            },
          };
        }
      }

      let matches = [];
      let aiChatRecommended = false;

      try {
        // Try to get peer matches from AI agent
        const agentMatches = await callAgent("/match", {
          challengeId,
          teacherProfile: profile,
          classification,
        });

        // Filter for peer matches only
        const peerMatches =
          agentMatches?.filter((match) => match.type === "peer") || [];

        // Get AI match recommendation
        const aiMatch = agentMatches?.find((match) => match.type === "ai");

        matches = peerMatches;
        aiChatRecommended = !!aiMatch;

        console.log(
          `🔍 Found ${peerMatches.length} peer matches, AI recommended: ${aiChatRecommended}`
        );
      } catch (agentError) {
        console.log(
          `⚠️ Agent call failed, using fallback logic:`,
          agentError.message
        );

        // Fallback: Search for peer matches manually
        matches = await findPeerMatchesFallback(profile, classification);
        aiChatRecommended = true; // Always recommend AI when agent fails
      }

      // If no peer matches found, ensure AI chat is recommended
      if (matches.length === 0) {
        aiChatRecommended = true;
        console.log(`💡 No peer matches found, recommending AI chat`);
      }

      // Update challenge document
      await db.collection("challenges").doc(challengeId).update({
        matches: matches,
        aiChatRecommended,
        status: "MATCHED",
        matchedAt: new Date().toISOString(),
      });

      console.log(
        `✅ Matching Agent: Found ${matches.length} peer matches, AI recommended: ${aiChatRecommended} for ${challengeId}`
      );
    } catch (error) {
      console.error(
        `❌ Matching Agent failed for ${challengeId}:`,
        error.message
      );

      // Even on failure, recommend AI chat as fallback
      await db.collection("challenges").doc(challengeId).update({
        matches: [],
        aiChatRecommended: true,
        matchingError: error.message,
        status: "MATCHED", // Still mark as matched so UI can show AI option
        matchedAt: new Date().toISOString(),
      });
    }
  }
);
// Fallback function to find peer matches when agent is unavailable
async function findPeerMatchesFallback(currentProfile, classification) {
  try {
    const profilesSnap = await db.collection("teacherProfiles").get();
    const matches = [];

    profilesSnap.forEach((doc) => {
      const profile = doc.data();

      // Don't match with self
      if (profile.teacherId === currentProfile.teacherId) return;

      // Simple matching logic
      let score = 0;

      // Grade overlap
      const currentGrades = currentProfile.matchingCriteria?.grades || [];
      const peerGrades = profile.matchingCriteria?.grades || [];
      const gradeOverlap = currentGrades.filter((g) => peerGrades.includes(g));
      score += gradeOverlap.length * 0.3;

      // Location match
      if (
        currentProfile.matchingCriteria?.location ===
        profile.matchingCriteria?.location
      ) {
        score += 0.2;
      }

      // Experience level compatibility
      const currentExp = currentProfile.matchingCriteria?.experienceLevel;
      const peerExp = profile.matchingCriteria?.experienceLevel;
      if (
        currentExp === peerExp ||
        (currentExp === "novice" && peerExp === "experienced") ||
        (currentExp === "experienced" && peerExp === "veteran")
      ) {
        score += 0.2;
      }

      // Add some randomness for variety
      score += Math.random() * 0.1;

      // Only include if score is meaningful
      if (score > 0.2) {
        matches.push({
          peerId: profile.teacherId,
          score: Math.min(score, 1.0),
          type: "peer",
        });
      }
    });

    // Sort by score and return top 3
    return matches.sort((a, b) => b.score - a.score).slice(0, 3);
  } catch (error) {
    console.error("Fallback matching failed:", error);
    return [];
  }
}

// 4️⃣ Connection Orchestration Agent
exports.connectionOrchestrationAgent = onDocumentUpdated(
  "challenges/{challengeId}",
  async (e) => {
    const before = e.data.before.data();
    const after = e.data.after.data();
    const challengeId = e.params.challengeId;

    if (before.status !== "CLASSIFIED" || after.status !== "MATCHED") return;

    const { matches, teacherId, text } = after;

    try {
      console.log(
        `🔗 Orchestration Agent: Creating connection for challenge ${challengeId}`
      );

      const orchestrationResult = await callAgent("/orchestrate", {
        challengeId,
        teacherId,
        matches: matches || [],
        text,
      });

      await db
        .collection("challenges")
        .doc(challengeId)
        .update({
          ...orchestrationResult,
          status: "ORCHESTRATED",
          orchestratedAt: new Date().toISOString(),
        });

      console.log(
        `✅ Orchestration Agent: Created connection for ${challengeId}`
      );
    } catch (error) {
      console.error(
        `❌ Orchestration Agent failed for ${challengeId}:`,
        error.message
      );

      await db.collection("challenges").doc(challengeId).update({
        orchestrationError: error.message,
        status: "ORCHESTRATION_FAILED",
      });
    }
  }
);

// === ADDITIONAL CALLABLE FUNCTIONS ===

// 5️⃣ Get AI Peer Support
exports.getAiPeerSupport = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { challengeText, challengeId } = request.data;

    if (!challengeText?.trim()) {
      throw new HttpsError("invalid-argument", "Challenge text is required");
    }

    // Find teacher doc by ownerUid
    const teacherQuery = await db
      .collection("teachers")
      .where("ownerUid", "==", request.auth.uid)
      .limit(1)
      .get();

    if (teacherQuery.empty) {
      throw new HttpsError("failed-precondition", "Teacher profile not found");
    }

    const teacherDoc = teacherQuery.docs[0];
    const teacherId = teacherDoc.id;

    // Get teacher profile using actual doc ID
    const teacherProfileSnap = await db
      .collection("teacherProfiles")
      .doc(teacherId)
      .get();
    const teacherProfile = teacherProfileSnap.data() || {};

    console.log(
      `🤖 AI Peer Agent: Providing support for challenge ${challengeId}`
    );

    const aiSupport = await callAgent("/ai-peer", {
      challengeText: challengeText.trim(),
      teacherProfile,
      challengeId,
    });

    // Store AI interaction
    await db.collection("aiInteractions").add({
      challengeId,
      teacherId: teacherId, // Use actual teacher doc ID
      aiSupport,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      aiSupport,
      message: "AI peer support provided",
    };
  } catch (error) {
    console.error("❌ AI Peer Support error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `AI peer support failed: ${error.message}`
    );
  }
});
// === UTILITY FUNCTIONS ===

// Get teacher dashboard data
// Get teacher dashboard data
exports.getTeacherDashboard = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const ownerUid = request.auth.uid;

    // Find teacher doc by ownerUid
    const teacherQuery = await db
      .collection("teachers")
      .where("ownerUid", "==", ownerUid)
      .limit(1)
      .get();

    if (teacherQuery.empty) {
      throw new HttpsError("failed-precondition", "Teacher profile not found");
    }

    const teacherDoc = teacherQuery.docs[0];
    const teacherId = teacherDoc.id;

    // Get teacher profile using actual doc ID
    const profileSnap = await db
      .collection("teacherProfiles")
      .doc(teacherId)
      .get();
    const profile = profileSnap.data();

    // Get recent challenges using actual teacher doc ID
    const challengesSnap = await db
      .collection("challenges")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const challenges = challengesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get AI interactions
    const aiInteractionsSnap = await db
      .collection("aiInteractions")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const aiInteractions = aiInteractionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      dashboard: {
        profile,
        recentChallenges: challenges,
        aiInteractions,
        stats: {
          totalChallenges: challenges.length,
          resolvedChallenges: challenges.filter((c) => c.status === "RESOLVED")
            .length,
          aiInteractions: aiInteractions.length,
        },
      },
    };
  } catch (error) {
    console.error("❌ Dashboard data error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to get dashboard data: ${error.message}`
    );
  }
});

// Health check for agents
exports.checkAgentHealth = onCall(async (request) => {
  try {
    const healthCheck = await fetch(`${AGENT_BASE_URL}/health`, {
      method: "GET",
      headers: { "ngrok-skip-browser-warning": "true" },
      timeout: 10000,
    });

    const healthData = await healthCheck.json();

    return {
      success: true,
      agentHealth: healthData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Agent health check failed:", error);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
});

// ======================== START OR FETCH CHAT ===========================
// === START OR FETCH CHAT ===
exports.startChatWith = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign‑in required");
  const userUid = req.auth.uid;
  const { peerId, teacherId } = req.data;
  if (!peerId || !teacherId) {
    throw new HttpsError(
      "invalid-argument",
      "peerId and teacherId are required"
    );
  }

  // 1️⃣ Verify that this teacherId belongs to the caller
  const teacherRef = db.collection("teachers").doc(teacherId);
  const teacherSnap = await teacherRef.get();
  //   if (!teacherSnap.exists || teacherSnap.data().ownerUid !== userUid) {
  //     throw new HttpsError("permission-denied", "Not authorized");
  //   }

  // 2️⃣ Find or create the 1:1 conversation
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

  // 3️⃣ Add peerId to **your** peers
  await teacherRef.update({
    peers: FieldValue.arrayUnion(peerId),
  });

  // 4️⃣ **Reciprocal**: add teacherId to **their** peers
  const peerTeacherRef = db.collection("teachers").doc(peerId);
  await peerTeacherRef.update({
    peers: FieldValue.arrayUnion(teacherId),
  });

  return { convoId };
});

// === ON MESSAGE CREATED: INCREMENT UNREAD FOR RECEIVER ===
exports.incrementUnread = onDocumentCreated(
  "conversations/{convoId}/messages/{msgId}",
  async (e) => {
    const { members } = await db
      .collection("conversations")
      .doc(e.params.convoId)
      .get()
      .then((s) => s.data());
    const sender = e.data.data().sender;
    console.log(sender);
    const recipient = members.find((u) => u !== sender);
    const convoRef = db.collection("conversations").doc(e.params.convoId);
    await convoRef.update({
      [`unreadCounts.${recipient}`]: FieldValue.increment(1),
      lastUpdated: new Date().toISOString(),
    });
  }
);

// === MARK AS READ ===
exports.markAsRead = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign‑in required");
  const userUid = req.auth.uid;
  const { convoId, teacherId } = req.data;
  if (!convoId) throw new HttpsError("invalid-argument", "convoId is required");

  const convoRef = db.collection("conversations").doc(convoId);
  const convoSnap = await convoRef.get();
  if (!convoSnap.exists)
    throw new HttpsError("not-found", "Conversation not found");

  // Reset unread count
  await convoRef.update({ [`unreadCounts.${teacherId}`]: 0 });
  return { success: true };
});

// === NEW AI CHAT SESSION MANAGEMENT ===
// Create AI Chat Session
// Fixed createAiChatSession function
exports.createAiChatSession = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { challengeId, challengeText, teacherId } = request.data;

    if (!challengeId || !challengeText?.trim() || !teacherId) {
      throw new HttpsError(
        "invalid-argument",
        "challengeId, challengeText, and teacherId are required"
      );
    }

    // Get teacher profile for context
    const profileSnap = await db
      .collection("teacherProfiles")
      .doc(teacherId)
      .get();
    const teacherProfile = profileSnap.data() || {};

    console.log(`🤖 Creating AI chat session for challenge ${challengeId}`);

    let sessionResult;

    try {
      sessionResult = await callAgent("/create-ai-session", {
        teacherId,
        challengeId,
        challengeText: challengeText.trim(),
        teacherProfile,
      });
    } catch (agentError) {
      console.error("❌ Agent call failed:", agentError);
      // Create fallback session if agent fails
      sessionResult = {
        sessionId: `ai-session-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        persona: "AI Teaching Assistant",
        welcomeMessage:
          "Hello! I'm your AI teaching assistant. I'm here to help you with your teaching challenges. How can I assist you today?",
        suggestedQuestions: [
          "How can I improve student engagement in my classroom?",
          "What are some effective classroom management strategies?",
          "How can I differentiate instruction for diverse learners?",
          "What are some creative assessment techniques?",
        ],
      };
    }

    // Ensure all required fields have values (prevent undefined errors)
    const sessionData = {
      sessionId:
        sessionResult.sessionId ||
        `ai-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      challengeId,
      teacherId,
      challengeText: challengeText.trim(),
      persona: sessionResult.persona || "AI Teaching Assistant",
      welcomeMessage:
        sessionResult.welcomeMessage ||
        "Hello! I'm your AI teaching assistant. How can I assist you today?",
      suggestedQuestions: sessionResult.suggestedQuestions || [
        "How can I improve my teaching methods?",
        "What classroom management tips do you have?",
        "How can I engage students better?",
      ],
      createdAt: new Date().toISOString(),
      status: "active",
      messageCount: 0,
      lastMessageAt: new Date().toISOString(),
    };

    // Store session in Firestore
    await db
      .collection("aiChatSessions")
      .doc(sessionData.sessionId)
      .set(sessionData);

    console.log(`✅ AI chat session created: ${sessionData.sessionId}`);

    return {
      success: true,
      session: {
        sessionId: sessionData.sessionId,
        persona: sessionData.persona,
        welcomeMessage: sessionData.welcomeMessage,
        suggestedQuestions: sessionData.suggestedQuestions,
      },
      message: "AI chat session created successfully",
    };
  } catch (error) {
    console.error("❌ Create AI chat session error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to create AI chat session: ${error.message}`
    );
  }
});
// AI Chat - Send Message
// AI Chat - Send Message (Fixed)
exports.sendAiChatMessage = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { sessionId, message, endSession = false } = request.data;

    if (!sessionId || !message?.trim()) {
      throw new HttpsError(
        "invalid-argument",
        "sessionId and message are required"
      );
    }

    // Verify session exists and is active
    const sessionDoc = await db
      .collection("aiChatSessions")
      .doc(sessionId)
      .get();
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

    // Call the AI agent
    let aiResponse;
    try {
      aiResponse = await callAgent("/ai-chat", {
        sessionId,
        message: message.trim(),
        sessionContext: {
          challengeId: sessionData.challengeId,
          teacherId: sessionData.teacherId,
          persona: sessionData.persona,
        },
      });
    } catch (agentError) {
      console.error(`❌ AI Agent call failed:`, agentError);
      throw new HttpsError("internal", "AI service temporarily unavailable");
    }

    // Parse response (your existing logic)
    let responseText = "";
    let metrics = null;
    let suggestedFollowUps = null;

    try {
      if (typeof aiResponse === "string") {
        try {
          const parsed = JSON.parse(aiResponse);
          responseText = extractTextFromResponse(parsed);
          metrics = extractMetricsFromResponse(parsed);
          suggestedFollowUps = parsed.suggestedFollowUps || null;
        } catch (jsonError) {
          responseText = aiResponse.trim();
        }
      } else if (typeof aiResponse === "object" && aiResponse !== null) {
        responseText = extractTextFromResponse(aiResponse);
        metrics = extractMetricsFromResponse(aiResponse);
        suggestedFollowUps = aiResponse.suggestedFollowUps || null;
      } else {
        responseText = String(aiResponse).trim();
      }

      if (!responseText || responseText.length === 0) {
        throw new Error("Empty response from AI agent");
      }
    } catch (parseError) {
      console.error(`❌ Error parsing AI response:`, parseError);
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

    if (suggestedFollowUps && Array.isArray(suggestedFollowUps)) {
      sessionUpdate.suggestedFollowUps = suggestedFollowUps;
    }

    await db.collection("aiChatSessions").doc(sessionId).update(sessionUpdate);

    // Store messages (your existing logic)
    await db
      .collection("aiChatSessions")
      .doc(sessionId)
      .collection("messages")
      .add({
        type: "user",
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });

    const aiMessageDoc = {
      type: "ai",
      message: responseText,
      timestamp: new Date().toISOString(),
    };

    if (metrics && Object.values(metrics).some((v) => v !== null)) {
      const cleanMetrics = {};
      Object.entries(metrics).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          cleanMetrics[key] = value;
        }
      });
      if (Object.keys(cleanMetrics).length > 0) {
        aiMessageDoc.metrics = cleanMetrics;
      }
    }

    if (suggestedFollowUps && Array.isArray(suggestedFollowUps)) {
      aiMessageDoc.suggestedFollowUps = suggestedFollowUps;
    }

    await db
      .collection("aiChatSessions")
      .doc(sessionId)
      .collection("messages")
      .add(aiMessageDoc);

    // 🆕 NEW: Trigger wellness analysis every 3 message exchanges or when session ends
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

      await db
        .collection("teachers")
        .doc(sessionData.teacherId)
        .collection("wellness_reports")
        .add({
          analysis_type: "chat",
          content: messagesData,
          session_data: {
            session_id: sessionId,
            message_count: messagesData.length,
            teacher_message_count: teacherMessageCount,
            duration: Date.now() - new Date(sessionData.createdAt).getTime(),
            ended: endSession,
          },
          created_at: FieldValue.serverTimestamp(),
          status: "pending",
        });
    }

    console.log(`✅ AI chat message stored successfully`);

    return {
      success: true,
      response: responseText,
      metrics: metrics,
      suggestedFollowUps: suggestedFollowUps,
      message: "AI response generated successfully",
    };
  } catch (error) {
    console.error("❌ AI chat message error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      `Failed to send AI chat message: ${error.message}`
    );
  }
});

// Helper function to extract text from various response formats
function extractTextFromResponse(response) {
  if (!response) return "";

  // Check for nested response structure first
  if (response.response && typeof response.response === "object") {
    return (
      response.response.text ||
      response.response.message ||
      response.response.content ||
      ""
    );
  }

  // Check for direct text fields
  return (
    response.text ||
    response.message ||
    response.content ||
    response.response ||
    ""
  );
}

// Helper function to extract metrics from various response formats
function extractMetricsFromResponse(response) {
  if (!response) return null;

  let metrics = {};

  // Check for nested response structure first
  if (response.response && typeof response.response === "object") {
    metrics = {
      confidence: response.response.confidence || null,
      resources: response.response.resources || null,
      type: response.response.type || null,
    };
  } else {
    // Check for direct metrics fields
    metrics = {
      confidence: response.confidence || null,
      resources: response.resources || null,
      type: response.type || null,
    };
  }

  // Return null if no metrics found
  const hasMetrics = Object.values(metrics).some((v) => v !== null);
  return hasMetrics ? metrics : null;
}
// End AI Chat Session and Get Analysis
exports.endAiChatSession = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { sessionId } = request.data;

    if (!sessionId) {
      throw new HttpsError("invalid-argument", "sessionId is required");
    }

    // Verify session exists
    const sessionDoc = await db
      .collection("aiChatSessions")
      .doc(sessionId)
      .get();
    if (!sessionDoc.exists) {
      throw new HttpsError("not-found", "AI chat session not found");
    }

    console.log(`📊 Analyzing AI chat session ${sessionId}`);

    const analysisResult = await callAgent("/analyze-session", {
      sessionId,
    });

    // Ensure analysisResult is not undefined
    const analysis = analysisResult || null;

    // Update session status and store analysis
    const updateData = {
      status: "completed",
      endedAt: new Date().toISOString(),
    };

    // Only add analysis if it's not null/undefined
    if (analysis !== null && analysis !== undefined) {
      updateData.analysis = analysis;
    }

    await db.collection("aiChatSessions").doc(sessionId).update(updateData);

    return {
      success: true,
      analysis: analysis,
      message: "AI chat session ended and analyzed successfully",
    };
  } catch (error) {
    console.error("❌ End AI chat session error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to end AI chat session: ${error.message}`
    );
  }
});

// === ENHANCED AVAILABILITY COORDINATION ===

// Coordinate Teacher Availability
exports.coordinateAvailability = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { teacherIds, preferredTimes } = request.data;

    if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
      throw new HttpsError("invalid-argument", "teacherIds array is required");
    }

    console.log(
      `📅 Coordinating availability for ${teacherIds.length} teachers`
    );

    const coordinationResult = await callAgent("/coordinate-availability", {
      teacherIds,
      preferredTimes: preferredTimes || [],
    });

    // Store coordination result
    await db.collection("availabilityCoordination").add({
      teacherIds,
      preferredTimes: preferredTimes || [],
      result: coordinationResult,
      createdAt: new Date().toISOString(),
      requestedBy: request.auth.uid,
    });

    return {
      success: true,
      coordination: coordinationResult,
      message: "Availability coordination completed successfully",
    };
  } catch (error) {
    console.error("❌ Coordinate availability error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to coordinate availability: ${error.message}`
    );
  }
});

// === INTERACTION MONITORING ===

// Monitor Interaction (Trust & Safety)
exports.monitorInteraction = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { interactionId, participants, messages } = request.data;

    if (
      !interactionId ||
      !Array.isArray(participants) ||
      !Array.isArray(messages)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "interactionId, participants, and messages are required"
      );
    }

    console.log(`🛡️ Monitoring interaction ${interactionId}`);

    const monitoringResult = await callAgent("/monitor-interaction", {
      interactionId,
      participants,
      messages,
    });

    // Store monitoring result
    await db.collection("interactionMonitoring").add({
      interactionId,
      participants,
      messageCount: messages.length,
      result: monitoringResult,
      createdAt: new Date().toISOString(),
      monitoredBy: request.auth.uid,
    });

    return {
      success: true,
      monitoring: monitoringResult,
      message: "Interaction monitoring completed successfully",
    };
  } catch (error) {
    console.error("❌ Monitor interaction error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to monitor interaction: ${error.message}`
    );
  }
});

// === NETWORK ANALYSIS ===

// Analyze Network
exports.analyzeNetwork = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    console.log(`🕸️ Analyzing teacher network`);

    const networkAnalysis = await callAgent("/analyze-network", {});

    // Store network analysis
    await db.collection("networkAnalysis").add({
      analysis: networkAnalysis,
      createdAt: new Date().toISOString(),
      requestedBy: request.auth.uid,
    });

    return {
      success: true,
      analysis: networkAnalysis,
      message: "Network analysis completed successfully",
    };
  } catch (error) {
    console.error("❌ Network analysis error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to analyze network: ${error.message}`
    );
  }
});

// === ENHANCED DASHBOARD WITH AI SESSIONS ===

// Enhanced Dashboard (replaces existing getTeacherDashboard)
exports.getEnhancedTeacherDashboard = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const ownerUid = request.auth.uid;

    // Find teacher doc by ownerUid
    const teacherQuery = await db
      .collection("teachers")
      .where("ownerUid", "==", ownerUid)
      .limit(1)
      .get();

    if (teacherQuery.empty) {
      throw new HttpsError("failed-precondition", "Teacher profile not found");
    }

    const teacherDoc = teacherQuery.docs[0];
    const teacherId = teacherDoc.id;

    // Get teacher profile
    const profileSnap = await db
      .collection("teacherProfiles")
      .doc(teacherId)
      .get();
    const profile = profileSnap.data();

    // Get recent challenges
    const challengesSnap = await db
      .collection("challenges")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const challenges = challengesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get AI chat sessions
    const aiSessionsSnap = await db
      .collection("aiChatSessions")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const aiSessions = aiSessionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get conversations
    const conversationsSnap = await db
      .collection("conversations")
      .where("members", "array-contains", teacherId)
      .orderBy("lastUpdated", "desc")
      .limit(10)
      .get();

    const conversations = conversationsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Enhanced stats
    const stats = {
      totalChallenges: challenges.length,
      resolvedChallenges: challenges.filter((c) => c.status === "RESOLVED")
        .length,
      activeChallenges: challenges.filter((c) => c.status !== "RESOLVED")
        .length,
      aiSessions: aiSessions.length,
      activeAiSessions: aiSessions.filter((s) => s.status === "active").length,
      completedAiSessions: aiSessions.filter((s) => s.status === "completed")
        .length,
      totalConversations: conversations.length,
      unreadMessages: conversations.reduce(
        (sum, c) => sum + (c.unreadCounts?.[teacherId] || 0),
        0
      ),
    };

    return {
      success: true,
      dashboard: {
        profile,
        recentChallenges: challenges,
        aiSessions,
        conversations,
        stats,
      },
    };
  } catch (error) {
    console.error("❌ Enhanced dashboard error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to get enhanced dashboard: ${error.message}`
    );
  }
});

// === BATCH OPERATIONS ===

// Batch Process Challenges (for admin use)
exports.batchProcessChallenges = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { challengeIds } = request.data;

    if (!Array.isArray(challengeIds) || challengeIds.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "challengeIds array is required"
      );
    }

    console.log(`⚡ Batch processing ${challengeIds.length} challenges`);

    const results = [];
    const batchSize = 5; // Process in batches to avoid timeouts

    for (let i = 0; i < challengeIds.length; i += batchSize) {
      const batch = challengeIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (challengeId) => {
        try {
          const challengeDoc = await db
            .collection("challenges")
            .doc(challengeId)
            .get();
          if (!challengeDoc.exists) {
            return { challengeId, status: "not_found" };
          }

          const data = challengeDoc.data();

          // Force reprocessing by updating status
          await db.collection("challenges").doc(challengeId).update({
            status: "POSTED",
            reprocessedAt: new Date().toISOString(),
          });

          return { challengeId, status: "queued_for_reprocessing" };
        } catch (error) {
          return { challengeId, status: "error", error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return {
      success: true,
      results,
      message: `Batch processing initiated for ${challengeIds.length} challenges`,
    };
  } catch (error) {
    console.error("❌ Batch process error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to batch process challenges: ${error.message}`
    );
  }
});

// === ENHANCED ERROR HANDLING AND RETRY LOGIC ===

// Retry Failed Processing
exports.retryFailedProcessing = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { type, limit = 10 } = request.data;

    if (
      !type ||
      !["classification", "matching", "orchestration"].includes(type)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Valid type is required: classification, matching, or orchestration"
      );
    }

    console.log(`🔄 Retrying failed ${type} processing`);

    const failedStatus = `${type.toUpperCase()}_FAILED`;
    const targetStatus =
      type === "classification"
        ? "POSTED"
        : type === "matching"
        ? "CLASSIFIED"
        : "MATCHED";

    const failedChallenges = await db
      .collection("challenges")
      .where("status", "==", failedStatus)
      .limit(limit)
      .get();

    const retryResults = [];

    for (const doc of failedChallenges.docs) {
      try {
        await db
          .collection("challenges")
          .doc(doc.id)
          .update({
            status: targetStatus,
            retryAttempt: FieldValue.increment(1),
            retriedAt: new Date().toISOString(),
          });

        retryResults.push({ challengeId: doc.id, status: "queued_for_retry" });
      } catch (error) {
        retryResults.push({
          challengeId: doc.id,
          status: "retry_failed",
          error: error.message,
        });
      }
    }

    return {
      success: true,
      retryResults,
      message: `Retry initiated for ${failedChallenges.docs.length} failed ${type} processes`,
    };
  } catch (error) {
    console.error("❌ Retry failed processing error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to retry processing: ${error.message}`
    );
  }
});

// === SYSTEM HEALTH AND MONITORING ===

// Get System Health
exports.getSystemHealth = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    // Check agent health
    const agentHealth = await callAgent("/health", {});

    // Get system metrics
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Recent challenges
    const recentChallenges = await db
      .collection("challenges")
      .where("createdAt", ">=", oneDayAgo.toISOString())
      .get();

    // Recent AI sessions
    const recentAiSessions = await db
      .collection("aiChatSessions")
      .where("createdAt", ">=", oneDayAgo.toISOString())
      .get();

    // Failed processes
    const failedProcesses = await db
      .collection("challenges")
      .where("status", "in", [
        "CLASSIFICATION_FAILED",
        "MATCHING_FAILED",
        "ORCHESTRATION_FAILED",
      ])
      .get();

    const systemHealth = {
      agents: agentHealth,
      metrics: {
        challengesLast24h: recentChallenges.size,
        aiSessionsLast24h: recentAiSessions.size,
        failedProcesses: failedProcesses.size,
        processingStates: {
          posted: recentChallenges.docs.filter(
            (d) => d.data().status === "POSTED"
          ).length,
          classified: recentChallenges.docs.filter(
            (d) => d.data().status === "CLASSIFIED"
          ).length,
          matched: recentChallenges.docs.filter(
            (d) => d.data().status === "MATCHED"
          ).length,
          orchestrated: recentChallenges.docs.filter(
            (d) => d.data().status === "ORCHESTRATED"
          ).length,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      systemHealth,
      message: "System health check completed",
    };
  } catch (error) {
    console.error("❌ System health check error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to get system health: ${error.message}`
    );
  }
});

// === ADMIN FUNCTIONS ===

// Get Debug Information
exports.getDebugInfo = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    // Get debug info from agent
    const debugProfiles = await callAgent("/debug/profiles", {});

    // Get recent system activity
    const recentActivity = {
      challenges: await db
        .collection("challenges")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
      aiSessions: await db
        .collection("aiChatSessions")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
      interactions: await db
        .collection("aiInteractions")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
    };

    return {
      success: true,
      debug: {
        agentProfiles: debugProfiles,
        recentActivity: {
          challenges: recentActivity.challenges.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
          aiSessions: recentActivity.aiSessions.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
          interactions: recentActivity.interactions.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        },
      },
      message: "Debug information retrieved successfully",
    };
  } catch (error) {
    console.error("❌ Debug info error:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to get debug info: ${error.message}`
    );
  }
});

// === IMPROVED ORCHESTRATION AGENT ===
// Update the existing orchestration agent to handle the new response format
exports.enhancedConnectionOrchestrationAgent = onDocumentUpdated(
  "challenges/{challengeId}",
  async (e) => {
    const before = e.data.before.data();
    const after = e.data.after.data();
    const challengeId = e.params.challengeId;

    if (before.status !== "CLASSIFIED" || after.status !== "MATCHED") return;

    const { matches, teacherId, text, classification } = after;

    try {
      console.log(
        `🔗 Enhanced Orchestration Agent: Processing challenge ${challengeId}`
      );

      // Get teacher profile for enhanced orchestration
      const profileSnap = await db
        .collection("teacherProfiles")
        .doc(teacherId)
        .get();
      const teacherProfile = profileSnap.data() || {};

      const orchestrationResult = await callAgent("/orchestrate", {
        challengeId,
        teacherId,
        matches: matches || [],
        text,
        classification,
        teacherProfile,
      });

      // Enhanced orchestration data
      const updateData = {
        ...orchestrationResult,
        status: "ORCHESTRATED",
        orchestratedAt: new Date().toISOString(),
        orchestrationEnhanced: true,
      };

      // If AI session is recommended, create it automatically
      if (orchestrationResult.recommendAiChat) {
        try {
          const aiSessionResult = await callAgent("/create-ai-session", {
            teacherId,
            challengeId,
            challengeText: text,
            teacherProfile,
          });

          updateData.aiSessionId = aiSessionResult.sessionId;
          updateData.aiSessionCreated = true;

          // Store AI session
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
            `❌ Failed to create AI session during orchestration:`,
            aiError
          );
          updateData.aiSessionError = aiError.message;
        }
      }

      await db.collection("challenges").doc(challengeId).update(updateData);

      console.log(
        `✅ Enhanced Orchestration Agent: Completed for ${challengeId}`
      );
    } catch (error) {
      console.error(
        `❌ Enhanced Orchestration Agent failed for ${challengeId}:`,
        error.message
      );

      await db.collection("challenges").doc(challengeId).update({
        orchestrationError: error.message,
        status: "ORCHESTRATION_FAILED",
      });
    }
  }
);

// ============================================wellness
// Helper function to send notifications (NEW)
async function sendNotification(teacherId, notificationData) {
  try {
    // Get teacher's FCM token
    const teacherDoc = await db.collection("teachers").doc(teacherId).get();

    if (!teacherDoc.exists) {
      console.log("Teacher not found:", teacherId);
      return;
    }

    const teacherData = teacherDoc.data();
    const fcmToken = teacherData.fcm_token;

    if (!fcmToken) {
      console.log("No FCM token for teacher:", teacherId);
      return;
    }

    // Send notification using Firebase Admin SDK
    const message = {
      token: fcmToken,
      notification: {
        title: notificationData.title,
        body: notificationData.body,
      },
      data: {
        type: notificationData.type || "general",
        teacher_id: teacherId,
      },
    };

    await admin.messaging().send(message);
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Notification failed:", error);
  }
}

// Helper function to calculate wellness trend (NEW)
function calculateWellnessTrend(recentScores, newScore) {
  if (!recentScores || recentScores.length < 3) {
    return "stable";
  }

  const last3Scores = recentScores.slice(-3);
  const avgLast3 =
    last3Scores.reduce((sum, score) => sum + score.overall_wellness, 0) / 3;

  if (newScore.overall_wellness > avgLast3 + 10) {
    return "improving";
  } else if (newScore.overall_wellness < avgLast3 - 10) {
    return "declining";
  } else {
    return "stable";
  }
}

// 🚨 NEW: Wellness Agent - Main Function
exports.wellnessAnalysisAgent = onDocumentCreated(
  "teachers/{teacherId}/wellness_reports/{reportId}",
  async (event) => {
    try {
      const wellnessData = event.data.data();
      const teacherId = event.params.teacherId;
      const reportId = event.params.reportId;

      console.log("Processing wellness analysis for teacher:", teacherId);

      // Call AI wellness analysis using your existing callAgent function
      const analysis = await callAgent("/wellness-analysis", {
        teacher_id: teacherId,
        analysis_type: wellnessData.analysis_type,
        content: wellnessData.content,
        session_data: wellnessData.session_data || {},
      });

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

// 🚨 NEW: Send Critical Wellness Alert
async function sendWellnessCriticalAlert(teacherId, analysis) {
  try {
    const alertData = {
      teacher_id: teacherId,
      alert_type: "wellness_critical",
      urgency_level: analysis.urgency_level,
      message:
        "Your recent activity indicates you may need additional support. Please consider the wellness recommendations provided.",
      recommendations: analysis.recommendations || [],
      wellness_scores: analysis.wellness_scores || {},
      created_at: FieldValue.serverTimestamp(),
      acknowledged: false,
    };

    // Store alert in Firestore
    await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_alerts")
      .add(alertData);

    // Send push notification
    await sendNotification(teacherId, {
      title: "Wellness Check - Support Available",
      body: "We noticed you might need some support. Check your wellness recommendations.",
      type: "wellness_alert",
    });

    console.log("Critical wellness alert sent to teacher:", teacherId);
  } catch (error) {
    console.error("Failed to send wellness alert:", error);
  }
}

// 📊 NEW: Update Teacher Wellness Summary
async function updateTeacherWellnessSummary(teacherId, analysis) {
  try {
    const summaryRef = db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_summary")
      .doc("current");

    const currentSummary = await summaryRef.get();

    if (currentSummary.exists) {
      const data = currentSummary.data();

      // Update recent scores (keep last 10)
      const recentScores = data.recent_scores || [];
      recentScores.push({
        ...analysis.wellness_scores,
        timestamp: new Date().toISOString(),
        analysis_type: analysis.analysis_type,
      });

      // Keep only last 10 scores
      const updatedScores = recentScores.slice(-10);

      // Calculate wellness trend
      const wellnessTrend = calculateWellnessTrend(
        recentScores,
        analysis.wellness_scores
      );

      // Update summary
      await summaryRef.update({
        last_analysis: analysis,
        last_updated: FieldValue.serverTimestamp(),
        total_analyses: (data.total_analyses || 0) + 1,
        critical_alerts_count:
          (data.critical_alerts_count || 0) + (analysis.critical_alert ? 1 : 0),
        wellness_trend: wellnessTrend,
        recent_scores: updatedScores,
        avg_wellness_score:
          updatedScores.reduce(
            (sum, score) => sum + score.overall_wellness,
            0
          ) / updatedScores.length,
      });
    } else {
      // Create new summary
      await summaryRef.set({
        teacher_id: teacherId,
        last_analysis: analysis,
        created_at: FieldValue.serverTimestamp(),
        last_updated: FieldValue.serverTimestamp(),
        total_analyses: 1,
        critical_alerts_count: analysis.critical_alert ? 1 : 0,
        wellness_trend: "stable",
        recent_scores: [
          {
            ...analysis.wellness_scores,
            timestamp: new Date().toISOString(),
            analysis_type: analysis.analysis_type,
          },
        ],
        avg_wellness_score: analysis.wellness_scores?.overall_wellness || 0,
      });
    }

    console.log("Wellness summary updated for teacher:", teacherId);
  } catch (error) {
    console.error("Failed to update wellness summary:", error);
  }
}

// 📊 NEW: Enhanced Teacher Dashboard
exports.getEnhancedTeacherDashboard = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const teacherId = request.data.teacher_id;

    if (!teacherId) {
      throw new HttpsError("invalid-argument", "Teacher ID is required");
    }

    // Get teacher's basic info
    const teacherDoc = await db.collection("teachers").doc(teacherId).get();

    if (!teacherDoc.exists) {
      throw new HttpsError("not-found", "Teacher not found");
    }

    // Get wellness summary
    const wellnessSummary = await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_summary")
      .doc("current")
      .get();

    // Get unacknowledged wellness alerts
    const wellnessAlerts = await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_alerts")
      .where("acknowledged", "==", false)
      .orderBy("created_at", "desc")
      .limit(5)
      .get();

    // Get recent challenges
    const recentChallenges = await db
      .collection("challenges")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    // Get recent wellness reports
    const recentWellnessReports = await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_reports")
      .where("status", "==", "analyzed")
      .orderBy("created_at", "desc")
      .limit(10)
      .get();

    // Prepare dashboard data
    const dashboardData = {
      teacher: {
        id: teacherId,
        ...teacherDoc.data(),
      },
      wellness: {
        summary: wellnessSummary.exists ? wellnessSummary.data() : null,
        unacknowledged_alerts: wellnessAlerts.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.()?.toISOString() || null,
        })),
        recent_reports: recentWellnessReports.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.()?.toISOString() || null,
        })),
      },
      challenges: {
        recent: recentChallenges.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        total_count: recentChallenges.size,
      },
      last_updated: new Date().toISOString(),
    };

    return dashboardData;
  } catch (error) {
    console.error("Dashboard fetch failed:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

// 🔔 NEW: Acknowledge Wellness Alert
exports.acknowledgeWellnessAlert = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { teacher_id, alert_id } = request.data;

    if (!teacher_id || !alert_id) {
      throw new HttpsError(
        "invalid-argument",
        "Teacher ID and alert ID are required"
      );
    }

    // Update alert as acknowledged
    await db
      .collection("teachers")
      .doc(teacher_id)
      .collection("wellness_alerts")
      .doc(alert_id)
      .update({
        acknowledged: true,
        acknowledged_at: FieldValue.serverTimestamp(),
      });

    return { success: true, message: "Alert acknowledged successfully" };
  } catch (error) {
    console.error("Alert acknowledgment failed:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

// 📈 NEW: Get Wellness Analytics
exports.getWellnessAnalytics = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { teacher_id, timeframe = "30d" } = request.data;

    if (!teacher_id) {
      throw new HttpsError("invalid-argument", "Teacher ID is required");
    }

    // Calculate date range
    const now = new Date();
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get wellness reports in timeframe
    const wellnessReports = await db
      .collection("teachers")
      .doc(teacher_id)
      .collection("wellness_reports")
      .where("created_at", ">=", Timestamp.fromDate(startDate))
      .where("status", "==", "analyzed")
      .orderBy("created_at", "desc")
      .get();

    // Process analytics
    const reports = wellnessReports.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString() || null,
    }));

    const analytics = {
      timeframe,
      total_analyses: reports.length,
      critical_alerts: reports.filter((r) => r.critical_alert).length,
      average_wellness:
        reports.length > 0
          ? reports.reduce(
              (sum, r) => sum + (r.wellness_scores?.overall_wellness || 0),
              0
            ) / reports.length
          : 0,
      wellness_trend:
        reports.length > 2
          ? (reports[0].wellness_scores?.overall_wellness || 0) -
            (reports[reports.length - 1].wellness_scores?.overall_wellness || 0)
          : 0,
      reports: reports.slice(0, 20),
    };

    return { success: true, analytics };
  } catch (error) {
    console.error("Wellness analytics fetch failed:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

// 🔧 NEW: Get Wellness Dashboard Data
exports.getWellnessDashboard = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { teacher_id } = request.data;

    if (!teacher_id) {
      throw new HttpsError("invalid-argument", "Teacher ID is required");
    }

    // Call AI service for wellness dashboard
    const wellnessDashboard = await callAgent("/wellness-dashboard", {
      teacher_id: teacher_id,
    });

    return {
      success: true,
      dashboard: wellnessDashboard,
    };
  } catch (error) {
    console.error("Wellness dashboard fetch failed:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

// Add these utility functions if you don't already have them
function extractTextFromResponse(response) {
  if (typeof response === "string") return response;
  if (response && response.response) return response.response;
  if (response && response.message) return response.message;
  if (response && response.text) return response.text;
  return JSON.stringify(response);
}

function extractMetricsFromResponse(response) {
  if (response && response.metrics) return response.metrics;
  return null;
}
