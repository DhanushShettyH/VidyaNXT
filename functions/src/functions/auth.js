const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  validateTeacherRegistration,
  validateTeacherLogin,
} = require("../utils/validation");
const {
  createTeacher,
  findTeacherByName,
  updateTeacherLogin,
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
    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Validate input data
    const { displayName } = validateTeacherLogin(request.data);

    console.log("🔍 Searching for teacher with name:", displayName);

    // Find teacher by name
    const teacher = await findTeacherByName(displayName);

    if (!teacher) {
      console.log("❌ No teacher found with name:", displayName);
      return {
        success: false,
        message: "Teacher not found. Please check your name or register first.",
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
