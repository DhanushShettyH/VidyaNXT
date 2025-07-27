// const { onCall, HttpsError } = require("firebase-functions/v2/https");
// const { db } = require("../config/firebase-config");
// const { generateText } = require("../config/gemini");
// const {
//   sanitizeForFirestore,
//   parseGeminiResponse,
// } = require("../utils/helpers");

// // Create feedback submission function
// exports.submitWeeklyFeedback = onCall(async (request) => {
//   try {
//     const { teacherId, feedback, isWeekend } = request.data;

//     if (!teacherId || !feedback) {
//       throw new HttpsError(
//         "invalid-argument",
//         "Teacher ID and feedback are required"
//       );
//     }

//     // Generate Gemini analysis while preserving original feedback
//     const analysisPrompt = `
//     Analyze this teacher feedback while preserving the original meaning and emotion:

//     Original feedback: "${feedback}"

//     Please provide a JSON response with:
//     {
//       "sentiment": "positive/neutral/negative",
//       "keyThemes": ["theme1", "theme2", ...],
//       "emotionalState": "excited/frustrated/overwhelmed/satisfied/stressed/content",
//       "suggestedSupport": ["suggestion1", "suggestion2", ...],
//       "teachingChallenges": ["challenge1", "challenge2", ...],
//       "positiveHighlights": ["highlight1", "highlight2", ...],
//       "originalIntent": "What the teacher was really trying to convey",
//       "confidenceScore": 0.8
//     }

//     Keep the analysis supportive and understanding. Don't alter the original meaning.
//     `;

//     let geminiAnalysis = {};
//     try {
//       const analysisResponse = await generateText(analysisPrompt);
//       geminiAnalysis = parseGeminiResponse(analysisResponse);
//     } catch (error) {
//       console.error("Gemini analysis failed:", error);
//       geminiAnalysis = {
//         sentiment: "neutral",
//         keyThemes: [],
//         emotionalState: "unknown",
//         originalIntent: "Analysis unavailable",
//         confidenceScore: 0.1,
//       };
//     }

//     // Create feedback document
//     const feedbackData = {
//       teacherId,
//       originalFeedback: feedback, // PRESERVE ORIGINAL
//       submittedAt: new Date().toISOString(),
//       isWeekendSubmission: isWeekend || false,
//       weekOf: getWeekStart(new Date()),

//       // Gemini analysis (separate from original)
//       analysis: {
//         ...geminiAnalysis,
//         analyzedAt: new Date().toISOString(),
//         model: "gemini-1.5-flash",
//       },

//       // Metadata
//       status: "submitted",
//       sharedWithCommunity: true,
//       anonymized: false,
//     };

//     // Store in feedback collection
//     const feedbackRef = await db
//       .collection("community_feedback")
//       .add(sanitizeForFirestore(feedbackData));

//     // Update teacher's feedback summary
//     await updateTeacherFeedbackSummary(teacherId, feedbackData);

//     return {
//       success: true,
//       feedbackId: feedbackRef.id,
//       analysis: geminiAnalysis,
//     };
//   } catch (error) {
//     console.error("Submit feedback error:", error);
//     throw new HttpsError("internal", "Failed to submit feedback");
//   }
// });

// // Helper function to get week start date
// function getWeekStart(date) {
//   const d = new Date(date);
//   const day = d.getDay();
//   const diff = d.getDate() - day;
//   return new Date(d.setDate(diff)).toISOString().split("T")[0];
// }

// // Update teacher's feedback summary
// async function updateTeacherFeedbackSummary(teacherId, feedbackData) {
//   const summaryRef = db
//     .collection("teachers")
//     .doc(teacherId)
//     .collection("feedback_summary")
//     .doc("current");

//   try {
//     const summary = await summaryRef.get();
//     const existingData = summary.exists ? summary.data() : {};

//     const updatedSummary = {
//       teacherId,
//       lastFeedbackAt: feedbackData.submittedAt,
//       totalFeedbacks: (existingData.totalFeedbacks || 0) + 1,
//       recentSentiments: [
//         ...(existingData.recentSentiments || []).slice(-4), // Keep last 4
//         {
//           sentiment: feedbackData.analysis.sentiment,
//           emotionalState: feedbackData.analysis.emotionalState,
//           date: feedbackData.submittedAt,
//         },
//       ],
//       weeklyEngagement: {
//         ...(existingData.weeklyEngagement || {}),
//         [feedbackData.weekOf]: true,
//       },
//       lastUpdated: new Date().toISOString(),
//     };

//     await summaryRef.set(updatedSummary);
//   } catch (error) {
//     console.error("Failed to update feedback summary:", error);
//   }
// }

// // Get community feedback for display
// exports.getCommunityFeedback = onCall(async (request) => {
//   try {
//     const { limit = 10, lastWeek } = request.data;

//     let query = db
//       .collection("community_feedback")
//       .where("sharedWithCommunity", "==", true)
//       .orderBy("submittedAt", "desc")
//       .limit(limit);

//     if (lastWeek) {
//       query = query.where("weekOf", ">=", lastWeek);
//     }

//     const snapshot = await query.get();
//     const feedbacks = [];

//     snapshot.forEach((doc) => {
//       const data = doc.data();
//       feedbacks.push({
//         id: doc.id,
//         originalFeedback: data.originalFeedback,
//         sentiment: data.analysis?.sentiment || "neutral",
//         keyThemes: data.analysis?.keyThemes || [],
//         weekOf: data.weekOf,
//         submittedAt: data.submittedAt,
//         // Don't expose teacherId for privacy
//         location: data.location || "Anonymous",
//       });
//     });

//     return { feedbacks };
//   } catch (error) {
//     console.error("Get community feedback error:", error);
//     throw new HttpsError("internal", "Failed to fetch community feedback");
//   }
// });
