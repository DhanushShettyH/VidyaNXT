const { onCall, onRequest } = require("firebase-functions/v2/https");
const { db } = require("../config/firebase-config");
const WeeklyPlannerAgent = require("../agents/weekly-planner-agent");
const DifferentiationAgent = require("../agents/differentiation-agent");
const SahayakOrchestrator = require("../agents/sahayak-orchestrator");

// Configuration for heavy processing
const heavyProcessingConfig = {
  timeoutSeconds: 300, // 5 minutes
  memory: "2GiB", // 2GB memory
  maxInstances: 10,
};

//! CREATE WEEKLY LESSON PLAN
const createWeeklyLessonPlan = onCall(async (request) => {
  try {
    const {
      teacherId,
      weekStart,
      grades,
      syllabus,
      mustCoverTopics,
      language,
    } = request.data;

    // Step 1: Check for existing similar plan
    const existingPlan = await checkExistingPlan(teacherId, syllabus, grades);
    if (existingPlan) {
      return {
        success: true,
        planId: existingPlan.id,
        data: existingPlan.data,
        isExisting: true,
      };
    }

    // Step 2: Get teacher location for regional context
    const teacherDoc = await db.collection("teachers").doc(teacherId).get();
    const teacherData = teacherDoc.data();
    const location = teacherData.location || "karnataka";

    // Step 3: Generate plan structure using WeeklyPlannerAgent
    const plannerAgent = new WeeklyPlannerAgent();
    const weekPlanStructure = await plannerAgent.generatePlanStructure({
      syllabus,
      mustCoverTopics,
      grades,
      weekStart,
      language,
      location,
    });

    // Step 4: Create plan document
    const planId = `week-plan-${weekStart}-${teacherId}-${Date.now()}`;
    const planData = {
      planId,
      teacherId,
      weekStart,
      weekEnd: calculateWeekEnd(weekStart),
      grades: grades.map((g) => g.trim()),
      syllabus,
      mustCoverTopics,
      language,
      location,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: "ready",
      dailyPlans: prepareDailyPlans(weekPlanStructure.dailyBreakdown),
      totalEstimatedHours: weekPlanStructure.totalEstimatedHours || 15,
      weeklyObjective: weekPlanStructure.weeklyObjective,
    };

    await db.collection("weekly_lesson_plans").doc(planId).set(planData);

    return {
      success: true,
      planId,
      data: planData,
      isExisting: false,
    };
  } catch (error) {
    console.error("Create weekly lesson plan error:", error);
    throw new Error(`Failed to create lesson plan: ${error.message}`);
  }
});
// GENERATE DAY CONTENT - WITH HEAVY PROCESSING CONFIG
const generateDayContent = onCall(heavyProcessingConfig, async (request) => {
  const { planId, day } = request.data;

  // 1. Mark "generating" and return immediately
  await db
    .collection("weekly_lesson_plans")
    .doc(planId)
    .update({
      [`dailyPlans.${day}.contentStatus`]: "generating",
    });

  // 2. Start background work and return immediately
  doActualContentGeneration(planId, day, request);

  // Return success NOW (browser receives this in < 1 second)
  return { accepted: true };

  // 3. Background function
  async function doActualContentGeneration(planId, day, request) {
    try {
      const { teacherId } = request.data;

      console.log(`🚀 Starting content generation for ${day}`);

      // Get the plan
      const planDoc = await db
        .collection("weekly_lesson_plans")
        .doc(planId)
        .get();
      const planData = planDoc.data();
      const dayPlan = planData.dailyPlans[day];

      if (!dayPlan) {
        throw new Error("Day plan not found");
      }

      // Check if content already exists
      if (dayPlan.contentStatus === "ready" && dayPlan.contentIds.length > 0) {
        console.log(`✅ Content already exists for ${day}`);
        return;
      }

      // Create content using existing SahayakOrchestrator
      console.log(`🤖 Starting AI content generation for ${day}`);
      const sahayakOrchestrator = new SahayakOrchestrator();
      const contentRequest = `${dayPlan.topic} - ${dayPlan.description}. Key points: ${dayPlan.keyPoints?.join(", ")}`;

      const result = await sahayakOrchestrator.processRequest(
        teacherId,
        contentRequest,
        planData.grades
      );

      console.log(`✅ Content generated successfully for ${day}`);

      // ✅ FIXED: Use result.sessionId, not sessionId
      await db
        .collection("weekly_lesson_plans")
        .doc(planId)
        .update({
          [`dailyPlans.${day}.contentIds`]: [result.contentId],
          [`dailyPlans.${day}.contentStatus`]: "ready",
          lastUpdated: new Date().toISOString(),
        });

      console.log(`🎉 Content generation completed for ${day}`);
      console.log("SahayakOrchestrator result:", {
        hasSessionId: !!result.contentId,
        sessionId: result.contentId,
      });
    } catch (err) {
      console.error(`❌ Content generation failed:`, err);

      await db
        .collection("weekly_lesson_plans")
        .doc(planId)
        .update({
          [`dailyPlans.${day}.contentStatus`]: "failed",
        });
    }
  }
});
// GENERATE DAY WORKSHEET - WITH HEAVY PROCESSING CONFIG
const generateDayWorksheet = onCall(heavyProcessingConfig, async (request) => {
  try {
    const { planId, day, teacherId } = request.data;

    console.log(`🚀 Starting worksheet generation for ${day}`);

    const planDoc = await db
      .collection("weekly_lesson_plans")
      .doc(planId)
      .get();
    const planData = planDoc.data();
    const dayPlan = planData.dailyPlans[day];

    if (
      dayPlan.worksheetStatus === "ready" &&
      dayPlan.worksheetIds.length > 0
    ) {
      console.log(`✅ Worksheet already exists for ${day}`);
      return {
        success: true,
        worksheetIds: dayPlan.worksheetIds,
        message: "Worksheet already exists",
      };
    }

    // Update status
    console.log(`⏳ Setting worksheet status to generating for ${day}`);
    await db
      .collection("weekly_lesson_plans")
      .doc(planId)
      .update({
        [`dailyPlans.${day}.worksheetStatus`]: "generating",
      });

    // Generate worksheet using existing DifferentiationAgent
    console.log(`🤖 Starting AI worksheet generation for ${day}`);
    const differentiationAgent = new DifferentiationAgent();
    const contextText = `Create worksheet for ${dayPlan.topic} covering ${dayPlan.keyPoints?.join(", ")}`;

    const result = await differentiationAgent.generateContent(
      contextText,
      planData.grades,
      planData.language,
      planData.location
    );

    // Store in differentiated_materials collection
    const materialId = `day-worksheet-${planId}-${day}-${Date.now()}`;
    const materialData = {
      materialId,
      teacherId,
      createdAt: new Date().toISOString(),
      analysis: {
        subject: inferSubject(planData.syllabus),
        topic: dayPlan.topic,
        content: contextText,
      },
      versions: result.versions,
      targetGrades: planData.grades,
      language: planData.language,
      location: planData.location,
      status: "completed",
    };

    await db
      .collection("differentiated_materials")
      .doc(materialId)
      .set(materialData);

    console.log(`✅ Worksheet generated successfully for ${day}`);

    // Update plan
    await db
      .collection("weekly_lesson_plans")
      .doc(planId)
      .update({
        [`dailyPlans.${day}.worksheetIds`]: [materialId],
        [`dailyPlans.${day}.worksheetStatus`]: "ready",
        lastUpdated: new Date().toISOString(),
      });

    console.log(`🎉 Worksheet generation completed for ${day}`);
    console.log("DifferentiationAgent result keys:", Object.keys(result));
    console.log("Generated materialId:", materialId);
    return {
      success: true,
      worksheetIds: [materialId],
      materialId,
    };
  } catch (error) {
    console.error(`❌ Worksheet generation failed:`, error);

    await db
      .collection("weekly_lesson_plans")
      .doc(request.data.planId)
      .update({
        [`dailyPlans.${request.data.day}.worksheetStatus`]: "failed",
      });

    throw new Error(`Failed to generate worksheet: ${error.message}`);
  }
});
// GET TODAY'S PLAN
const getTodaysPlan = onCall(async (request) => {
  try {
    const { teacherId, date } = request.data;

    // Find weekly plan that includes this date using admin SDK
    const weeklyPlansSnapshot = await db
      .collection("weekly_lesson_plans")
      .where("teacherId", "==", teacherId)
      .where("weekStart", "<=", date)
      .where("weekEnd", ">=", date)
      .get();

    if (weeklyPlansSnapshot.empty) {
      return {
        success: true,
        plan: null,
        message: "No weekly plan found",
      };
    }

    const weeklyPlan = weeklyPlansSnapshot.docs[0].data();
    const todaysPlan = weeklyPlan.dailyPlans[date];

    if (!todaysPlan) {
      return {
        success: true,
        plan: null,
        message: "No plan for today",
      };
    }

    // Return today's plan with additional metadata
    return {
      success: true,
      plan: {
        ...todaysPlan,
        planId: weeklyPlan.planId,
        date: date,
        syllabus: weeklyPlan.syllabus,
        language: weeklyPlan.language,
      },
    };
  } catch (error) {
    console.error("Get today's plan error:", error);
    throw new Error(`Failed to get today's plan: ${error.message}`);
  }
});

//! Helper functions (your existing ones)
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
function prepareDailyPlans(dailyBreakdown) {
  const dailyPlans = {};

  Object.entries(dailyBreakdown).forEach(([day, plan]) => {
    dailyPlans[day] = {
      ...plan,
      contentIds: [],
      worksheetIds: [],
      contentStatus: "pending",
      worksheetStatus: "pending",
    };
  });

  return dailyPlans;
}
function calculateWeekEnd(weekStart) {
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate.toISOString().split("T")[0];
}
function inferSubject(syllabus) {
  const syllabusLower = syllabus.toLowerCase();

  if (
    syllabusLower.includes("math") ||
    syllabusLower.includes("arithmetic") ||
    syllabusLower.includes("algebra") ||
    syllabusLower.includes("geometry") ||
    syllabusLower.includes("number")
  ) {
    return "Mathematics";
  } else if (
    syllabusLower.includes("science") ||
    syllabusLower.includes("physics") ||
    syllabusLower.includes("chemistry") ||
    syllabusLower.includes("biology") ||
    syllabusLower.includes("periodic") ||
    syllabusLower.includes("experiment") ||
    syllabusLower.includes("nature")
  ) {
    return "Science";
  } else if (
    syllabusLower.includes("english") ||
    syllabusLower.includes("language") ||
    syllabusLower.includes("hindi") ||
    syllabusLower.includes("kannada") ||
    syllabusLower.includes("marathi") ||
    syllabusLower.includes("reading") ||
    syllabusLower.includes("writing")
  ) {
    return "Language";
  } else if (
    syllabusLower.includes("social") ||
    syllabusLower.includes("history") ||
    syllabusLower.includes("geography") ||
    syllabusLower.includes("civics") ||
    syllabusLower.includes("culture")
  ) {
    return "Social Studies";
  } else if (
    syllabusLower.includes("art") ||
    syllabusLower.includes("craft") ||
    syllabusLower.includes("drawing") ||
    syllabusLower.includes("music")
  ) {
    return "Arts";
  } else {
    return "General";
  }
}

// GET WEEKLY PLAN
const getWeeklyPlan = onCall(async (request) => {
  try {
    const { teacherId } = request.data;

    // Get the most recent weekly plan for this teacher
    const weeklyPlansSnapshot = await db
      .collection("weekly_lesson_plans")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (weeklyPlansSnapshot.empty) {
      return {
        success: false,
        message: "No weekly plan found",
      };
    }

    const weeklyPlan = weeklyPlansSnapshot.docs[0].data();

    return {
      success: true,
      plan: weeklyPlan,
    };
  } catch (error) {
    console.error("Get weekly plan error:", error);
    throw new Error(`Failed to get weekly plan: ${error.message}`);
  }
});

// Export the new function
module.exports = {
  createWeeklyLessonPlan,
  generateDayWorksheet,
  generateDayContent,
  getTodaysPlan,
  getWeeklyPlan,
};
