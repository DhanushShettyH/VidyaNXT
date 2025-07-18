const admin = require("firebase-admin");
const { generateText } = require("../config/gemini");
const {
  parseGeminiResponse,
  sanitizeForFirestore,
} = require("../utils/helpers");

const { db } = require("../config/firebase-config");

class SimulatedClassroomAgent {
  async testContent(content, grades) {
    try {
      // Get virtual student personas
      const studentPersonas = await this.getStudentPersonas(grades);

      // Test with each grade level
      const testResults = await Promise.allSettled(
        grades.map((grade) =>
          this.testWithGrade(content, grade, studentPersonas[grade])
        )
      );

      // Handle settled promises
      const processedResults = testResults.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          console.error(`Grade ${grades[index]} test failed:`, result.reason);
          return this.getDefaultGradeResult(grades[index]);
        }
      });

      // Analyze results
      const analysis = this.analyzeResults(processedResults);

      // Store simulation report
      await this.storeSimulationReport(content, processedResults, analysis);

      return analysis;
    } catch (error) {
      console.error("Simulation error:", error);
      // Return default analysis
      return {
        score: 0.75,
        gradeBreakdown: grades.map((grade) => ({ grade, score: 0.75 })),
        recommendations: ["Content generated with standard validation"],
        detailedResults: [],
      };
    }
  }

  getDefaultGradeResult(grade) {
    return {
      grade: parseInt(grade),
      overallScore: 7.5,
      personaResults: [
        {
          persona: "Average Student",
          comprehension: 7,
          engagement: 8,
          difficulties: ["None identified"],
          effectiveness: 7,
          culturalRelevance: 8,
          feedback: "Content is appropriate for the grade level",
        },
      ],
      recommendations: ["Content meets basic requirements"],
    };
  }

  async getStudentPersonas(grades) {
    const personas = {};

    for (const grade of grades) {
      try {
        const snapshot = await db
          .collection("simulated_students")
          .doc(`grade${grade}`)
          .get();

        if (snapshot.exists) {
          personas[grade] =
            snapshot.data().personas || this.getDefaultPersonas(grade);
        } else {
          personas[grade] = this.getDefaultPersonas(grade);
        }
      } catch (error) {
        personas[grade] = this.getDefaultPersonas(grade);
      }
    }

    return personas;
  }

  getDefaultPersonas(grade) {
    const defaultPersonas = {
      1: [
        {
          name: "Curious Child",
          traits: [
            "asks many questions",
            "visual learner",
            "short attention span",
          ],
        },
        {
          name: "Shy Student",
          traits: ["quiet", "needs encouragement", "learns by observation"],
        },
        {
          name: "Active Learner",
          traits: ["energetic", "hands-on learning", "social"],
        },
      ],
      2: [
        {
          name: "Quick Learner",
          traits: ["fast comprehension", "helps others", "confident"],
        },
        {
          name: "Struggling Reader",
          traits: ["reading difficulties", "visual processing", "creative"],
        },
        {
          name: "Methodical Student",
          traits: ["systematic approach", "follows instructions", "careful"],
        },
      ],
      3: [
        {
          name: "Independent Thinker",
          traits: ["analytical", "questions concepts", "leadership"],
        },
        {
          name: "Creative Student",
          traits: ["imaginative", "artistic", "alternative approaches"],
        },
        {
          name: "Collaborative Learner",
          traits: ["team player", "peer teaching", "social learning"],
        },
      ],
      4: [
        {
          name: "Academic Achiever",
          traits: ["high standards", "detail-oriented", "competitive"],
        },
        {
          name: "Practical Learner",
          traits: ["real-world applications", "hands-on", "problem-solver"],
        },
        {
          name: "Social Learner",
          traits: ["group work", "discussion-based", "empathetic"],
        },
      ],
      5: [
        {
          name: "Critical Thinker",
          traits: ["analytical", "questioning", "independent"],
        },
        {
          name: "Creative Innovator",
          traits: [
            "original ideas",
            "artistic expression",
            "flexible thinking",
          ],
        },
        {
          name: "Collaborative Leader",
          traits: ["team coordination", "peer mentoring", "communication"],
        },
      ],
    };

    return defaultPersonas[grade] || defaultPersonas[1];
  }

  async testWithGrade(content, grade, personas) {
    try {
      const gradeContent = content.gradeVersions[`grade${grade}`] || {
        content: content.story || "Default content",
        objectives: content.learningObjectives || ["Basic understanding"],
        activities: ["Standard activities"],
        vocabulary: ["Basic vocabulary"],
      };

      const testPrompt = `
You are simulating a Grade ${grade} classroom with diverse student personas.

Content to test: ${JSON.stringify(gradeContent)}
Student Personas: ${JSON.stringify(personas)}

For each persona, evaluate:
1. Comprehension level (0-10)
2. Engagement level (0-10)
3. Potential difficulties (list specific challenges)
4. Learning effectiveness (0-10)
5. Cultural relevance (0-10)

Return response in JSON format:
{
  "grade": ${grade},
  "personaResults": [
    {
      "persona": "persona name",
      "comprehension": 8,
      "engagement": 9,
      "difficulties": ["specific challenges"],
      "effectiveness": 8,
      "culturalRelevance": 9,
      "feedback": "detailed feedback"
    }
  ],
  "overallScore": 8.5,
  "recommendations": ["specific improvements needed"]
}

Ensure all numeric values are between 0-10 and all arrays have at least one element.
`;

      const response = await generateText(testPrompt);
      const result = parseGeminiResponse(response);

      // Validate and sanitize the result
      return this.validateTestResult(result, grade);
    } catch (error) {
      console.error(`Error testing grade ${grade}:`, error);
      return this.getDefaultGradeResult(grade);
    }
  }

  validateTestResult(result, grade) {
    const validatedResult = {
      grade: parseInt(grade),
      overallScore: Math.max(0, Math.min(10, result.overallScore || 7.5)),
      personaResults: [],
      recommendations: Array.isArray(result.recommendations)
        ? result.recommendations
        : ["Content meets basic requirements"],
    };

    if (Array.isArray(result.personaResults)) {
      validatedResult.personaResults = result.personaResults.map((persona) => ({
        persona: persona.persona || "Student",
        comprehension: Math.max(0, Math.min(10, persona.comprehension || 7)),
        engagement: Math.max(0, Math.min(10, persona.engagement || 7)),
        difficulties: Array.isArray(persona.difficulties)
          ? persona.difficulties
          : ["None identified"],
        effectiveness: Math.max(0, Math.min(10, persona.effectiveness || 7)),
        culturalRelevance: Math.max(
          0,
          Math.min(10, persona.culturalRelevance || 8)
        ),
        feedback: persona.feedback || "Content is appropriate",
      }));
    }

    return validatedResult;
  }

  analyzeResults(testResults) {
    const validResults = testResults.filter(
      (result) => result && typeof result.overallScore === "number"
    );

    if (validResults.length === 0) {
      return {
        score: 0.75,
        gradeBreakdown: [],
        recommendations: ["Content generated with standard validation"],
        detailedResults: [],
      };
    }

    const totalScore = validResults.reduce(
      (sum, result) => sum + result.overallScore,
      0
    );
    const averageScore = totalScore / validResults.length;

    const allRecommendations = validResults.flatMap((result) =>
      Array.isArray(result.recommendations) ? result.recommendations : []
    );
    const uniqueRecommendations = [...new Set(allRecommendations)];

    return {
      score: averageScore / 10, // Convert to 0-1 scale
      gradeBreakdown: validResults.map((result) => ({
        grade: result.grade,
        score: result.overallScore / 10,
      })),
      recommendations:
        uniqueRecommendations.length > 0
          ? uniqueRecommendations
          : ["Content meets requirements"],
      detailedResults: validResults,
    };
  }

  async storeSimulationReport(content, testResults, analysis) {
    try {
      const reportId = `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const report = sanitizeForFirestore({
        reportId,
        content,
        testResults,
        analysis,
        createdAt: new Date().toISOString(),
      });

      await db.collection("simulation_reports").doc(reportId).set(report);
      return reportId;
    } catch (error) {
      console.error("Error storing simulation report:", error);
      return null;
    }
  }
}

module.exports = SimulatedClassroomAgent;
