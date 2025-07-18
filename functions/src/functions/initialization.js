// functions/src/functions/initialization.js
const { onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const {
  initializeSahayakCollections,
  addSampleContent,
} = require("../utils/initialize-collections");

setGlobalOptions({ region: "us-central1" });

exports.initializeSahayakCollections = onCall(async (request, context) => {
  try {
    if (!context.auth) {
      throw new Error("Authentication required");
    }

    console.log("Starting Sahayak collections initialization...");

    await initializeSahayakCollections();
    await addSampleContent();

    console.log("Sahayak collections initialized successfully!");

    return {
      success: true,
      message: "Sahayak collections initialized successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error initializing Sahayak collections:", error);
    throw new Error(`Initialization failed: ${error.message}`);
  }
});
