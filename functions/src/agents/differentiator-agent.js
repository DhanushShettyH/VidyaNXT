const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");
const admin = require("firebase-admin");
const db = admin.firestore();

class DifferentiatorAgent {
  constructor() {
    this.name = "Differentiator Agent";
  }

  async createGradeLevels(content, targetGrades, subject) {
    try {
      const curriculumData = await this.getCurriculumStandards(
        targetGrades,
        subject
      );

      const differentiationPrompt = `
        You are an expert in multi-grade differentiation for Indian classrooms.
        
        Original Content: ${content}
        Target Grades: ${targetGrades.join(", ")}
        Subject: ${subject}
        
        Curriculum Standards:
        ${JSON.stringify(curriculumData, null, 2)}
        
        Create grade-appropriate versions that:
        1. Adjust vocabulary complexity
        2. Modify concept depth
        3. Change activity difficulty
        4. Adapt assessment methods
        
        Return in JSON format:
        {
          "gradeLevels": [
            {
              "grade": 1,
              "content": "simplified version",
              "vocabulary": ["easy", "words"],
              "activities": ["hands-on activities"],
              "assessments": ["simple questions"]
            }
          ],
          "commonElements": ["shared concepts"],
          "progressionMap": {"concept": ["grade1_level", "grade2_level"]}
        }
      `;

      const response = await generateText(differentiationPrompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("Differentiation failed:", error);
      throw error;
    }
  }

  async getCurriculumStandards(grades, subject) {
    const standards = {};

    for (const grade of grades) {
      const docRef = db
        .collection("curriculum_standards")
        .doc(`grade_${grade}_${subject}`);
      const doc = await docRef.get();

      if (doc.exists) {
        standards[grade] = doc.data();
      } else {
        standards[grade] = await this.createDefaultStandards(grade, subject);
        await docRef.set(standards[grade]);
      }
    }

    return standards;
  }

  async createDefaultStandards(grade, subject) {
    const standardsPrompt = `
      Create curriculum standards for Grade ${grade}, ${subject} subject in Indian education system.
      
      Include:
      1. Learning objectives
      2. Vocabulary level
      3. Concept complexity
      4. Assessment methods
      5. Activity types
      
      Return in JSON format:
      {
        "learningObjectives": ["specific objectives"],
        "vocabularyLevel": "beginner/intermediate/advanced",
        "conceptComplexity": "concrete/abstract",
        "assessmentMethods": ["observation", "oral", "written"],
        "preferredActivities": ["hands-on", "group work", "individual"]
      }
    `;

    const response = await generateText(standardsPrompt);
    return parseGeminiResponse(response);
  }
}

module.exports = new DifferentiatorAgent();
