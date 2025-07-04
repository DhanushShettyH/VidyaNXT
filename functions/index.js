const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { FieldValue } = require("firebase-admin/firestore");

// Initialize admin SDK
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Agent base URL - use environment variable in production
const AGENT_BASE_URL = "https://1cf9-35-234-17-86.ngrok-free.app";

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
      teacherId, // now using the passed-in doc ID
      text: text.trim(),
      urgency,
      createdAt: new Date().toISOString(),
      status: "POSTED",
      responses: [],
    };

    const ref = await db.collection("challenges").add(challenge);

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

// 3️⃣ Peer Matching Agent
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

      console.log("---------------------------");
      console.log("Profile found:", profile);
      console.log("---------------------------");

      if (!profile) {
        console.log(`⚠️ No profile found for teacher ${teacherId}`);

        // Fallback: Get basic teacher data using doc ID
        const teacherSnap = await db
          .collection("teachers")
          .doc(teacherId)
          .get();
        const basicProfile = teacherSnap.data();

        console.log("---------------------------");
        console.log("Basic profile:", basicProfile, "/ Doc ID:", teacherId);
        console.log("---------------------------");

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

      const matches = await callAgent("/match", {
        challengeId,
        teacherProfile: profile,
        classification,
      });

      await db
        .collection("challenges")
        .doc(challengeId)
        .update({
          matches: matches || [],
          status: "MATCHED",
          matchedAt: new Date().toISOString(),
        });

      console.log(
        `✅ Matching Agent: Found ${
          matches?.length || 0
        } matches for ${challengeId}`
      );
    } catch (error) {
      console.error(
        `❌ Matching Agent failed for ${challengeId}:`,
        error.message
      );

      await db.collection("challenges").doc(challengeId).update({
        matchingError: error.message,
        status: "MATCHING_FAILED",
      });
    }
  }
);

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
