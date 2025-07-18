const admin = require("firebase-admin");
const { db } = require("../config/firebase-config");

// Send notification to teacher
async function sendNotification(teacherId, notificationData) {
  try {
    // Get teacher's FCM token
    const teacherDoc = await db.collection("teachers").doc(teacherId).get();

    if (!teacherDoc.exists) {
      console.log("Teacher not found:", teacherId);
      return;
    }

    const teacherData = teacherDoc.data();
    const fcmToken = teacherData.fcm_token;

    if (!fcmToken) {
      console.log("No FCM token for teacher:", teacherId);
      return;
    }

    // Send notification using Firebase Admin SDK
    const message = {
      token: fcmToken,
      notification: {
        title: notificationData.title,
        body: notificationData.body,
      },
      data: {
        type: notificationData.type || "general",
        teacher_id: teacherId,
      },
    };

    await admin.messaging().send(message);
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Notification failed:", error);
  }
}

module.exports = {
  sendNotification,
};
