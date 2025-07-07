const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const ProfileAgent = require("../agents/profile-agent");
const { COLLECTIONS } = require("../config/constants");

const db = admin.firestore();

// Profile processing trigger
const profileAgent = onDocumentCreated(
  "teachers/{teacherId}",
  async (event) => {
    const teacherData = event.data.data();
    const teacherId = event.params.teacherId;

    const payload = {
      id: teacherId,
      name: teacherData.displayName,
      grades: teacherData.grades,
      location: teacherData.location,
      experience: teacherData.experienceYears,
    };

    try {
      console.log(`🤖 Profile Agent: Processing teacher ${teacherId}`);

      // Initialize profile agent
      const profileAgent = new ProfileAgent();

      // Process the profile
      const profileResult = await profileAgent.processProfile(payload);

      // Store the processed profile
      await db
        .collection(COLLECTIONS.TEACHER_PROFILES)
        .doc(teacherId)
        .set({
          ...profileResult,
          processedAt: new Date().toISOString(),
        });

      console.log(`✅ Profile Agent: Stored profile for ${teacherId}`);

      // Update network statistics (simple version)
      await updateNetworkStats(teacherData);
    } catch (error) {
      console.error(`❌ Profile Agent failed for ${teacherId}:`, error.message);

      // Store error info for debugging
      await db.collection(COLLECTIONS.TEACHER_PROFILES).doc(teacherId).set({
        error: error.message,
        processingFailed: true,
        processedAt: new Date().toISOString(),
      });
    }
  }
);

// Update network statistics
async function updateNetworkStats(teacherData) {
  try {
    const statsRef = db.collection(COLLECTIONS.NETWORK_STATS).doc("global");

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(statsRef);

      let stats = {
        totalTeachers: 0,
        gradeCoverage: {},
        locationCoverage: {},
      };

      if (doc.exists) {
        stats = doc.data();
      }

      // Update totals
      stats.totalTeachers += 1;

      // Update grade coverage
      for (const grade of teacherData.grades) {
        stats.gradeCoverage[grade] = (stats.gradeCoverage[grade] || 0) + 1;
      }

      // Update location coverage
      const location = teacherData.location;
      stats.locationCoverage[location] =
        (stats.locationCoverage[location] || 0) + 1;

      // Update timestamp
      stats.lastUpdated = new Date().toISOString();

      transaction.set(statsRef, stats);
    });

    console.log("✅ Network stats updated");
  } catch (error) {
    console.error("❌ Failed to update network stats:", error);
  }
}

module.exports = {
  profileAgent,
};
