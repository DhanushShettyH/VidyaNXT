const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");
const admin = require("firebase-admin");
const db = admin.firestore();

class SimulationAgent {
  constructor() {
    this.name = "Simulation Agent";
  }

  async runClassroomSimulation(content, grades, subject) {
    try {
      // Get virtual students for each grade
      const virtualStudents = await this.getVirtualStudents(grades);

      // Run simulation for each grade
      const simulationResults = [];

      for (const grade of grades) {
        const gradeStudents = virtualStudents.filter((s) => s.grade === grade);
        const gradeResult = await this.simulateGradeResponse(
          content,
          gradeStudents,
          subject
        );
        simulationResults.push(gradeResult);
      }

      // Analyze overall reliability
      const reliabilityScore =
        this.calculateReliabilityScore(simulationResults);

      const reportId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const report = {
        reportId,
        content,
        grades,
        subject,
        simulationResults,
        reliabilityScore,
        recommendations: this.generateRecommendations(simulationResults),
        createdAt: new Date().toISOString(),
      };

      // Store simulation report
      await db.collection("simulation_reports").doc(reportId).set(report);

      return report;
    } catch (error) {
      console.error("Simulation failed:", error);
      throw error;
    }
  }

  async getVirtualStudents(grades) {
    const students = [];

    for (const grade of grades) {
      const docRef = db.collection("simulated_students").doc(`grade_${grade}`);
      const doc = await docRef.get();

      if (doc.exists) {
        students.push(...doc.data().personas);
      } else {
        // Create default virtual students
        const defaultStudents = await this.createDefaultVirtualStudents(grade);
        await docRef.set({ personas: defaultStudents });
        students.push(...defaultStudents);
      }
    }

    return students;
  }

  async createDefaultVirtualStudents(grade) {
    const studentPrompt = `
      Create 3 diverse virtual student personas for Grade ${grade} in Indian multi-grade classroom.
      
      Include different:
      1. Learning speeds (fast, average, slow)
      2. Home languages (Hindi, regional languages)
      3. Attention spans
      4. Common misconceptions for this grade
      5. Learning preferences
      
      Return in JSON format:
      {
        "personas": [
          {
            "id": "g${grade}_fast_learner",
            "name": "Student Name",
            "grade": ${grade},
            "learningSpeed": "fast",
            "attentionSpan": "high",
            "homeLang": "Hindi",
            "readingLevel": ${grade + 0.5},
            "misconceptions": ["common misconception"],
            "strengths": ["verbal skills"],
            "challenges": ["sitting still"]
          }
        ]
      }
    `;

    const response = await generateText(studentPrompt);
    const result = parseGeminiResponse(response);
    return result.personas;
  }

  async simulateGradeResponse(content, students, subject) {
    const simulationPrompt = `
      You are simulating how Grade ${students[0].grade} students would respond to this content.
      
      Content: ${content}
      Subject: ${subject}
      
      Virtual Students:
      ${JSON.stringify(students, null, 2)}
      
      Simulate realistic responses considering:
      1. Age-appropriate comprehension
      2. Attention span limitations
      3. Common misconceptions
      4. Language barriers
      5. Cultural context
      
      Return in JSON format:
      {
        "grade": ${students[0].grade},
        "comprehensionRate": 0.85,
        "engagementLevel": "high",
        "commonQuestions": ["What is this?"],
        "difficulties": ["vocabulary too hard"],
        "successIndicators": ["showed interest"],
        "recommendedChanges": ["use simpler words"]
      }
    `;

    const response = await generateText(simulationPrompt);
    return parseGeminiResponse(response);
  }

  calculateReliabilityScore(simulationResults) {
    const totalScore = simulationResults.reduce((sum, result) => {
      return sum + result.comprehensionRate;
    }, 0);

    return Math.round((totalScore / simulationResults.length) * 100) / 100;
  }

  generateRecommendations(simulationResults) {
    const recommendations = [];

    simulationResults.forEach((result) => {
      if (result.comprehensionRate < 0.7) {
        recommendations.push(
          `Grade ${result.grade}: Simplify vocabulary and concepts`
        );
      }
      if (result.engagementLevel === "low") {
        recommendations.push(
          `Grade ${result.grade}: Add more interactive elements`
        );
      }
      recommendations.push(...result.recommendedChanges);
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

module.exports = new SimulationAgent();
