// functions/src/agents/training-agent.js
const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class TrainingAgent {
  constructor() {
    this.name = "TrainingAgent";
  }

  async analyzeTeacherNeeds(teacherData, progressData, wellnessData) {
    const prompt = `
    Analyze this teacher's training needs:
    
    Teacher: ${JSON.stringify(teacherData, null, 2)}
    Progress: ${JSON.stringify(progressData, null, 2)}
    Wellness: ${JSON.stringify(wellnessData, null, 2)}
    
    Identify:
    1. Immediate skill gaps
    2. Stress-related training needs
    3. Experience-level appropriate content
    4. Priority training areas
    
    Return analysis as JSON with recommendations.
    `;

    const response = await generateText(prompt);
    return parseGeminiResponse(response);
  }

  async generateMicroLearning(topic, duration = 10) {
    const prompt = `
    Create a ${duration}-minute micro-learning module on "${topic}" for multi-grade classroom teachers.
    
    Include:
    - Quick practical tips
    - Real-world scenarios
    - Actionable steps
    - Self-assessment question
    
    Make it engaging and immediately applicable.
    `;

    const response = await generateText(prompt);
    return parseGeminiResponse(response);
  }

  async createCommunityModule(successStories, challenges) {
    const prompt = `
    Create a training module from these community insights:
    
    Success Stories: ${JSON.stringify(successStories, null, 2)}
    Common Challenges: ${JSON.stringify(challenges, null, 2)}
    
    Structure as a peer-learning module with:
    1. Challenge identification
    2. Peer solutions
    3. Implementation guide
    4. Reflection questions
    `;

    const response = await generateText(prompt);
    return parseGeminiResponse(response);
  }
}

module.exports = TrainingAgent;
