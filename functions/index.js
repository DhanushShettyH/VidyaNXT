// functions/index.js
const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require('firebase-admin');

// Initialize admin SDK
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

exports.registerTeacher = onCall(async (request) => {
  console.log('🔥 Auth context:', request.auth);
  console.log('🔥 Request data:', request.data);
  console.log('🔥 Auth UID:', request.auth?.uid);
  console.log('🔥 Auth token info:', {
    uid: request.auth?.uid,
    token: request.auth?.token ? 'present' : 'missing'
  });
  
  // Check authentication
  if (!request.auth) {
    console.log('❌ No auth context found');
    throw new HttpsError('unauthenticated', 'User must be signed in');
  }

  const { displayName, grades, location, experienceYears } = request.data;
  
  // Validate inputs
  if (!displayName || !grades || !location || experienceYears == null) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    // Write to Firestore under document with UID
    const docData = {
      displayName,
      grades,
      location,
      experienceYears,
      createdAt: new Date().toISOString(), // Simple timestamp that always works
    };

    console.log('📝 Writing document data:', docData);
    
    await db
      .collection('teachers')
      .doc(request.auth.uid)
      .set(docData);

    console.log('✅ Teacher registered successfully for UID:', request.auth.uid);
    return { success: true, uid: request.auth.uid };
  } catch (error) {
    console.error('❌ Error registering teacher:', error);
    console.error('❌ Error details:', error.message);
    throw new HttpsError('internal', `Failed to register teacher: ${error.message}`);
  }
});

// ADD THIS NEW FUNCTION FOR LOGIN
exports.loginTeacher = onCall(async (request) => {
  console.log('🔥 Login attempt started');
  console.log('🔥 Auth context:', request.auth ? {
    uid: request.auth.uid,
    token: request.auth.token ? 'present' : 'missing'
  } : 'No auth context');
  console.log('🔥 Request data:', request.data);

  try {
    // Check if user is authenticated
    if (!request.auth) {
      console.log('❌ No authentication context');
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { displayName } = request.data;

    if (!displayName || !displayName.trim()) {
      console.log('❌ No display name provided');
      throw new HttpsError('invalid-argument', 'Display name is required');
    }

    const trimmedName = displayName.trim();
    console.log('🔍 Searching for teacher with name:', trimmedName);

    // Query Firestore to find teacher with matching display name
    const teachersRef = db.collection('teachers');
    const snapshot = await teachersRef.where('displayName', '==', trimmedName).get();

    if (snapshot.empty) {
      console.log('❌ No teacher found with name:', trimmedName);
      return {
        success: false,
        message: 'Teacher not found. Please check your name or register first.'
      };
    }

    // Get the first matching teacher (should be unique)
    const teacherDoc = snapshot.docs[0];
    const teacherData = teacherDoc.data();

    console.log('✅ Teacher found:', {
      id: teacherDoc.id,
      name: teacherData.displayName,
      createdAt: teacherData.createdAt
    });

    // Update last login timestamp and login count
    const currentLoginCount = teacherData.loginCount || 0;
    await teacherDoc.ref.update({
      lastLoginAt: new Date().toISOString(),
      loginCount: currentLoginCount + 1
    });

    // Return success with teacher data
    return {
      success: true,
      message: 'Login successful',
      teacher: {
        id: teacherDoc.id,
        displayName: teacherData.displayName,
        grades: teacherData.grades || [],
        location: teacherData.location || '',
        experienceYears: teacherData.experienceYears || 0,
        createdAt: teacherData.createdAt,
        lastLoginAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Error in loginTeacher:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Failed to login teacher', {
      details: error.message
    });
  }
});