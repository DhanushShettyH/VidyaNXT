const admin = require("firebase-admin");
const { db } = require("../config/firebase-config");
const { FieldValue } = require("firebase-admin/firestore");
const { sendNotification } = require("./notifications");

// Helper function to calculate wellness trend
function calculateWellnessTrend(recentScores, newScore) {
  if (!recentScores || recentScores.length < 3) {
    return "stable";
  }

  const last3Scores = recentScores.slice(-3);
  const avgLast3 =
    last3Scores.reduce((sum, score) => sum + score.overall_wellness, 0) / 3;

  if (newScore.overall_wellness > avgLast3 + 10) {
    return "improving";
  } else if (newScore.overall_wellness < avgLast3 - 10) {
    return "declining";
  } else {
    return "stable";
  }
}

// Send critical wellness alert
async function sendWellnessCriticalAlert(teacherId, analysis) {
  try {
    const alertData = {
      teacher_id: teacherId,
      alert_type: "wellness_critical",
      urgency_level: analysis.urgency_level,
      message:
        "Your recent activity indicates you may need additional support. Please consider the wellness recommendations provided.",
      recommendations: analysis.recommendations || [],
      wellness_scores: analysis.wellness_scores || {},
      created_at: FieldValue.serverTimestamp(),
      acknowledged: false,
    };

    // Store alert in Firestore
    await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_alerts")
      .add(alertData);

    // Send push notification
    await sendNotification(teacherId, {
      title: "Wellness Check - Support Available",
      body: "We noticed you might need some support. Check your wellness recommendations.",
      type: "wellness_alert",
    });

    console.log("Critical wellness alert sent to teacher:", teacherId);
  } catch (error) {
    console.error("Failed to send wellness alert:", error);
  }
}

// Update teacher wellness summary
async function updateTeacherWellnessSummary(teacherId, analysis) {
  try {
    const summaryRef = db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_summary")
      .doc("current");

    const currentSummary = await summaryRef.get();

    if (currentSummary.exists) {
      const data = currentSummary.data();

      // Update recent scores (keep last 10)
      const recentScores = data.recent_scores || [];
      recentScores.push({
        ...analysis.wellness_scores,
        timestamp: new Date().toISOString(),
        analysis_type: analysis.analysis_type,
      });

      // Keep only last 10 scores
      const updatedScores = recentScores.slice(-10);

      // Calculate wellness trend
      const wellnessTrend = calculateWellnessTrend(
        recentScores,
        analysis.wellness_scores
      );

      // Update summary
      await summaryRef.update({
        last_analysis: analysis,
        last_updated: FieldValue.serverTimestamp(),
        total_analyses: (data.total_analyses || 0) + 1,
        critical_alerts_count:
          (data.critical_alerts_count || 0) + (analysis.critical_alert ? 1 : 0),
        wellness_trend: wellnessTrend,
        recent_scores: updatedScores,
        avg_wellness_score:
          updatedScores.reduce(
            (sum, score) => sum + score.overall_wellness,
            0
          ) / updatedScores.length,
      });
    } else {
      // Create new summary
      await summaryRef.set({
        teacher_id: teacherId,
        last_analysis: analysis,
        created_at: FieldValue.serverTimestamp(),
        last_updated: FieldValue.serverTimestamp(),
        total_analyses: 1,
        critical_alerts_count: analysis.critical_alert ? 1 : 0,
        wellness_trend: "stable",
        recent_scores: [
          {
            ...analysis.wellness_scores,
            timestamp: new Date().toISOString(),
            analysis_type: analysis.analysis_type,
          },
        ],
        avg_wellness_score: analysis.wellness_scores?.overall_wellness || 0,
      });
    }

    console.log("Wellness summary updated for teacher:", teacherId);
  } catch (error) {
    console.error("Failed to update wellness summary:", error);
  }
}

// Create wellness report
async function createWellnessReport(
  teacherId,
  analysisType,
  content,
  sessionData = {}
) {
  try {
    const reportData = {
      teacher_id: teacherId,
      analysis_type: analysisType,
      content: content,
      session_data: sessionData,
      created_at: FieldValue.serverTimestamp(),
      status: "pending",
    };

    const reportRef = await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_reports")
      .add(reportData);

    console.log("Wellness report created:", reportRef.id);
    return reportRef.id;
  } catch (error) {
    console.error("Failed to create wellness report:", error);
    throw error;
  }
}

// Get wellness dashboard data
async function getWellnessDashboardData(teacherId) {
  try {
    // Get wellness summary
    const wellnessSummary = await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_summary")
      .doc("current")
      .get();

    // Get unacknowledged wellness alerts
    const wellnessAlerts = await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_alerts")
      .where("acknowledged", "==", false)
      .orderBy("created_at", "desc")
      .limit(5)
      .get();

    // Get recent wellness reports
    const recentWellnessReports = await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_reports")
      .where("status", "==", "analyzed")
      .orderBy("created_at", "desc")
      .limit(10)
      .get();

    return {
      summary: wellnessSummary.exists ? wellnessSummary.data() : null,
      unacknowledged_alerts: wellnessAlerts.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || null,
      })),
      recent_reports: recentWellnessReports.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || null,
      })),
    };
  } catch (error) {
    console.error("Failed to get wellness dashboard data:", error);
    throw error;
  }
}

// Acknowledge wellness alert
async function acknowledgeWellnessAlert(teacherId, alertId) {
  try {
    await db
      .collection("teachers")
      .doc(teacherId)
      .collection("wellness_alerts")
      .doc(alertId)
      .update({
        acknowledged: true,
        acknowledged_at: FieldValue.serverTimestamp(),
      });

    console.log("Wellness alert acknowledged:", alertId);
  } catch (error) {
    console.error("Failed to acknowledge wellness alert:", error);
    throw error;
  }
}

module.exports = {
  calculateWellnessTrend,
  sendWellnessCriticalAlert,
  updateTeacherWellnessSummary,
  createWellnessReport,
  getWellnessDashboardData,
  acknowledgeWellnessAlert,
};
