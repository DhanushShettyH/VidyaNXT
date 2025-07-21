// functions/scripts/init-training-data.js
const admin = require("firebase-admin");

// Initialize Firebase Admin for emulator
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.PROJECT_ID, // Use any project ID for emulator
  });
}

// Connect to Firestore emulator
const db = admin.firestore();

// Set emulator host - this is the key part!
if (process.env.NODE_ENV !== "production") {
  db.settings({
    host: "localhost:8080", // Default Firestore emulator port
    ssl: false,
  });
}

const initialModules = [
  {
    moduleId: "multi-grade-basics-001",
    title: "Multi-Grade Classroom Management Basics",
    description:
      "Learn fundamental strategies for managing multiple grades in one classroom",
    type: "core",
    difficulty: "beginner",
    estimatedTime: "25 minutes",
    content: {
      sections: [
        {
          title: "Understanding Multi-Grade Challenges",
          type: "text",
          content: "Multi-grade classrooms present unique challenges...",
          duration: 5,
        },
        {
          title: "Time Blocking Strategy",
          type: "interactive",
          content: "Learn to divide your class time effectively...",
          activities: ["Create a sample time block schedule"],
          duration: 10,
        },
        {
          title: "Group Management Techniques",
          type: "text",
          content:
            "Effective strategies for managing different grade groups...",
          duration: 10,
        },
      ],
    },
    learningOutcomes: [
      "Understand multi-grade classroom dynamics",
      "Create effective time management schedules",
      "Apply group management strategies",
    ],
    createdAt: new Date().toISOString(),
    source: "expert",
  },
  {
    moduleId: "time-management-001",
    title: "Time Management for Multi-Grade Teachers",
    description:
      "Master the art of time allocation across multiple grade levels",
    type: "core",
    difficulty: "intermediate",
    estimatedTime: "30 minutes",
    content: {
      sections: [
        {
          title: "Priority-Based Planning",
          type: "text",
          content:
            "Learn to prioritize activities based on learning objectives...",
          duration: 8,
        },
        {
          title: "Rotation Systems",
          type: "interactive",
          content: "Implement effective student rotation systems...",
          activities: ["Design a rotation schedule"],
          duration: 12,
        },
        {
          title: "Independent Learning Setup",
          type: "text",
          content: "Create systems for independent student work...",
          duration: 10,
        },
      ],
    },
    learningOutcomes: [
      "Create priority-based lesson plans",
      "Implement student rotation systems",
      "Establish independent learning stations",
    ],
    createdAt: new Date().toISOString(),
    source: "expert",
  },
];

async function initializeTrainingData() {
  try {
    console.log("Connecting to Firestore emulator...");

    for (const module of initialModules) {
      await db.collection("training_modules").doc(module.moduleId).set(module);
      console.log(`Created module: ${module.title}`);
    }
    console.log("Training data initialized successfully in emulator!");
  } catch (error) {
    console.error("Error initializing training data:", error);
  } finally {
    process.exit(0);
  }
}

// Run this once to set up initial data
initializeTrainingData();
