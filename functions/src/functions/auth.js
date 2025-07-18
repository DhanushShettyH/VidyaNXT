const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  validateTeacherRegistration,
  validateTeacherLogin,
} = require("../utils/validation");
const {
  createTeacher,
  findTeacherByName,
  updateTeacherLogin,
  findTeacherByUid,
} = require("../services/teacher");


// Register teacher function
const registerTeacher = onCall(async (request) => {
  try {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    // Validate input data
    const validatedData = validateTeacherRegistration(request.data);

    // Add owner UID
    const teacherData = {
      ...validatedData,
      ownerUid: request.auth.uid,
    };

    // Create teacher document
    const teacherId = await createTeacher(teacherData);

    return {
      success: true,
      teacherId: teacherId,
      message: "Teacher registered successfully",
    };
  } catch (error) {
    console.error("❌ Registration error:", error.message);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", `Registration failed: ${error.message}`);
  }
});

// Login teacher function
const loginTeacher = onCall(async (request) => {
  console.log("🔥 Login attempt started");

  try {
    // Ensure user is authenticated
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    console.log("🔍 Looking for teacher with UID:", uid);

    // Find teacher by UID
    const teacher = await findTeacherByUid(uid);

    if (!teacher) {
      console.log("❌ No teacher found with UID:", uid);
      return {
        success: false,
        message: "No teacher profile found for this account.",
      };
    }

    console.log("✅ Teacher found:", {
      id: teacher.id,
      name: teacher.displayName,
    });

    // Update login information
    await updateTeacherLogin(teacher.id);

    return {
      success: true,
      message: "Login successful",
      teacher: {
        id: teacher.id,
        displayName: teacher.displayName,
        grades: teacher.grades || [],
        location: teacher.location || "",
        experienceYears: teacher.experienceYears || 0,
        createdAt: teacher.createdAt,
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

module.exports = {
  registerTeacher,
  loginTeacher,
};
