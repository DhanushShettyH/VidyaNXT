const { board } = require("@google-labs/breadboard");
const { generateText } = require("../config/gemini");

// Simple profile processing breadboard
const profileBoard = board({
  title: "Teacher Profile Processor",
  description: "Processes teacher data to create comprehensive profiles",
  version: "1.0.0",
});

// Input node
const input = profileBoard.input({
  schema: {
    type: "object",
    properties: {
      teacherId: { type: "string" },
      name: { type: "string" },
      grades: { type: "array", items: { type: "string" } },
      location: { type: "string" },
      experience: { type: "number" },
    },
    required: ["teacherId", "name", "grades", "location", "experience"],
  },
});

// Profile summary generator
const summaryGenerator = profileBoard.lambda({
  board: board({
    title: "Summary Generator",
    description: "Generates AI-powered teacher profile summary",
  }),
  function: async ({ teacherData }) => {
    const prompt = `
      Create a professional teacher profile summary for:
      Name: ${teacherData.name}
      Grades: ${teacherData.grades.join(", ")}
      Location: ${teacherData.location}
      Experience: ${teacherData.experience} years
      
      Generate a concise, professional summary (max 100 words).
    `;

    try {
      const summary = await generateText(prompt);
      return { summary: summary.trim() };
    } catch (error) {
      return {
        summary: `${teacherData.name} teaches grades ${teacherData.grades.join(", ")} in ${teacherData.location} with ${teacherData.experience} years of experience.`,
      };
    }
  },
});

// Profile processor
const profileProcessor = profileBoard.lambda({
  board: board({
    title: "Profile Processor",
    description: "Processes complete teacher profile data",
  }),
  function: async ({ teacherData, summary }) => {
    const experienceLevel =
      teacherData.experience < 3
        ? "novice"
        : teacherData.experience < 10
          ? "experienced"
          : "veteran";

    const profileStrength = Math.min(
      100,
      teacherData.experience * 5 + teacherData.grades.length * 15
    );

    return {
      teacherId: teacherData.teacherId,
      summary: summary,
      experienceLevel: experienceLevel,
      profileStrength: profileStrength,
      matchingCriteria: {
        grades: teacherData.grades,
        location: teacherData.location,
        experienceLevel: experienceLevel,
        gradeScore: teacherData.grades.length * 10,
        regionKey: teacherData.location.toLowerCase().replace(/\s+/g, "_"),
      },
      aiPreferences: {
        preferredInteractionStyle:
          teacherData.experience < 5 ? "supportive" : "collaborative",
        communicationPreference:
          experienceLevel === "novice" ? "detailed" : "concise",
      },
      createdAt: new Date().toISOString(),
    };
  },
});

// Output node
const output = profileBoard.output({
  schema: {
    type: "object",
    properties: {
      teacherId: { type: "string" },
      summary: { type: "string" },
      experienceLevel: { type: "string" },
      profileStrength: { type: "number" },
      matchingCriteria: { type: "object" },
      aiPreferences: { type: "object" },
      createdAt: { type: "string" },
    },
  },
});

// Wire the board
input.wire("teacherData->", summaryGenerator);
input.wire("teacherData->", profileProcessor);
summaryGenerator.wire("summary->", profileProcessor);
profileProcessor.wire("*->", output);

module.exports = profileBoard;
