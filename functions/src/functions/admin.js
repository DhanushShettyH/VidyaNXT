// functions/src/functions/admin.js
const { onCall } = require("firebase-functions/v2/https");
const {
  initializeSahayakCollections,
  addSampleContent,
} = require("../utils/initialize-collections");

exports.initializeSahayakData = onCall(async (request) => {
  const { auth } = request;

  // Add admin check if needed
  if (!auth?.uid) {
    throw new Error("Authentication required");
  }

  try {
    await initializeSahayakCollections();
    await addSampleContent();

    return {
      success: true,
      message: "Sahayak data initialized successfully",
    };
  } catch (error) {
    console.error("Initialize Sahayak data error:", error);
    throw new Error(`Failed to initialize data: ${error.message}`);
  }
});

exports.resetSahayakData = onCall(async (request) => {
  const { auth } = request;

  if (!auth?.uid) {
    throw new Error("Authentication required");
  }

  try {
    // Delete existing collections
    const collectionsToDelete = [
      "regional_knowledge",
      "curriculum_standards",
      "simulated_students",
      "sahayak_sessions",
      "content_library",
      "simulation_reports",
    ];

    for (const collectionName of collectionsToDelete) {
      const collection = db.collection(collectionName);
      const snapshot = await collection.get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      if (snapshot.docs.length > 0) {
        await batch.commit();
      }
    }

    // Re-initialize
    await initializeSahayakCollections();
    await addSampleContent();

    return {
      success: true,
      message: "Sahayak data reset successfully",
    };
  } catch (error) {
    console.error("Reset Sahayak data error:", error);
    throw new Error(`Failed to reset data: ${error.message}`);
  }
});
