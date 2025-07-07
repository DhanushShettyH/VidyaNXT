const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const db = admin.firestore();
const {
  getWellnessDashboardData,
  acknowledgeWellnessAlert,
} = require("../services/wellness");
const wellnessAgent = require("../agents/wellness-agent");

// Get enhanced teacher dashboard with wellness data
const getEnhancedTeacherDashboard = onCall(async (request) => {
  try {
    const teacherId = request.data.teacher_id;

    // Get teacher's basic info
    const teacherDoc = await db.collection("teachers").doc(teacherId).get();
    if (!teacherDoc.exists) {
      throw new HttpsError("not-found", "Teacher not found");
    }

    // Get wellness dashboard data
    const wellnessData = await getWellnessDashboardData(teacherId);

    // Get recent challenges
    const recentChallenges = await db
      .collection("challenges")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    // Prepare dashboard data
    const dashboardData = {
      teacher: {
        id: teacherId,
        ...teacherDoc.data(),
      },
      wellness: wellnessData,
      challenges: {
        recent: recentChallenges.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        total_count: recentChallenges.size,
      },
      last_updated: new Date().toISOString(),
    };

    return dashboardData;
  } catch (error) {
    console.error("Dashboard fetch failed:", error);
    throw new HttpsError("internal", error.message);
  }
});

// Acknowledge wellness alert
const acknowledgeWellnessAlertFunction = onCall(async (request) => {
  try {
    const { teacher_id, alert_id } = request.data;

    await acknowledgeWellnessAlert(teacher_id, alert_id);

    return { success: true, message: "Alert acknowledged successfully" };
  } catch (error) {
    console.error("Alert acknowledgment failed:", error);
    throw new HttpsError("internal", error.message);
  }
});

// Get wellness analytics
const getWellnessAnalytics = onCall(async (request) => {
  try {
    const { teacher_id, timeframe = "30d" } = request.data;

    // Calculate date range
    const now = new Date();
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get wellness reports in timeframe
    const wellnessReports = await db
      .collection("teachers")
      .doc(teacher_id)
      .collection("wellness_reports")
      .where("created_at", ">=", new Date(startDate))
      .where("status", "==", "analyzed")
      .orderBy("created_at", "desc")
      .get();

    // Process analytics
    const reports = wellnessReports.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString() || null,
    }));

    const analytics = {
      timeframe,
      total_analyses: reports.length,
      critical_alerts: reports.filter((r) => r.critical_alert).length,
      average_wellness:
        reports.length > 0
          ? reports.reduce(
              (sum, r) => sum + (r.wellness_scores?.overall_wellness || 0),
              0
            ) / reports.length
          : 0,
      wellness_trend:
        reports.length > 2
          ? (reports[0].wellness_scores?.overall_wellness || 0) -
            (reports[reports.length - 1].wellness_scores?.overall_wellness || 0)
          : 0,
      reports: reports.slice(0, 20),
    };

    return { success: true, analytics };
  } catch (error) {
    console.error("Wellness analytics fetch failed:", error);
    throw new HttpsError("internal", error.message);
  }
});

// Get wellness dashboard
const getWellnessDashboard = onCall(async (request) => {
  try {
    const { teacher_id } = request.data;

    // Get wellness dashboard data
    const dashboardData = await getWellnessDashboardData(teacher_id);

    // Generate AI insights
    const insights = await wellnessAgent.getWellnessDashboardSummary(
      teacher_id,
      dashboardData
    );

    return {
      success: true,
      dashboard: {
        ...dashboardData,
        insights,
      },
    };
  } catch (error) {
    console.error("Wellness dashboard fetch failed:", error);
    throw new HttpsError("internal", error.message);
  }
});

module.exports = {
  getEnhancedTeacherDashboard,
  acknowledgeWellnessAlert: acknowledgeWellnessAlertFunction,
  getWellnessAnalytics,
  getWellnessDashboard,
};
