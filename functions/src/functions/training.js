const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { db } = require("../config/firebase-config");
const { generateText } = require("../config/gemini");
const {
  sanitizeForFirestore,
  parseGeminiResponse,
} = require("../utils/helpers");
const {
  getLanguageFromLocation,
  getRegionalContext,
} = require("../utils/location-mapping");

// Initialize core training modules (runs once on deployment)
exports.initializeCoreModules = onCall(async (request) => {
  try {
    // Check if core modules already exist
    const existingModules = await db
      .collection("training_modules")
      .where("source", "==", "core")
      .get();

    if (!existingModules.empty) {
      return { success: true, message: "Core modules already exist" };
    }

    const coreModules = [
      {
        moduleId: "multi-grade-basics-001",
        title: "Multi-Grade Classroom Management Basics",
        description:
          "Learn fundamental strategies for managing multiple grades in one classroom",
        type: "core",
        difficulty: "beginner",
        estimatedTime: "45 minutes",
        prerequisiteLevel: 0,
        targetExperience: "0-2 years",
        content: {
          sections: [
            {
              id: "section_1",
              title: "Understanding Multi-Grade Challenges",
              type: "text",
              content: `Multi-grade classrooms are common in rural and under-resourced schools. Key challenges include:
              
              1. **Time Management**: Dividing attention across multiple grade levels
              2. **Content Differentiation**: Adapting lessons for different learning levels  
              3. **Classroom Organization**: Setting up spaces for independent and group work
              4. **Assessment**: Tracking progress across different curricula
              
              Understanding these challenges is the first step to becoming an effective multi-grade teacher.`,
              duration: 8,
              activities: ["Reflect on your current classroom challenges"],
            },
            {
              id: "section_2",
              title: "Time Blocking Strategy",
              type: "interactive",
              content: `Time blocking is essential for multi-grade success:
              
              **The 20-20-20 Rule:**
              - 20 minutes: Direct instruction with one grade
              - 20 minutes: Independent work while teaching another grade  
              - 20 minutes: Review and assessment
              
              **Implementation Steps:**
              1. Identify your teaching periods
              2. Assign grades to time blocks
              3. Prepare independent activities
              4. Create transition routines`,
              activities: [
                "Create a sample time block schedule for your classroom",
                "List 5 independent activities for each grade you teach",
              ],
              duration: 20,
            },
            {
              id: "section_3",
              title: "Group Management Techniques",
              type: "text",
              content: `Effective group management strategies:
              
              **Station Rotation:**
              - Set up learning stations for different subjects
              - Students rotate based on schedule
              - Teacher provides direct instruction at one station
              
              **Peer Learning:**
              - Pair older students with younger ones
              - Create study buddy systems
              - Implement peer tutoring programs
              
              **Independent Learning Systems:**
              - Self-checking worksheets
              - Learning contracts
              - Progress tracking charts`,
              duration: 12,
              activities: ["Design a station rotation plan"],
            },
            {
              id: "section_4",
              title: "Assessment and Progress Tracking",
              type: "interactive",
              content: `Tracking multiple grades requires systematic approaches:
              
              **Individual Progress Charts:**
              - Visual tracking for each student
              - Grade-specific milestones
              - Regular update schedules
              
              **Portfolio Systems:**
              - Student work samples
              - Self-reflection sheets
              - Parent communication logs`,
              duration: 15,
              activities: ["Create a progress tracking template"],
            },
          ],
        },
        learningOutcomes: [
          "Understand multi-grade classroom dynamics",
          "Create effective time management schedules",
          "Apply group management strategies",
          "Implement progress tracking systems",
        ],
        createdAt: new Date().toISOString(),
        source: "core",
        isActive: true,
      },
      {
        moduleId: "time-management-002",
        title: "Advanced Time Management for Multi-Grade Teachers",
        description:
          "Master advanced time allocation and classroom efficiency techniques",
        type: "core",
        difficulty: "intermediate",
        estimatedTime: "50 minutes",
        prerequisiteLevel: 1,
        targetExperience: "1-3 years",
        prerequisites: ["multi-grade-basics-001"],
        content: {
          sections: [
            {
              id: "section_1",
              title: "Priority-Based Planning",
              type: "text",
              content: `Advanced planning strategies for maximum efficiency:
              
              **The Teaching Priority Matrix:**
              - High Impact, Low Effort (Quick wins)
              - High Impact, High Effort (Major projects)
              - Low Impact, Low Effort (Fill time activities)
              - Low Impact, High Effort (Avoid these)
              
              Focus 70% of your energy on high-impact activities.`,
              duration: 10,
              activities: [
                "Categorize your current teaching activities using the matrix",
              ],
            },
            {
              id: "section_2",
              title: "Advanced Rotation Systems",
              type: "interactive",
              content: `Sophisticated rotation strategies:
              
              **The Carousel Method:**
              - 4-5 stations with different subjects
              - Students move every 15-20 minutes
              - Teacher anchors at instruction station
              
              **The Flex Model:**
              - Adaptive grouping based on skill level
              - Cross-grade learning opportunities
              - Dynamic time allocation`,
              duration: 25,
              activities: [
                "Design a carousel rotation for your classroom",
                "Plan a flex model lesson",
              ],
            },
            {
              id: "section_3",
              title: "Technology Integration",
              type: "text",
              content: `Using technology to enhance efficiency:
              
              **Digital Learning Stations:**
              - Educational apps for independent practice
              - Online assessment tools
              - Video lessons for self-paced learning
              
              **Management Apps:**
              - Timer apps for rotation
              - Progress tracking software
              - Communication platforms for parents`,
              duration: 15,
              activities: [
                "Research 3 educational apps suitable for your grades",
              ],
            },
          ],
        },
        learningOutcomes: [
          "Create priority-based lesson plans",
          "Implement advanced rotation systems",
          "Integrate technology effectively",
          "Optimize classroom efficiency",
        ],
        createdAt: new Date().toISOString(),
        source: "core",
        isActive: true,
      },
    ];

    // Create core modules
    for (const module of coreModules) {
      await db
        .collection("training_modules")
        .doc(module.moduleId)
        .set(sanitizeForFirestore(module));
    }

    return { success: true, message: "Core modules initialized successfully" };
  } catch (error) {
    console.error("Error initializing core modules:", error);
    throw new HttpsError("internal", "Failed to initialize core modules");
  }
});

// Get personalized training modules for a teacher
exports.getPersonalizedTraining = onCall(async (request) => {
  try {
    const { teacherId } = request.data;

    if (!teacherId) {
      throw new HttpsError("invalid-argument", "Teacher ID is required");
    }
    const feedbackSnapshot = await db
      .collection("community_feedback")
      .where("sharedWithCommunity", "==", true)
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let recentCommunityContext = null;

    if (!feedbackSnapshot.empty) {
      const doc = feedbackSnapshot.docs[0].data();
      recentCommunityContext = {
        sentiment: doc.analysis?.sentiment,
        keyThemes: doc.analysis?.keyThemes || [],
        teacherEmotion: doc.analysis?.emotionalState || "unknown",
        coreFeedback: doc.originalFeedback || "",
        weekOf: doc.weekOf,
      };
    }

    // Get teacher data
    const teacherDoc = await db.collection("teachers").doc(teacherId).get();
    if (!teacherDoc.exists) {
      throw new HttpsError("not-found", "Teacher not found");
    }

    const teacherData = teacherDoc.data();

    // Get teacher's progress
    const progressDoc = await db
      .collection("teacher_progress")
      .doc(teacherId)
      .get();
    const progress = progressDoc.exists
      ? progressDoc.data()
      : {
          teacherId,
          moduleProgress: {},
          skillLevels: {
            multiGradeManagement: teacherData.experienceYears <= 2 ? 3 : 5,
            timeManagement: teacherData.experienceYears <= 2 ? 2 : 4,
            studentEngagement: teacherData.experienceYears <= 2 ? 4 : 6,
            classroomSetup: teacherData.experienceYears <= 2 ? 3 : 5,
            parentCommunication: teacherData.experienceYears <= 2 ? 3 : 4,
          },
          completedCoreModules: 0,
          totalTrainingHours: 0,
          lastUpdated: new Date().toISOString(),
        };

    // Get available modules based on teacher's level and prerequisites
    const availableModules = await getAvailableModulesForTeacher(
      teacherId,
      progress
    );

    // Generate personalized recommendations
    const recommendations = await generatePersonalizedRecommendations(
      teacherData,
      progress,
      recentCommunityContext
    );

    // Check if teacher needs personalized modules
    const needsPersonalizedModules = progress.completedCoreModules >= 2;

    if (needsPersonalizedModules) {
      await generatePersonalizedModules(teacherId, teacherData, progress);
    }

    return {
      success: true,
      recommendations,
      availableModules,
      progress,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Get personalized training error:", error);
    throw new HttpsError("internal", "Failed to get training recommendations");
  }
});

// Get all training modules with teacher progress
exports.getTrainingModules = onCall(async (request) => {
  try {
    const { category, difficulty, teacherId } = request.data;

    let query = db.collection("training_modules").where("isActive", "==", true);

    if (category && category !== "all") {
      query = query.where("type", "==", category);
    }

    if (difficulty && difficulty !== "all") {
      query = query.where("difficulty", "==", difficulty);
    }

    const modulesSnapshot = await query
      .orderBy("prerequisiteLevel", "asc")
      .get();
    const modules = [];
    modulesSnapshot.forEach((doc) => {
      const data = doc.data();
      // Core modules are visible to all; personalized only to correct teacher
      if (
        data.type === "core" ||
        (data.type === "personalized" && data.targetTeacher === teacherId)
      ) {
        modules.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // Get teacher progress if provided
    if (teacherId) {
      const progressDoc = await db
        .collection("teacher_progress")
        .doc(teacherId)
        .get();
      const progress = progressDoc.exists
        ? progressDoc.data().moduleProgress
        : {};

      modules.forEach((module) => {
        const moduleProgress = progress[module.id] || { status: "not-started" };
        module.userProgress = moduleProgress;

        // Check if prerequisites are met
        module.canStart = checkPrerequisites(module, progress);

        // Calculate completion percentage
        if (moduleProgress.completedSections && module.content?.sections) {
          const totalSections = module.content.sections.length;
          const completedCount = moduleProgress.completedSections.length;
          module.completionPercentage = Math.round(
            (completedCount / totalSections) * 100
          );
        } else {
          module.completionPercentage = 0;
        }
      });
    }

    return {
      success: true,
      modules,
    };
  } catch (error) {
    console.error("Get training modules error:", error);
    throw new HttpsError("internal", "Failed to get training modules");
  }
});

// Start a training module
exports.startTrainingModule = onCall(async (request) => {
  try {
    const { teacherId, moduleId } = request.data;

    if (!teacherId || !moduleId) {
      throw new HttpsError(
        "invalid-argument",
        "Teacher ID and Module ID are required"
      );
    }

    const progressRef = db.collection("teacher_progress").doc(teacherId);
    const progressDoc = await progressRef.get();

    let currentProgress = progressDoc.exists
      ? progressDoc.data()
      : {
          teacherId,
          moduleProgress: {},
          skillLevels: {},
          completedCoreModules: 0,
          totalTrainingHours: 0,
          lastUpdated: new Date().toISOString(),
        };

    // Initialize module progress
    currentProgress.moduleProgress[moduleId] = {
      status: "in-progress",
      completedSections: [],
      currentSection: "section_1",
      timeSpent: 0,
      startedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
    };

    currentProgress.lastUpdated = new Date().toISOString();

    await progressRef.set(sanitizeForFirestore(currentProgress));

    return {
      success: true,
      moduleProgress: currentProgress.moduleProgress[moduleId],
    };
  } catch (error) {
    console.error("Start training module error:", error);
    throw new HttpsError("internal", "Failed to start training module");
  }
});

// Complete a section
exports.completeSectionProgress = onCall(async (request) => {
  try {
    const { teacherId, moduleId, sectionId, timeSpent = 0 } = request.data;

    if (!teacherId || !moduleId || !sectionId) {
      throw new HttpsError(
        "invalid-argument",
        "Teacher ID, Module ID, and Section ID are required"
      );
    }

    const progressRef = db.collection("teacher_progress").doc(teacherId);
    const progressDoc = await progressRef.get();

    if (!progressDoc.exists) {
      throw new HttpsError("not-found", "Progress record not found");
    }

    let currentProgress = progressDoc.data();
    let moduleProgress = currentProgress.moduleProgress[moduleId];

    if (!moduleProgress) {
      throw new HttpsError("not-found", "Module not started");
    }

    // Add section to completed if not already there
    if (!moduleProgress.completedSections.includes(sectionId)) {
      moduleProgress.completedSections.push(sectionId);
    }

    moduleProgress.timeSpent += timeSpent;
    moduleProgress.lastAccessed = new Date().toISOString();

    // Get module data to check if all sections completed
    const moduleDoc = await db
      .collection("training_modules")
      .doc(moduleId)
      .get();
    if (moduleDoc.exists) {
      const moduleData = moduleDoc.data();
      const totalSections = moduleData.content?.sections?.length || 0;
      const completedCount = moduleProgress.completedSections.length;

      if (completedCount >= totalSections) {
        // Module completed
        moduleProgress.status = "completed";
        moduleProgress.completedAt = new Date().toISOString();

        // Update core modules count if this is a core module
        if (moduleData.source === "core") {
          currentProgress.completedCoreModules =
            (currentProgress.completedCoreModules || 0) + 1;
        }

        // Update skill levels based on module completion
        await updateSkillLevels(teacherId, moduleId, moduleData);
      }
    }

    currentProgress.totalTrainingHours += timeSpent / 3600; // Convert seconds to hours
    currentProgress.lastUpdated = new Date().toISOString();

    await progressRef.set(sanitizeForFirestore(currentProgress));

    return {
      success: true,
      moduleProgress: moduleProgress,
      sectionCompleted: true,
    };
  } catch (error) {
    console.error("Complete section progress error:", error);
    throw new HttpsError("internal", "Failed to update section progress");
  }
});

// Get specific module details with progress
exports.getModuleDetails = onCall(async (request) => {
  try {
    const { teacherId, moduleId } = request.data;

    if (!moduleId) {
      throw new HttpsError("invalid-argument", "Module ID is required");
    }

    const moduleDoc = await db
      .collection("training_modules")
      .doc(moduleId)
      .get();
    if (!moduleDoc.exists) {
      throw new HttpsError("not-found", "Module not found");
    }

    const moduleData = { id: moduleDoc.id, ...moduleDoc.data() };

    if (teacherId) {
      const progressDoc = await db
        .collection("teacher_progress")
        .doc(teacherId)
        .get();
      if (progressDoc.exists) {
        const progress = progressDoc.data();
        const moduleProgress = progress.moduleProgress[moduleId] || {
          status: "not-started",
        };

        moduleData.userProgress = moduleProgress;
        moduleData.canStart = checkPrerequisites(
          moduleData,
          progress.moduleProgress
        );

        // Add section completion status
        if (moduleData.content?.sections) {
          moduleData.content.sections.forEach((section) => {
            section.completed =
              moduleProgress.completedSections?.includes(section.id) || false;
          });
        }
      }
    }

    return {
      success: true,
      module: moduleData,
    };
  } catch (error) {
    console.error("Get module details error:", error);
    throw new HttpsError("internal", "Failed to get module details");
  }
});

// Helper functions
async function getAvailableModulesForTeacher(teacherId, progress) {
  const modulesQuery = await db
    .collection("training_modules")
    .where("isActive", "==", true)
    .orderBy("prerequisiteLevel", "asc")
    .get();

  const availableModules = [];

  modulesQuery.forEach((doc) => {
    const module = { id: doc.id, ...doc.data() };

    if (checkPrerequisites(module, progress.moduleProgress)) {
      const moduleProgress = progress.moduleProgress[module.id] || {
        status: "not-started",
      };
      module.userProgress = moduleProgress;
      availableModules.push(module);
    }
  });

  return availableModules;
}

function checkPrerequisites(module, moduleProgress) {
  if (!module.prerequisites || module.prerequisites.length === 0) {
    return true;
  }

  return module.prerequisites.every((prereqId) => {
    const prereqProgress = moduleProgress[prereqId];
    return prereqProgress && prereqProgress.status === "completed";
  });
}

async function generatePersonalizedRecommendations(
  teacherData,
  progress,
  sharedFeedback = null
) {
  const promptData = {
    experience: teacherData.experienceYears,
    grades: teacherData.grades,
    location: teacherData.location,
    completedModules: progress.completedCoreModules || 0,
    skillLevels: progress.skillLevels || {},
  };

  let communityHintBlock = "";

  if (sharedFeedback) {
    communityHintBlock = `
Recent community feedback shared by an experienced teacher:

- Emotion: ${sharedFeedback.teacherEmotion}
- Key Themes: ${sharedFeedback.keyThemes.join(", ")}
- Feedback: "${sharedFeedback.coreFeedback}"
- Week Reported: ${sharedFeedback.weekOf}

Use this real-world feedback to guide practical, teacher-relevant suggestions.
`;
  }

  const prompt = `
Generate personalized training recommendations for this teacher:

Teacher Profile: ${JSON.stringify(promptData, null, 2)}

${communityHintBlock}

Generate JSON response with:

{
  "immediateNeeds": [
    {
      "skill": "specific skill area",
      "urgency": "high|medium|low",
      "reason": "why this is needed",
      "recommendedModule": "module id or title"
    }
  ],
  "suggestedNextSteps": [
    "specific actionable step"
  ],
  "focusAreas": [
    "key area to improve"
  ]
}
`;

  try {
    const response = await generateText(prompt);
    return parseGeminiResponse(response);
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return {
      immediateNeeds: [],
      suggestedNextSteps: ["Complete available core modules"],
      focusAreas: ["Multi-grade classroom management"],
    };
  }
}

async function generatePersonalizedModules(teacherId, teacherData, progress) {
  try {
    // Check if personalized modules already exist
    const existingPersonalized = await db
      .collection("training_modules")
      .where("targetTeacher", "==", teacherId)
      .get();

    if (!existingPersonalized.empty) {
      return; // Already has personalized modules
    }

    const language = getLanguageFromLocation(teacherData.location);
    const regionalContext = getRegionalContext(teacherData.location);

    // Get completed core modules to understand what they've already learned
    const completedModules = [];
    const moduleProgressEntries = Object.entries(progress.moduleProgress || {});

    for (const [moduleId, moduleProgress] of moduleProgressEntries) {
      if (moduleProgress.status === "completed") {
        const moduleDoc = await db
          .collection("training_modules")
          .doc(moduleId)
          .get();
        if (moduleDoc.exists) {
          completedModules.push({
            id: moduleId,
            title: moduleDoc.data().title,
            learningOutcomes: moduleDoc.data().learningOutcomes || [],
            content: moduleDoc.data().content,
          });
        }
      }
    }

    const modulePrompt = `Create a culturally relevant and localized training module for this teacher:
    
    Teacher Profile:
    - Experience: ${teacherData.experienceYears} years
    - Teaches grades: ${teacherData.grades?.join(", ")}
    - Location: ${teacherData.location}
    - Language: ${language}
    
    Regional Context: ${JSON.stringify(regionalContext, null, 2)}
    
    Already Completed Modules: ${JSON.stringify(
      completedModules.map((m) => ({
        title: m.title,
        learningOutcomes: m.learningOutcomes,
      })),
      null,
      2
    )}
    
    Current Skill Levels: ${JSON.stringify(progress.skillLevels, null, 2)}
    
    Create a comprehensive training module that:
    1. Builds upon what they've already learned (avoid repeating covered content)
    2. Integrates local culture, festivals, and traditions specific to ${teacherData.location}
    3. Uses ${language} language examples and culturally relevant scenarios
    4. Addresses region-specific challenges (rural/urban, resource availability, local curriculum)
    5. Includes practical activities using local materials and contexts
    
    Generate a JSON response with this structure:
    {
      "title": "Culturally Integrated Multi-Grade Teaching for [Region]",
      "description": "Advanced multi-grade strategies using local culture and context",
      "type": "personalized",
      "difficulty": "intermediate", 
      "estimatedTime": "60-75 minutes",
      "prerequisiteLevel": 2,
      "targetExperience": "${teacherData.experienceYears}-${teacherData.experienceYears + 2} years",
      "localizedFeatures": {
        "primaryLanguage": "${language}",
        "region": "${teacherData.location}",
        "culturalElements": ["list of specific cultural elements used"],
        "localMaterials": ["materials available in this region"]
      },
      "content": {
        "sections": [
          {
            "id": "section_1",
            "title": "Cultural Integration in Lesson Planning",
            "type": "interactive",
            "content": "Detailed content that builds on their existing knowledge while introducing cultural elements...",
            "localExamples": ["specific local examples"],
            "activities": ["culturally relevant activities"],
            "duration": 15
          },
          {
            "id": "section_2", 
            "title": "Using Local Festivals for Cross-Grade Learning",
            "type": "text",
            "content": "How to use regional festivals and celebrations as teaching opportunities...",
            "localExamples": ["festival-specific examples"],
            "activities": ["hands-on festival-based activities"],
            "duration": 20
          },
          {
            "id": "section_3",
            "title": "Community Resource Integration",
            "type": "interactive", 
            "content": "Leveraging local community members, occupations, and resources...",
            "localExamples": ["local occupation examples"],
            "activities": ["community engagement activities"],
            "duration": 15
          },
          {
            "id": "section_4",
            "title": "Regional Language and Multilingual Strategies", 
            "type": "text",
            "content": "Managing ${language} alongside Hindi/English in multi-grade settings...",
            "localExamples": ["language mixing examples"],
            "activities": ["multilingual teaching strategies"],
            "duration": 15
          },
          {
            "id": "section_5",
            "title": "Practical Implementation and Assessment",
            "type": "interactive",
            "content": "Putting cultural integration into daily practice...",
            "localExamples": ["implementation examples"],
            "activities": ["create a culturally integrated lesson plan"],
            "duration": 15
          }
        ]
      },
      "learningOutcomes": [
        "Integrate local cultural elements into multi-grade lessons",
        "Design culturally responsive teaching materials using available resources",
        "Manage multilingual instruction effectively", 
        "Engage community members in educational processes",
        "Adapt teaching strategies to regional contexts"
      ],
      "practicalOutputs": [
        "Culturally integrated lesson plan template",
        "Local resource inventory",
        "Community engagement strategy",
        "Multilingual instruction guide"
      ]
    }
    
    Make all content highly practical and immediately applicable in their specific regional context.`;

    const response = await generateText(modulePrompt);
    const moduleData = parseGeminiResponse(response);

    const personalizedModule = {
      ...moduleData,
      moduleId: `localized-${teacherId}-${Date.now()}`,
      type: "personalized",
      targetTeacher: teacherId,
      prerequisiteLevel: 2,
      prerequisites: ["multi-grade-basics-001", "time-management-002"],
      createdAt: new Date().toISOString(),
      source: "ai-generated-personalized",
      isActive: true,
      basedOnCompletedModules: completedModules.map((m) => m.id),
    };

    await db
      .collection("training_modules")
      .add(sanitizeForFirestore(personalizedModule));
    console.log(
      `Generated personalized localized module for teacher: ${teacherId}`
    );
  } catch (error) {
    console.error("Error generating personalized modules:", error);
  }
}

async function updateSkillLevels(teacherId, moduleId, moduleData) {
  // Update skill levels based on completed module
  const skillUpdates = {
    "multi-grade-basics-001": {
      multiGradeManagement: 2,
      classroomSetup: 1,
      studentEngagement: 1,
    },
    "time-management-002": {
      timeManagement: 3,
      multiGradeManagement: 1,
    },
  };

  const updates = skillUpdates[moduleId];
  if (updates) {
    const progressRef = db.collection("teacher_progress").doc(teacherId);
    const progressDoc = await progressRef.get();

    if (progressDoc.exists) {
      const data = progressDoc.data();
      const currentSkills = data.skillLevels || {};

      // Update skill levels
      Object.entries(updates).forEach(([skill, increase]) => {
        currentSkills[skill] = Math.min(
          (currentSkills[skill] || 0) + increase,
          10
        );
      });

      await progressRef.update({
        skillLevels: currentSkills,
        lastUpdated: new Date().toISOString(),
      });
    }
  }
}

// Trigger to generate personalized content when teacher completes core modules
// Enhanced trigger to generate personalized content
exports.onProgressUpdate = onDocumentUpdated(
  "teacher_progress/{teacherId}",
  async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const teacherId = event.params.teacherId;

    // Check if core modules completion increased to exactly 2
    const newCoreCount = newData.completedCoreModules || 0;
    const oldCoreCount = oldData.completedCoreModules || 0;

    if (newCoreCount === 2 && oldCoreCount === 1) {
      // Teacher just completed both core modules, generate personalized content
      try {
        const teacherDoc = await db.collection("teachers").doc(teacherId).get();
        if (teacherDoc.exists) {
          await generatePersonalizedModules(
            teacherId,
            teacherDoc.data(),
            newData
          );

          // Create notification for teacher
          await db
            .collection("teachers")
            .doc(teacherId)
            .collection("notifications")
            .add({
              type: "new_module_available",
              title: "🎉 New Personalized Module Available!",
              message: `Congratulations on completing the core modules! A special module tailored to your region and culture is now available.`,
              createdAt: new Date().toISOString(),
              read: false,
            });

          console.log(
            `Generated personalized modules for teacher: ${teacherId}`
          );
        }
      } catch (error) {
        console.error("Error in progress update trigger:", error);
      }
    }
  }
);

// Get teacher progress data
exports.getTeacherProgress = onCall(async (request) => {
  try {
    const { teacherId } = request.data;

    if (!teacherId) {
      throw new HttpsError("invalid-argument", "Teacher ID is required");
    }

    const progressDoc = await db
      .collection("teacher_progress")
      .doc(teacherId)
      .get();

    if (!progressDoc.exists) {
      // Return default progress for new teachers
      return {
        success: true,
        progress: {
          teacherId,
          moduleProgress: {},
          skillLevels: {
            multiGradeManagement: 0,
            timeManagement: 0,
            studentEngagement: 0,
            classroomSetup: 0,
            parentCommunication: 0,
          },
          completedCoreModules: 0,
          totalTrainingHours: 0,
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      progress: progressDoc.data(),
    };
  } catch (error) {
    console.error("Get teacher progress error:", error);
    throw new HttpsError("internal", "Failed to get teacher progress");
  }
});
