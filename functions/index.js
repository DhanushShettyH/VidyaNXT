const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const fetch = require("node-fetch"); // ← polyfill

// Initialize admin SDK
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

exports.registerTeacher = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const { displayName, grades, location, experienceYears } = request.data;
    if (!displayName || !grades || !location || experienceYears == null) {
      throw new HttpsError("invalid-argument", "Missing fields");
    }

    // 1) Build your doc payload
    const docData = {
      displayName,
      grades,
      location,
      experienceYears,
      ownerUid: request.auth.uid, // track who created it
      createdAt: new Date().toISOString(), // Simple timestamp that always works
    };

    // 2) Create a brand‑new doc with an auto‑ID ----> .add() method do
    const teacherRef = await db.collection("teachers").add(docData);

    // 3) Return that ID so the frontend can store/sub to it
    return {
      success: true,
      teacherId: teacherRef.id,
    };
  } catch (error) {
    console.error("❌ Error details:", error.message);
    throw new HttpsError(
      "internal",
      `Failed to register teacher: ${error.message}`
    );
  }
});

// ADD THIS NEW FUNCTION FOR LOGIN
exports.loginTeacher = onCall(async (request) => {
  console.log("🔥 Login attempt started");
  console.log(
    "🔥 Auth context:",
    request.auth
      ? {
          uid: request.auth.uid,
          token: request.auth.token ? "present" : "missing",
        }
      : "No auth context"
  );
  console.log("🔥 Request data:", request.data);

  try {
    // Check if user is authenticated
    if (!request.auth) {
      console.log("❌ No authentication context");
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { displayName } = request.data;

    if (!displayName || !displayName.trim()) {
      console.log("❌ No display name provided");
      throw new HttpsError("invalid-argument", "Display name is required");
    }

    const trimmedName = displayName.trim();
    console.log("🔍 Searching for teacher with name:", trimmedName);

    // Query Firestore to find teacher with matching display name
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

    // Get the first matching teacher (should be unique)
    const teacherDoc = snapshot.docs[0];
    const teacherData = teacherDoc.data();

    console.log("✅ Teacher found:", {
      id: teacherDoc.id,
      name: teacherData.displayName,
      createdAt: teacherData.createdAt,
    });

    // Update last login timestamp and login count
    const currentLoginCount = teacherData.loginCount || 0;
    await teacherDoc.ref.update({
      lastLoginAt: new Date().toISOString(),
      loginCount: currentLoginCount + 1,
    });

    // Return success with teacher data
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

exports.postChallenge = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  const { text } = req.data;
  if (!text || !text.trim())
    throw new HttpsError("invalid-argument", "Challenge text is required");

  const challenge = {
    ownerUid: req.auth.uid,
    teacherId: req.auth.uid,
    text: text.trim(),
    createdAt: new Date().toISOString(), // Simple timestamp that always works
    status: "POSTED",
  };

  // auto‑ID
  const ref = await db.collection("challenges").add(challenge);
  return { success: true, challengeId: ref.id };
});

//! ------------------------------Ai Agents----------------------------------
// ! Profile agent
const PROFILE_AGENT_URL = "https://9b3e-35-196-150-50.ngrok-free.app/profile";
//* await db.collection('teachers').doc(request.auth.uid).set(docData);
//* step 1: when above record entered, it trigger below code also .
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
    const res = await fetch(`${PROFILE_AGENT_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const profileResult = await res.json();
    await db.collection("teacherProfiles").doc(id).set(profileResult);
    console.log("✅ Stored profile for", id);
  } catch (err) {
    console.error("❌ Agent call failed:", err);
  }
});

//! Challenge Classification Agent
const CLASSIFY_AGENT_URL = "https://9b3e-35-196-150-50.ngrok-free.app/classify";
exports.classificationAgent = onDocumentCreated(
  "challenges/{challengeId}",
  async (e) => {
    const challengeId = e.params.challengeId;
    const data = e.data.data();

    // call your classification model
    const res = await fetch(`${CLASSIFY_AGENT_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: challengeId, text: data.text }),
    });
    const { type, confidence } = await res.json();

    // update doc with classification
    await db.collection("challenges").doc(challengeId).update({
      classification: { type, confidence },
      status: "CLASSIFIED",
    });
  }
);

// ! Peer Matching agent
const MATCH_AGENT_URL = "https://9b3e-35-196-150-50.ngrok-free.app/match";
exports.matchingAgent = onDocumentUpdated(
  "challenges/{challengeId}",
  async (e) => {
    const before = e.data.before.data();
    const after = e.data.after.data();
    const challengeId = e.params.challengeId; // ← ADD THIS LINE

    // only run when status flips to CLASSIFIED
    if (before.status !== "CLASSIFIED" || after.status !== "CLASSIFIED") return;

    const { classification, teacherId } = after;

    // fetch teacherProfiles to supply to your match agent:
    const profileSnap = await db
      .collection("teacherProfiles")
      .doc(teacherId)
      .get();
    const profile = profileSnap.data();

    // call match agent
    const res = await fetch(`${MATCH_AGENT_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId, // now defined
        teacherProfile: profile,
        classification,
      }),
    });

    const matches = await res.json();

    // write matches + flip status
    await db.collection("challenges").doc(challengeId).update({
      matches,
      status: "MATCHED",
    });

    console.log(
      `✅ Matching Agent: wrote ${matches.length} matches for ${challengeId}`
    );
  }
);

// ! Connect Orchestration agent
const ORCHESTRATE_AGENT_URL =
  "https://9b3e-35-196-150-50.ngrok-free.app/orchestrate";
exports.connectionOrchestrationAgent = onDocumentUpdated(
  "challenges/{challengeId}",
  async (e) => {
    const before = e.data.before.data();
    const after = e.data.after.data();
    const challengeId = e.params.challengeId; // ← ADD THIS TOO

    if (before.status !== "MATCHED" || after.status !== "MATCHED") return;

    const { matches, teacherId, text } = after;

    const res = await fetch(`${ORCHESTRATE_AGENT_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId, // defined
        teacherId,
        matches,
        text,
      }),
    });

    const { connectionLink } = await res.json();

    await db.collection("challenges").doc(challengeId).update({
      connectionLink,
      status: "ORCHESTRATED",
    });

    console.log(`✅ Orchestration Agent: created link for ${challengeId}`);
  }
);
