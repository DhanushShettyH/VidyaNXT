const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");
const { db } = require("../config/firebase-config");
const SahayakOrchestrator = require("./sahayak-orchestrator");
const DifferentiationAgent = require("./differentiation-agent");
const {
  getLanguageFromLocation,
  getRegionalContext,
} = require("../utils/location-mapping");

class WeeklyPlannerAgent {
  constructor() {
    try {
      console.log("📚 Initializing SahayakOrchestrator...");
      this.sahayakOrchestrator = new SahayakOrchestrator();
      console.log("✅ SahayakOrchestrator initialized");

      console.log("📝 Initializing DifferentiationAgent...");
      this.differentiationAgent = new DifferentiationAgent();
      console.log("✅ DifferentiationAgent initialized");

      console.log("✅ WeeklyPlannerAgent constructor completed");
    } catch (error) {
      console.error("❌ Error in WeeklyPlannerAgent constructor:", error);
      throw error;
    }
  }

  async generatePlanStructure({
    syllabus,
    mustCoverTopics,
    grades,
    weekStart,
  }) {
    console.log("📋 generatePlanStructure called with:", {
      syllabus,
      mustCoverTopics,
      grades,
      weekStart,
    });

    try {
      const prompt = `
You are an expert Indian curriculum planner specializing in multi-grade classrooms.

IMPORTANT: You MUST respond with ONLY valid JSON. No explanations, no additional text, no markdown formatting.

Create a detailed 5-day lesson plan for:
- Syllabus: ${syllabus}
- Must cover topics: ${mustCoverTopics.join(", ")}
- Grades: ${grades.join(", ")}
- Week starting: ${weekStart}

If the topic is not age-appropriate, adapt it to be suitable for the grade level while maintaining the core learning objectives.

For Grade 1, adapt advanced topics to foundational concepts:
- Periodic Table → Basic classification of everyday materials (metals, non-metals, natural/artificial)
- Complex science → Simple observation and sorting activities
- Advanced math → Basic counting and pattern recognition

Respond with ONLY this JSON structure (no other text):
{
  "totalEstimatedHours": 15,
  "weeklyObjective": "Age-appropriate adaptation of ${syllabus} for ${grades.join(", ")}",
  "dailyBreakdown": {
    "${this.addDays(weekStart, 0)}": {
      "topic": "Introduction to Materials Around Us",
      "description": "Exploring different types of materials in our environment",
      "objectives": ["Identify different materials", "Sort materials by properties"],
      "keyPoints": ["Hard and soft materials", "Smooth and rough textures"],
      "activities": ["Material sorting game", "Touch and feel exploration"],
      "estimatedDuration": "3 hours"
    },
    "${this.addDays(weekStart, 1)}": {
      "topic": "Classifying Materials",
      "description": "Learning to group similar materials together",
      "objectives": ["Group materials by similarity"],
      "keyPoints": ["Same and different", "Material families"],
      "activities": ["Grouping activities", "Material matching games"],
      "estimatedDuration": "3 hours"
    },
    "${this.addDays(weekStart, 2)}": {
      "topic": "Properties of Materials",
      "description": "Understanding what makes materials special",
      "objectives": ["Describe material properties"],
      "keyPoints": ["Color, shape, size", "Heavy and light"],
      "activities": ["Property exploration", "Comparison activities"],
      "estimatedDuration": "3 hours"
    },
    "${this.addDays(weekStart, 3)}": {
      "topic": "Uses of Different Materials",
      "description": "How we use different materials in daily life",
      "objectives": ["Connect materials to their uses"],
      "keyPoints": ["Tools and materials", "Best material for the job"],
      "activities": ["Real-world examples", "Material-use matching"],
      "estimatedDuration": "3 hours"
    },
    "${this.addDays(weekStart, 4)}": {
      "topic": "Review and Fun Activities",
      "description": "Consolidate learning through games and activities",
      "objectives": ["Review all concepts learned"],
      "keyPoints": ["Material memory", "Classification skills"],
      "activities": ["Review games", "Material treasure hunt"],
      "estimatedDuration": "3 hours"
    }
  }
}`;

      console.log("🤖 Sending prompt to Gemini...");
      const response = await generateText(prompt);
      console.log("✅ Gemini response received");
      console.log("📄 Raw response preview:", response.substring(0, 200));

      console.log("🔄 Parsing Gemini response...");
      const parsed = parseGeminiResponse(response);
      console.log("✅ Response parsed successfully:", Object.keys(parsed));

      return parsed;
    } catch (error) {
      console.error("❌ Error in generatePlanStructure:", error);
      throw error;
    }
  }

  async processSingleDay(day, dayPlan, teacherId, grades, location, syllabus) {
    console.log(`📖 Processing content for ${day}: ${dayPlan.topic}`);

    try {
      // Create content and worksheet in parallel with timeout
      const [contentResult, worksheetResult] = await Promise.allSettled([
        Promise.race([
          this.createSahayakContent({
            teacherId,
            contentRequest: `${dayPlan.topic} - ${dayPlan.description}`,
            grades: grades.map((g) => g.replace("Grade ", "")),
          }),
          new Promise(
            (_, reject) =>
              setTimeout(
                () => reject(new Error("Content creation timeout")),
                120000
              ) // 2 min timeout
          ),
        ]),
        Promise.race([
          this.generateDifferentiatedWorksheet({
            teacherId,
            contextText: `Create worksheet for ${dayPlan.topic} covering ${dayPlan.keyPoints?.join(", ") || dayPlan.description}`,
            grades: grades.map((g) => g.replace("Grade ", "")),
            location,
            subject: this.inferSubject(syllabus),
            topic: dayPlan.topic,
          }),
          new Promise(
            (_, reject) =>
              setTimeout(
                () => reject(new Error("Worksheet creation timeout")),
                120000
              ) // 2 min timeout
          ),
        ]),
      ]);

      return {
        ...dayPlan,
        contentIds:
          contentResult.status === "fulfilled" && contentResult.value.success
            ? [contentResult.value.sessionId]
            : [],
        worksheetIds:
          worksheetResult.status === "fulfilled" &&
          worksheetResult.value.success
            ? [worksheetResult.value.materialId]
            : [],
        contentCreationStatus:
          contentResult.status === "fulfilled" && contentResult.value.success
            ? "completed"
            : "failed",
        worksheetCreationStatus:
          worksheetResult.status === "fulfilled" &&
          worksheetResult.value.success
            ? "completed"
            : "failed",
        contentError:
          contentResult.status === "rejected"
            ? contentResult.reason?.message
            : null,
        worksheetError:
          worksheetResult.status === "rejected"
            ? worksheetResult.reason?.message
            : null,
      };
    } catch (error) {
      console.error(`Error processing single day ${day}:`, error);
      throw error;
    }
  }

  // Keep all your existing methods (createSahayakContent, generateDifferentiatedWorksheet, etc.)
  // ... [rest of the methods remain the same as in your current implementation]

  async createSahayakContent({ teacherId, contentRequest, grades }) {
    try {
      console.log("Creating Sahayak content:", {
        teacherId,
        contentRequest,
        grades,
      });

      const result = await this.sahayakOrchestrator.processRequest(
        teacherId,
        contentRequest,
        grades
      );

      return {
        success: true,
        sessionId: result.sessionId,
        data: result,
      };
    } catch (error) {
      console.error("Error creating Sahayak content:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async generateDifferentiatedWorksheet({
    teacherId,
    contextText,
    grades,
    location,
    subject,
    topic,
  }) {
    try {
      console.log("Generating differentiated worksheet:", {
        teacherId,
        contextText,
        grades,
      });

      const language = getLanguageFromLocation(location);
      const regionalContext = getRegionalContext(location);

      const analysis = await this.analyzeContent(
        contextText,
        subject,
        topic,
        language,
        location
      );

      const request_for_agent = `
Subject: ${analysis.subject}
Topic: ${analysis.topic}
Content: ${analysis.content}
Key Terms: ${analysis.keyTerms?.join(", ") || ""}
Difficulty Level: ${analysis.difficulty}

Create differentiated worksheets for multi-grade classroom.
Include culturally relevant examples from ${location}.
Use local references: ${JSON.stringify(regionalContext)}
`;

      const differentiatedContent =
        await this.differentiationAgent.generateContent(
          request_for_agent,
          grades,
          language,
          location
        );

      const materialId = `diff-material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const materialData = {
        materialId,
        teacherId,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        analysis,
        versions: differentiatedContent.versions,
        commonObjectives: differentiatedContent.commonObjectives,
        differentiationStrategy: differentiatedContent.differentiationStrategy,
        targetGrades: grades,
        language,
        location,
        regionalContext,
        hasImage: false,
        hasContext: true,
        status: "completed",
      };

      await db
        .collection("differentiated_materials")
        .doc(materialId)
        .set(materialData);

      const libraryData = {
        content: {
          ...materialData,
          type: "differentiated_worksheet",
          createdBy: teacherId,
        },
        createdAt: new Date().toISOString(),
        subject: analysis.subject,
        language,
        location,
        grades,
        reliabilityScore: this.calculateReliabilityScore(
          analysis,
          differentiatedContent
        ),
        sessionId: materialId,
      };

      await db.collection("content_library").doc(materialId).set(libraryData);

      return {
        success: true,
        materialId,
        data: materialData,
      };
    } catch (error) {
      console.error("Error generating differentiated worksheet:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async analyzeContent(contextText, subject, topic, language, location) {
    try {
      const analysisPrompt = `
You are analyzing educational content for a ${language} speaking classroom in ${location}, India.

Analyze this educational request: "${contextText}"
Subject context: ${subject || "General"}
Topic context: ${topic || "Educational Content"}

Extract and provide analysis in JSON format:
{
  "subject": "identified subject (math, science, language, social studies, etc.)",
  "topic": "specific topic mentioned", 
  "content": "expanded content description",
  "difficulty": "suggested grade level (1-5)",
  "language": "detected or default language",
  "keyTerms": ["important terms from the request"],
  "objectives": ["inferred learning objectives"]
}

Consider Indian curriculum standards and ${location} regional context.
`;

      const response = await generateText(analysisPrompt);
      const parsed = parseGeminiResponse(response);

      return {
        subject: parsed.subject || subject || "General",
        topic: parsed.topic || topic || "Educational Content",
        content: parsed.content || contextText,
        difficulty: parsed.difficulty || "2",
        language: parsed.language || language,
        keyTerms: parsed.keyTerms || [],
        objectives: parsed.objectives || [],
      };
    } catch (error) {
      console.error("Error analyzing content:", error);
      return {
        subject: subject || "General",
        topic: topic || "Educational Content",
        content: contextText,
        difficulty: "2",
        language: language,
        keyTerms: [],
        objectives: [],
      };
    }
  }

  inferSubject(syllabus) {
    const syllabusLower = syllabus.toLowerCase();

    if (
      syllabusLower.includes("math") ||
      syllabusLower.includes("arithmetic") ||
      syllabusLower.includes("algebra")
    ) {
      return "Mathematics";
    } else if (
      syllabusLower.includes("science") ||
      syllabusLower.includes("physics") ||
      syllabusLower.includes("chemistry") ||
      syllabusLower.includes("biology") ||
      syllabusLower.includes("periodic")
    ) {
      return "Science";
    } else if (
      syllabusLower.includes("english") ||
      syllabusLower.includes("language") ||
      syllabusLower.includes("hindi")
    ) {
      return "Language";
    } else if (
      syllabusLower.includes("social") ||
      syllabusLower.includes("history") ||
      syllabusLower.includes("geography")
    ) {
      return "Social Studies";
    } else {
      return "General";
    }
  }

  calculateReliabilityScore(analysis, content) {
    let score = 0.5;

    if (analysis.subject && analysis.subject !== "General") score += 0.1;
    if (analysis.topic && analysis.topic !== "Educational Content")
      score += 0.1;
    if (analysis.keyTerms && analysis.keyTerms.length > 0) score += 0.1;
    if (content.versions && Object.keys(content.versions).length > 0)
      score += 0.2;

    return Math.min(score, 1.0);
  }

  addDays(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }
}

module.exports = WeeklyPlannerAgent;
