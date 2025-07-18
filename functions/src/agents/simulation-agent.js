const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class SimulationAgent {
  constructor() {
    this.db = admin.firestore();
  }

  async createVirtualStudents() {
    const virtualStudents = {
      grade1: [
        {
          id: "g1_eager_learner",
          readingLevel: 1.2,
          attentionSpan: "short",
          learningStyle: "visual",
          characteristics: ["enthusiastic", "needs_repetition"],
        },
        {
          id: "g1_shy_student",
          readingLevel: 0.8,
          attentionSpan: "medium",
          learningStyle: "kinesthetic",
          characteristics: ["quiet", "observational"],
        },
      ],
      grade2: [
        {
          id: "g2_advanced_reader",
          readingLevel: 2.5,
          attentionSpan: "long",
          learningStyle: "auditory",
          characteristics: ["curious", "asks_questions"],
        },
      ],
      grade3: [
        {
          id: "g3_struggling_reader",
          readingLevel: 2.1,
          attentionSpan: "medium",
          learningStyle: "visual",
          characteristics: ["hardworking", "needs_support"],
        },
      ],
    };

    // Store in Firestore
    for (const [grade, students] of Object.entries(virtualStudents)) {
      await this.db
        .collection("simulated_students")
        .doc(grade)
        .set({
          grade: parseInt(grade.replace("grade", "")),
          personas: students,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    return virtualStudents;
  }

  async testContentReliability(content, grades) {
    const simulationPrompt = `
      Test this educational content with virtual students from grades ${grades.join(", ")}:
      
      Content: ${JSON.stringify(content)}
      
      Simulate how students would respond based on:
      1. Reading comprehension level
      2. Attention span
      3. Learning style preferences
      4. Common misconceptions for each grade
      
      Return JSON format:
      {
        "overallScore": 0.85,
        "gradeResults": [
          {
            "grade": 1,
            "comprehensionScore": 0.8,
            "engagementScore": 0.9,
            "issues": ["vocabulary too complex"],
            "suggestions": ["use simpler words"]
          }
        ],
        "recommendations": ["overall improvement suggestions"]
      }
    `;

    const response = await generateText(simulationPrompt);
    return parseGeminiResponse(response);
  }
}

module.exports = SimulationAgent;
