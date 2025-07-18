const admin = require("firebase-admin");

// Initialize Firebase Admin with settings to ignore undefined properties
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Set Firestore settings to ignore undefined properties
db.settings({
  ignoreUndefinedProperties: true,
});

module.exports = { db, admin };
