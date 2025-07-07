const { generateText } = require("../config/gemini");
const {
  getExperienceLevel,
  getAIPreferences,
  calculateProfileStrength,
} = require("../utils/helpers");

// Profile Agent using Gemini AI
class ProfileAgent {
  // Generate teacher profile summary
  async generateProfileSummary(teacherData) {
    const { name, grades, location, experience } = teacherData;

    const prompt = `
      Create a professional teacher profile summary for:
      Name: ${name}
      Grades: ${grades.join(", ")}
      Location: ${location}
      Experience: ${experience} years
      
      Generate a concise, professional summary (max 100 words) highlighting their teaching strengths and expertise.
    `;

    try {
      const summary = await generateText(prompt);
      return summary.trim();
    } catch (error) {
      console.error("Profile summary generation failed:", error);
      // Fallback to simple summary
      return `${name} teaches grades ${grades.join(", ")} in ${location} with ${experience} years of experience.`;
    }
  }

  // Process complete teacher profile
  async processProfile(teacherData) {
    const { id, name, grades, location, experience } = teacherData;

    try {
      // Generate AI summary
      const summary = await this.generateProfileSummary(teacherData);

      // Get experience level
      const experienceLevel = getExperienceLevel(experience);

      // Get AI preferences
      const aiPreferences = getAIPreferences(grades, experience);

      // Calculate profile strength
      const profileStrength = calculateProfileStrength(experience, grades);

      // Create matching criteria
      const matchingCriteria = {
        grades: grades,
        location: location,
        experienceLevel: experienceLevel,
        gradeScore: grades.length * 10,
        regionKey: location.toLowerCase().replace(/\s+/g, "_"),
      };

      return {
        teacherId: id,
        summary: summary,
        matchingCriteria: matchingCriteria,
        aiPreferences: aiPreferences,
        profileStrength: profileStrength,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Profile processing failed:", error);
      throw error;
    }
  }
}

module.exports = ProfileAgent;
