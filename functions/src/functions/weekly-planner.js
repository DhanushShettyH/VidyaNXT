const { onCall, onRequest } = require("firebase-functions/v2/https");
const { db } = require("../config/firebase-config");
const WeeklyPlannerAgent = require("../agents/weekly-planner-agent");

// Configuration for heavy processing
const heavyProcessingConfig = {
  timeoutSeconds: 540,
  memory: "2GiB",
  maxInstances: 5,
};

// Main function - returns immediately with plan structure
const createWeeklyLessonPlan = onCall(async (request) => {
  console.log("🚀 Starting createWeeklyLessonPlan function");

  try {
    const { teacherId, weekStart, grades, syllabus, mustCoverTopics } =
      request.data;

    console.log("📝 Create weekly plan request:", {
      teacherId,
      weekStart,
      grades,
      syllabus,
      mustCoverTopics,
    });

    // Step 1: Validate parameters
    if (!teacherId || !weekStart || !grades || !syllabus || !mustCoverTopics) {
      console.error("❌ Missing required parameters:", {
        teacherId: !!teacherId,
        weekStart: !!weekStart,
        grades: !!grades,
        syllabus: !!syllabus,
        mustCoverTopics: !!mustCoverTopics,
      });
      throw new Error("Missing required parameters");
    }

    console.log("✅ Parameters validated successfully");

    // Step 2: Check if similar plan exists
    console.log("🔍 Checking for existing plan...");
    const existingPlan = await checkExistingPlan(teacherId, syllabus, grades);
    if (existingPlan) {
      console.log("♻️ Returning existing plan:", existingPlan.id);
      return {
        success: true,
        planId: existingPlan.id,
        data: existingPlan.data,
        isExisting: true,
      };
    }

    console.log("✅ No existing plan found, creating new one...");

    // Step 3: Generate plan structure
    console.log("🧠 Initializing WeeklyPlannerAgent...");
    const plannerAgent = new WeeklyPlannerAgent();
    console.log("✅ WeeklyPlannerAgent initialized");

    console.log("📋 Generating plan structure...");
    const weekPlanStructure = await plannerAgent.generatePlanStructure({
      syllabus,
      mustCoverTopics,
      grades,
      weekStart,
    });
    console.log("✅ Plan structure generated:", Object.keys(weekPlanStructure));

    // Step 4: Create plan ID
    const planId = `week-plan-${weekStart}-${teacherId}-${Date.now()}`;
    console.log("🏷️ Generated planId:", planId);

    // Step 5: Prepare initial plan data
    console.log("📦 Preparing initial plan data...");
    const initialPlanData = {
      planId,
      teacherId,
      weekStart,
      weekEnd: calculateWeekEnd(weekStart),
      grades: grades.map((g) => g.replace("Grade ", "")),
      syllabus,
      mustCoverTopics,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: "processing",
      dailyPlans: Object.fromEntries(
        Object.entries(weekPlanStructure.dailyBreakdown || {}).map(
          ([day, plan]) => [
            day,
            {
              ...plan,
              contentIds: [],
              worksheetIds: [],
              contentCreationStatus: "pending",
              worksheetCreationStatus: "pending",
            },
          ]
        )
      ),
      totalContent: 0,
      totalWorksheets: 0,
      estimatedHours: weekPlanStructure.totalEstimatedHours || 15,
      difficultyLevel: "multi-grade",
      language: "English",
      location: "Karnataka",
      processingProgress: 0,
      totalDays: Object.keys(weekPlanStructure.dailyBreakdown || {}).length,
    };

    console.log(
      "📊 Initial plan data prepared, totalDays:",
      initialPlanData.totalDays
    );

    // Step 6: Save to database
    console.log("💾 Saving plan to database...");
    await db.collection("weekly_lesson_plans").doc(planId).set(initialPlanData);
    console.log("✅ Plan saved to database successfully");

    // Step 7: Trigger background processing
    console.log("🔥 Triggering background processing...");
    triggerBackgroundProcessing(
      planId,
      teacherId,
      weekPlanStructure,
      grades,
      syllabus
    );
    console.log("✅ Background processing triggered");

    console.log("🎉 Returning success response");
    return {
      success: true,
      planId,
      data: initialPlanData,
      isExisting: false,
      status: "processing",
    };
  } catch (error) {
    console.error("❌ Create weekly lesson plan error:", error);
    console.error("❌ Error stack:", error.stack);
    throw new Error(`Failed to create lesson plan: ${error.message}`);
  }
});

// Background processing trigger (calls HTTP endpoint)
// Background processing trigger (calls HTTP endpoint)
async function triggerBackgroundProcessing(
  planId,
  teacherId,
  weekPlan,
  grades,
  syllabus
) {
  try {
    // Validate parameters
    if (!planId || !teacherId || !weekPlan) {
      console.error("Invalid parameters for background processing:", {
        planId,
        teacherId,
        weekPlan,
      });
      throw new Error("Missing required parameters for background processing");
    }

    console.log("Triggering background processing for plan:", planId);

    // For local development, use localhost
    const isLocal =
      process.env.FUNCTIONS_EMULATOR === "true" ||
      process.env.NODE_ENV === "development";
    const backgroundUrl = isLocal
      ? "http://localhost:5001/vidyanxt-hackathon/us-central1/processWeeklyPlanContent"
      : `${process.env.FIREBASE_FUNCTIONS_URL}/processWeeklyPlanContent`;

    // Use setTimeout to make it truly asynchronous and avoid blocking
    setTimeout(async () => {
      try {
        const response = await fetch(backgroundUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId,
            teacherId,
            weekPlan,
            grades,
            syllabus,
          }),
        });

        console.log("Background processing triggered:", response.status);
      } catch (fetchError) {
        console.error("Failed to trigger background processing:", fetchError);
        // Mark as failed
        await db.collection("weekly_lesson_plans").doc(planId).update({
          status: "failed",
          error: "Failed to start background processing",
          lastUpdated: new Date().toISOString(),
        });
      }
    }, 1000); // Delay 1 second to ensure main function completes first
  } catch (error) {
    console.error("Failed to trigger background processing:", error);
    // Mark as failed
    await db.collection("weekly_lesson_plans").doc(planId).update({
      status: "failed",
      error: "Failed to start background processing",
      lastUpdated: new Date().toISOString(),
    });
  }
}

// Background content processor (separate HTTP endpoint)
const processWeeklyPlanContent = onRequest(
  heavyProcessingConfig,
  async (req, res) => {
    try {
      const { planId, teacherId, weekPlan, grades, syllabus } = req.body;

      console.log(`🚀 Starting background processing for plan: ${planId}`);

      const plannerAgent = new WeeklyPlannerAgent();
      const dayEntries = Object.entries(weekPlan.dailyBreakdown);
      const totalDays = dayEntries.length;
      let completedDays = 0;

      // Process each day sequentially to manage resources
      for (const [day, dayPlan] of dayEntries) {
        try {
          console.log(
            `📖 Processing day ${completedDays + 1}/${totalDays}: ${day}`
          );

          // Update progress in database
          await db
            .collection("weekly_lesson_plans")
            .doc(planId)
            .update({
              processingProgress: Math.round((completedDays / totalDays) * 100),
              [`dailyPlans.${day}.contentCreationStatus`]: "processing",
              [`dailyPlans.${day}.worksheetCreationStatus`]: "processing",
              lastUpdated: new Date().toISOString(),
            });

          // Process the day's content
          const processedDay = await plannerAgent.processSingleDay(
            day,
            dayPlan,
            teacherId,
            grades,
            "Karnataka",
            syllabus
          );

          // Update the day in database
          await db
            .collection("weekly_lesson_plans")
            .doc(planId)
            .update({
              [`dailyPlans.${day}`]: processedDay,
              lastUpdated: new Date().toISOString(),
            });

          completedDays++;
          console.log(`✅ Completed day ${completedDays}/${totalDays}`);
        } catch (error) {
          console.error(`❌ Failed to process ${day}:`, error);

          // Mark day as failed but continue
          await db
            .collection("weekly_lesson_plans")
            .doc(planId)
            .update({
              [`dailyPlans.${day}.contentCreationStatus`]: "failed",
              [`dailyPlans.${day}.worksheetCreationStatus`]: "failed",
              [`dailyPlans.${day}.error`]: error.message,
              lastUpdated: new Date().toISOString(),
            });

          completedDays++;
        }
      }

      // Calculate final totals
      const planSnapshot = await db
        .collection("weekly_lesson_plans")
        .doc(planId)
        .get();
      const currentPlan = planSnapshot.data();

      const totalContent = Object.values(currentPlan.dailyPlans).reduce(
        (sum, day) => sum + (day.contentIds?.length || 0),
        0
      );
      const totalWorksheets = Object.values(currentPlan.dailyPlans).reduce(
        (sum, day) => sum + (day.worksheetIds?.length || 0),
        0
      );

      // Mark as completed
      await db.collection("weekly_lesson_plans").doc(planId).update({
        status: "completed",
        processingProgress: 100,
        totalContent,
        totalWorksheets,
        lastUpdated: new Date().toISOString(),
      });

      console.log(`🎉 Completed processing for plan: ${planId}`);

      res.status(200).json({
        success: true,
        planId,
        totalContent,
        totalWorksheets,
      });
    } catch (error) {
      console.error("Background processing error:", error);

      // Mark plan as failed
      if (req.body.planId) {
        await db.collection("weekly_lesson_plans").doc(req.body.planId).update({
          status: "failed",
          error: error.message,
          lastUpdated: new Date().toISOString(),
        });
      }

      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Function to check processing status
// Function to check processing status
const getWeeklyPlanStatus = onCall(async (request) => {
  try {
    const { planId } = request.data;

    // Add validation for planId
    if (!planId || typeof planId !== "string" || planId.trim() === "") {
      throw new Error("Invalid or missing planId parameter");
    }

    console.log(`Checking status for planId: ${planId}`);

    const planDoc = await db
      .collection("weekly_lesson_plans")
      .doc(planId.trim())
      .get();

    if (!planDoc.exists) {
      throw new Error("Plan not found");
    }

    const planData = planDoc.data();

    return {
      success: true,
      status: planData.status,
      processingProgress: planData.processingProgress || 0,
      totalContent: planData.totalContent || 0,
      totalWorksheets: planData.totalWorksheets || 0,
      data: planData,
    };
  } catch (error) {
    console.error("Get plan status error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Existing helper functions
async function checkExistingPlan(teacherId, syllabus, grades) {
  const snapshot = await db
    .collection("weekly_lesson_plans")
    .where("teacherId", "==", teacherId)
    .where("syllabus", "==", syllabus)
    .where(
      "grades",
      "array-contains-any",
      grades.map((g) => g.replace("Grade ", ""))
    )
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, data: doc.data() };
  }
  return null;
}

function calculateWeekEnd(weekStart) {
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate.toISOString().split("T")[0];
}

const getTodaysPlan = onCall(async (request) => {
  try {
    const { teacherId, date } = request.data;

    // First check if teacher has any weekly plans at all
    const anyPlanSnapshot = await db
      .collection("weekly_lesson_plans")
      .where("teacherId", "==", teacherId)
      .limit(1)
      .get();

    if (anyPlanSnapshot.empty) {
      return {
        success: true,
        plan: null,
        hasAnyPlans: false,
      };
    }

    // Then check for today's specific plan
    const todayPlanSnapshot = await db
      .collection("weekly_lesson_plans")
      .where("teacherId", "==", teacherId)
      .where("weekStart", "<=", date)
      .where("weekEnd", ">=", date)
      .limit(1)
      .get();

    if (todayPlanSnapshot.empty) {
      return {
        success: true,
        plan: null,
        hasAnyPlans: true,
      };
    }

    const weekPlan = todayPlanSnapshot.docs[0].data();
    const todaysPlan = weekPlan.dailyPlans[date];

    return {
      success: true,
      plan: todaysPlan
        ? {
            ...todaysPlan,
            syllabus: weekPlan.syllabus,
            weekStart: weekPlan.weekStart,
          }
        : null,
      hasAnyPlans: true,
    };
  } catch (error) {
    console.error("Get today's plan error:", error);
    throw new Error(`Failed to get today's plan: ${error.message}`);
  }
});

const getTeacherWeeklyPlans = onCall(async (request) => {
  try {
    const { teacherId } = request.data;

    const snapshot = await db
      .collection("weekly_lesson_plans")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const plans = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      plans,
    };
  } catch (error) {
    console.error("Get teacher weekly plans error:", error);
    throw new Error(`Failed to get plans: ${error.message}`);
  }
});

module.exports = {
  createWeeklyLessonPlan,
  processWeeklyPlanContent,
  getWeeklyPlanStatus,
  getTodaysPlan,
  getTeacherWeeklyPlans,
};
