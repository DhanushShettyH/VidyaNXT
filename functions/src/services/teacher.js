const admin = require("firebase-admin");
const { COLLECTIONS, STATUS } = require("../config/constants");
const { FieldValue } = require("firebase-admin/firestore");

const { db } = require("../config/firebase-config");

// Create teacher document
async function createTeacher(teacherData) {
  const docData = {
    ...teacherData,
    createdAt: new Date().toISOString(),
    status: STATUS.REGISTERED,
    lastActiveAt: new Date().toISOString(),
    loginCount: 0,
  };

  const teacherRef = await db.collection(COLLECTIONS.TEACHERS).add(docData);
  return teacherRef.id;
}

// Find teacher by display name
async function findTeacherByName(displayName) {
  const snapshot = await db
    .collection(COLLECTIONS.TEACHERS)
    .where("displayName", "==", displayName)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

// services/teacher.js

async function findTeacherByUid(uid) {
  const snapshot = await db
    .collection(COLLECTIONS.TEACHERS)
    .where("ownerUid", "==", uid)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

// Update teacher login info
async function updateTeacherLogin(teacherId, loginData) {
  const teacherRef = db.collection(COLLECTIONS.TEACHERS).doc(teacherId);

  await teacherRef.update({
    lastLoginAt: new Date().toISOString(),
    loginCount: FieldValue.increment(1),
    status: STATUS.ACTIVE,
    ...loginData,
  });
}

// Get teacher profile
async function getTeacherProfile(teacherId) {
  const doc = await db
    .collection(COLLECTIONS.TEACHER_PROFILES)
    .doc(teacherId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return doc.data();
}

/**
 * Helper function to get teacher profile <<POST CHALLENGE>>
 */
async function getTeacherProfile_(teacherId) {
  try {
    const profileSnap = await db
      .collection("teacherProfiles")
      .doc(teacherId)
      .get();

    if (profileSnap.exists) {
      return profileSnap.data();
    }
    // Fallback: Get basic teacher data
    const teacherSnap = await db.collection("teachers").doc(teacherId).get();
    const basicProfile = teacherSnap.data();
    if (basicProfile) {
      return {
        teacherId,
        matchingCriteria: {
          grades: basicProfile.grades || [],
          location: basicProfile.location || "",
          experienceLevel:
            basicProfile.experienceYears < 3 ? "novice" : "experienced",
        },
      };
    }
    return { teacherId };
  } catch (error) {
    console.error(`Error getting teacher profile for ${teacherId}:`, error);
    // logger.error(`Error getting teacher profile for ${teacherId}:`, error);
    return { teacherId };
  }
}

module.exports = {
  createTeacher,
  findTeacherByName,
  findTeacherByUid,
  updateTeacherLogin,
  getTeacherProfile,
  getTeacherProfile_,
};
