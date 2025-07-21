const admin = require("firebase-admin");
const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

const { db } = require("../config/firebase-config");

class DifferentiationAgent {
  async generateContent(request, grades, language, location) {
    // Get curriculum standards for the location and grades
    const curriculumData = await this.getCurriculumStandards(location, grades);

    const prompt = `
You are an expert in differentiated instruction for multi-grade classrooms in India.

Request: ${request}
Target Grades: ${grades.join(", ")}
Language: ${language}
Location: ${location}
Curriculum Standards: ${JSON.stringify(curriculumData)}

Create differentiated versions of the content for each grade level:
1. Ensure age-appropriate complexity
2. Align with curriculum standards
3. Include specific learning objectives
4. Provide assessment criteria
5. Consider reading levels and comprehension abilities

Return response in JSON format:
{
  "versions": {
    "grade1": {
      "content": "simplified version",
      "objectives": ["learning objectives"],
      "activities": ["grade-appropriate activities"],
      "vocabulary": ["key terms for this grade"]
    },
    "grade2": {
      "content": "intermediate version",
      "objectives": ["learning objectives"],
      "activities": ["grade-appropriate activities"],
      "vocabulary": ["key terms for this grade"]
    },
    "grade3": {
      "content": "advanced version",
      "objectives": ["learning objectives"],
      "activities": ["grade-appropriate activities"],
      "vocabulary": ["key terms for this grade"]
    }
  },
  "commonObjectives": ["shared learning goals"],
  "differentiationStrategy": "explanation of how content is differentiated"
}
`;

    const response = await generateText(prompt);
    return parseGeminiResponse(response);
  }

  async getCurriculumStandards(location, grades) {
    try {
      const standardsPromises = grades.map((grade) =>
        db
          .collection("curriculum_standards")
          .doc(location.toLowerCase())
          .collection(grade)
          .get()
      );

      const results = await Promise.all(standardsPromises);
      const standards = {};

      results.forEach((snapshot, index) => {
        standards[`grade${grades[index]}`] = snapshot.docs.map((doc) =>
          doc.data()
        );
      });

      return standards;
    } catch (error) {
      console.error("Error fetching curriculum standards:", error);
      // Return default standards if none found
      return this.getDefaultStandards(grades);
    }
  }

  async processImageBasedContent(analysisResult, grades, language, location) {
    const curriculumData = await this.getCurriculumStandards(location, grades);
    const regionalContext =
      require("../utils/location-mapping").getRegionalContext(location);

    const prompt = `
  You are an expert teacher creating differentiated learning materials for multi-grade classrooms in ${location}, India.
  
  Content Analysis:
  - Subject: ${analysisResult.subject}
  - Topic: ${analysisResult.topic}  
  - Content: ${analysisResult.content}
  - Key Terms: ${analysisResult.keyTerms?.join(", ") || "None"}
  - Difficulty Level: ${analysisResult.difficulty}
  
  Target Grades: ${grades.join(", ")}
  Language: ${language}
  Regional Context: ${JSON.stringify(regionalContext)}
  
  Create differentiated worksheet versions for each grade level that:
  1. Adapt complexity appropriately for each grade
  2. Include local cultural references from ${location}
  3. Use grade-appropriate vocabulary and sentence structure
  4. Provide hands-on activities suitable for low-resource classrooms
  5. Include assessment questions of varying difficulty
  
  Response format JSON:
  {
    "versions": {
      ${grades
        .map(
          (grade) => `"grade${grade}": {
        "content": "main lesson adapted for grade ${grade}",
        "objectives": ["specific learning objectives for grade ${grade}"],
        "activities": ["hands-on activities for grade ${grade}"],
        "vocabulary": ["key terms with simple definitions for grade ${grade}"],
        "assessmentQuestions": ["evaluation questions for grade ${grade}"]
      }`
        )
        .join(",\n      ")}
    },
    "commonObjectives": ["shared learning goals across all grades"],
    "differentiationStrategy": "explanation of how content varies by grade level"
  }
  `;

    const response = await generateText(prompt);
    return parseGeminiResponse(response);
  }

  getDefaultStandards(grades) {
    const defaultStandards = {
      grade1: [
        {
          subject: "science",
          topic: "basic observation skills",
          level: "beginner",
        },
        { subject: "language", topic: "simple vocabulary", level: "beginner" },
      ],
      grade2: [
        {
          subject: "science",
          topic: "classification and sorting",
          level: "intermediate",
        },
        {
          subject: "language",
          topic: "sentence formation",
          level: "intermediate",
        },
      ],
      grade3: [
        {
          subject: "science",
          topic: "basic scientific concepts",
          level: "advanced",
        },
        { subject: "language", topic: "paragraph writing", level: "advanced" },
      ],
    };

    const result = {};
    grades.forEach((grade) => {
      result[`grade${grade}`] = defaultStandards[`grade${grade}`] || [];
    });

    return result;
  }
}

module.exports = DifferentiationAgent;
