const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
require("dotenv").config();

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Import all function modules
const authFunctions = require("./src/functions/auth");
const teacherFunctions = require("./src/functions/teacher");
const profileFunctions = require("./src/functions/profile");
const triggerFunctions = require("./src/functions/triggers");

// Export all functions
module.exports = {
  // Auth functions
  ...authFunctions,

  // Teacher functions
  ...teacherFunctions,

  // Profile functions
  ...profileFunctions,

  // Trigger functions
  ...triggerFunctions,
};
