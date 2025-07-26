const { HttpsError } = require("firebase-functions/v2/https");

// Teacher registration validation
function validateTeacherRegistration(data) {
  const { displayName, grades, location, experienceYears, expertise } = data;

  if (!displayName?.trim()) {
    throw new HttpsError("invalid-argument", "Display name is required");
  }

  if (!Array.isArray(grades) || grades.length === 0) {
    throw new HttpsError("invalid-argument", "At least one grade is required");
  }

  if (!location?.trim()) {
    throw new HttpsError("invalid-argument", "Location is required");
  }

  if (typeof experienceYears !== "number" || experienceYears < 0) {
    throw new HttpsError("invalid-argument", "Valid experience years required");
  }

  return {
    displayName: displayName.trim(),
    grades: grades.filter((g) => g && g.trim()),
    location: location.trim(),
    experienceYears,
    expertise,
  };
}

// Teacher login validation
function validateTeacherLogin(data) {
  const { displayName } = data;

  if (!displayName?.trim()) {
    throw new HttpsError("invalid-argument", "Display name is required");
  }

  return {
    displayName: displayName.trim(),
  };
}

module.exports = {
  validateTeacherRegistration,
  validateTeacherLogin,
};
