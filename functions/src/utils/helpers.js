const { EXPERIENCE_LEVELS, AI_PREFERENCES } = require("../config/constants");

// Determine experience level based on years
function getExperienceLevel(years) {
  if (years < 3) return EXPERIENCE_LEVELS.NOVICE;
  if (years < 10) return EXPERIENCE_LEVELS.EXPERIENCED;
  return EXPERIENCE_LEVELS.VETERAN;
}

// Get AI interaction preferences
function getAIPreferences(grades, experienceYears) {
  const experienceLevel = getExperienceLevel(experienceYears);

  return {
    preferredInteractionStyle:
      experienceYears < 5
        ? AI_PREFERENCES.SUPPORTIVE
        : AI_PREFERENCES.COLLABORATIVE,
    topicExpertise: determineTopicExpertise(grades, experienceYears),
    communicationPreference:
      experienceLevel === EXPERIENCE_LEVELS.NOVICE
        ? AI_PREFERENCES.DETAILED
        : AI_PREFERENCES.CONCISE,
  };
}

// Simple topic expertise determination
function determineTopicExpertise(grades, experience) {
  const gradeTypes = [];

  // Check for elementary grades
  if (grades.some((g) => ["K", "1", "2", "3", "4", "5"].includes(g))) {
    gradeTypes.push("elementary");
  }

  // Check for middle school grades
  if (grades.some((g) => ["6", "7", "8"].includes(g))) {
    gradeTypes.push("middle_school");
  }

  // Check for high school grades
  if (grades.some((g) => ["9", "10", "11", "12"].includes(g))) {
    gradeTypes.push("high_school");
  }

  return gradeTypes;
}

// Calculate profile strength
function calculateProfileStrength(experienceYears, grades) {
  return Math.min(100, experienceYears * 5 + grades.length * 15);
}

// Wait/delay helper
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGeminiResponse(responseText) {
  try {
    // Remove markdown code blocks if present
    let cleanText = responseText.trim();

    // Remove ```json and ``` if present
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\s*/, "");
    }
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\s*/, "");
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.replace(/\s*```$/, "");
    }

    // Parse the cleaned JSON
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Failed to parse Gemini response:", responseText);
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}

module.exports = {
  getExperienceLevel,
  getAIPreferences,
  determineTopicExpertise,
  calculateProfileStrength,
  delay,
  parseGeminiResponse,
};
