const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
require("dotenv").config();

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Import all function modules
const authFunctions = require("./src/functions/auth");
const triggerFunctions = require("./src/functions/triggers");

// =============================================================================
// CHALLENGE FUNCTIONS
// =============================================================================
const challengeFunction = require("./src/functions/challenge");

const chatFunctions = require("./src/functions/chat");

const wellnessFunctions = require("./src/functions/wellness");

const sahayakFunction = require("./src/functions/sahayak");

const feedbackFunction = require("./src/functions/feedback");

const trainingFunction = require("./src/functions/training");

// Export all functions
module.exports = {
  // Auth functions
  ...authFunctions,

  // Trigger functions
  ...triggerFunctions,

  // Challenge functions
  ...challengeFunction,

  ...chatFunctions,

  ...wellnessFunctions,

  ...sahayakFunction,

  ...feedbackFunction,

  ...trainingFunction,
};
