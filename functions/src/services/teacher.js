const admin = require("firebase-admin");
const { COLLECTIONS, STATUS } = require("../config/constants");

const db = admin.firestore();

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

// Update teacher login info
async function updateTeacherLogin(teacherId, loginData) {
  const teacherRef = db.collection(COLLECTIONS.TEACHERS).doc(teacherId);

  await teacherRef.update({
    lastLoginAt: new Date().toISOString(),
    loginCount: admin.firestore.FieldValue.increment(1),
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

module.exports = {
  createTeacher,
  findTeacherByName,
  updateTeacherLogin,
  getTeacherProfile,
};
