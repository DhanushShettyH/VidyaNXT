// firebaseWellnessService.js
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

// Service class to handle all wellness-related Firebase function calls
export class WellnessService {
  // Dashboard Functions
  static async getEnhancedTeacherDashboard(teacherId) {
    try {
      const getEnhancedTeacherDashboard = httpsCallable(
        functions,
        "getEnhancedTeacherDashboard"
      );
      const result = await getEnhancedTeacherDashboard({
        teacher_id: teacherId,
      });
      return result.data;
    } catch (error) {
      console.error("Error fetching enhanced dashboard:", error);
      throw error;
    }
  }

  static async getWellnessDashboard(teacherId) {
    try {
      const getWellnessDashboard = httpsCallable(
        functions,
        "getWellnessDashboard"
      );
      const result = await getWellnessDashboard({ teacher_id: teacherId });
      return result.data;
    } catch (error) {
      console.error("Error fetching wellness dashboard:", error);
      throw error;
    }
  }

  // Analytics Functions
  static async getWellnessAnalytics(teacherId, timeframe = "30d") {
    try {
      const getWellnessAnalytics = httpsCallable(
        functions,
        "getWellnessAnalytics"
      );
      const result = await getWellnessAnalytics({
        teacher_id: teacherId,
        timeframe: timeframe,
      });
      return result.data;
    } catch (error) {
      console.error("Error fetching wellness analytics:", error);
      throw error;
    }
  }

  // Alert Functions
  static async acknowledgeWellnessAlert(teacherId, alertId) {
    try {
      const acknowledgeWellnessAlert = httpsCallable(
        functions,
        "acknowledgeWellnessAlert"
      );
      await acknowledgeWellnessAlert({
        teacher_id: teacherId,
        alert_id: alertId,
      });
    } catch (error) {
      console.error("Error acknowledging wellness alert:", error);
      throw error;
    }
  }

  // Notification Functions
  static async getWellnessNotifications(teacherId) {
    try {
      const getWellnessNotifications = httpsCallable(
        functions,
        "getWellnessNotifications"
      );
      const result = await getWellnessNotifications({ teacher_id: teacherId });
      return result.data;
    } catch (error) {
      console.error("Error fetching wellness notifications:", error);
      throw error;
    }
  }

  static async markNotificationAsRead(teacherId, notificationId) {
    try {
      const markNotificationRead = httpsCallable(
        functions,
        "markNotificationAsRead"
      );
      await markNotificationRead({
        teacher_id: teacherId,
        notification_id: notificationId,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  static async markAllNotificationsAsRead(teacherId) {
    try {
      const markAllNotificationsRead = httpsCallable(
        functions,
        "markAllNotificationsAsRead"
      );
      await markAllNotificationsRead({ teacher_id: teacherId });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  // Recommendation Functions
  static async getWellnessRecommendations(teacherId) {
    try {
      const getWellnessRecommendations = httpsCallable(
        functions,
        "getWellnessRecommendations"
      );
      const result = await getWellnessRecommendations({
        teacher_id: teacherId,
      });
      return result.data;
    } catch (error) {
      console.error("Error fetching wellness recommendations:", error);
      throw error;
    }
  }

  static async markRecommendationCompleted(teacherId, recommendationId) {
    try {
      const markRecommendationCompleted = httpsCallable(
        functions,
        "markRecommendationCompleted"
      );
      await markRecommendationCompleted({
        teacher_id: teacherId,
        recommendation_id: recommendationId,
      });
    } catch (error) {
      console.error("Error marking recommendation as completed:", error);
      throw error;
    }
  }

  static async dismissRecommendation(teacherId, recommendationId) {
    try {
      const dismissRecommendation = httpsCallable(
        functions,
        "dismissRecommendation"
      );
      await dismissRecommendation({
        teacher_id: teacherId,
        recommendation_id: recommendationId,
      });
    } catch (error) {
      console.error("Error dismissing recommendation:", error);
      throw error;
    }
  }

  // Metrics Functions
  static async getWellnessMetrics(teacherId, timeframe = "30d") {
    try {
      const getWellnessMetrics = httpsCallable(functions, "getWellnessMetrics");
      const result = await getWellnessMetrics({
        teacher_id: teacherId,
        timeframe: timeframe,
      });
      return result.data;
    } catch (error) {
      console.error("Error fetching wellness metrics:", error);
      throw error;
    }
  }

  // Utility Functions
  static async refreshWellnessData(teacherId) {
    try {
      const refreshWellnessData = httpsCallable(
        functions,
        "refreshWellnessData"
      );
      const result = await refreshWellnessData({ teacher_id: teacherId });
      return result.data;
    } catch (error) {
      console.error("Error refreshing wellness data:", error);
      throw error;
    }
  }
}

// Export individual functions for backward compatibility
export const {
  getEnhancedTeacherDashboard,
  getWellnessDashboard,
  getWellnessAnalytics,
  acknowledgeWellnessAlert,
  getWellnessNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getWellnessRecommendations,
  markRecommendationCompleted,
  dismissRecommendation,
  getWellnessMetrics,
  refreshWellnessData,
} = WellnessService;
