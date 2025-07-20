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
// Add this function to your existing helpers.js
function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== null);
  }

  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedValue = sanitizeForFirestore(value);
      // CRITICAL: Allow empty strings for SVG code and other fields
      if (sanitizedValue !== null && sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }
    return sanitized;
  }

  // Return the value as-is for strings (including SVG code)
  return obj;
}

function validateContentStructure(content) {
  const defaultContent = {
    story: content.story || "",
    gradeVersions: content.gradeVersions || {},
    visualAids: content.visualAids || { aids: [], handsonActivities: [] },
    culturalContext: content.culturalContext || {
      localReferences: [],
      culturalConnections: [],
    },
    learningObjectives: content.learningObjectives || [],
    teachingTips: content.teachingTips || [],
  };

  // Ensure grade versions have proper structure
  Object.keys(defaultContent.gradeVersions).forEach((grade) => {
    const version = defaultContent.gradeVersions[grade];
    defaultContent.gradeVersions[grade] = {
      content: version.content || "",
      objectives: version.objectives || [],
      activities: version.activities || [],
      vocabulary: version.vocabulary || [],
    };
  });

  // CRITICAL: Ensure visual aids preserve svgCode
  if (defaultContent.visualAids.aids) {
    defaultContent.visualAids.aids = defaultContent.visualAids.aids.map(
      (aid) => ({
        type: aid.type || "svg",
        title: aid.title || "Visual Aid",
        description: aid.description || "",
        svgCode: aid.svgCode || "", // PRESERVE SVG CODE
        imageUrl:
          aid.imageUrl ||
          (aid.type === "image" ? "placeholder_url_if_missing" : ""), // NEW: Prioritize and preserve imageUrl for images
        teachingPoints: aid.teachingPoints || [],
        interactiveElements: aid.interactiveElements || [],
        drawingInstructions: aid.drawingInstructions || [],
        materials: aid.materials || [],
      })
    );
  }

  // Ensure hands-on activities have proper structure
  if (defaultContent.visualAids.handsonActivities) {
    defaultContent.visualAids.handsonActivities =
      defaultContent.visualAids.handsonActivities.map((activity) => ({
        name: activity.name || "Activity",
        materials: activity.materials || [],
        steps: activity.steps || [],
        learningOutcome: activity.learningOutcome || "",
      }));
  }

  return defaultContent;
}

// Update the existing parseGeminiResponse function

function parseGeminiResponse(responseText) {
  try {
    let cleanText = responseText.trim();

    // Remove markdown code blocks
    cleanText = cleanText.replace(/^```json\s*/g, "");
    cleanText = cleanText.replace(/^```\s*/g, "");
    cleanText = cleanText.replace(/\s*```$/g, "");

    // Remove control characters that break JSON parsing
    cleanText = cleanText.replace(/[\x00-\x1F\x7F]/g, "");

    // Handle trailing non-JSON content
    const jsonEnd = cleanText.lastIndexOf("}");
    if (jsonEnd !== -1) {
      const potentialJson = cleanText.substring(0, jsonEnd + 1);
      try {
        JSON.parse(potentialJson);
        cleanText = potentialJson;
      } catch (e) {
        // If invalid, proceed with original cleanup
      }
    }

    // Additional cleanup
    cleanText = cleanText.replace(/\*\*Note:\*\*.*/g, "");

    const parsed = JSON.parse(cleanText);
    console.log("✅ Successfully parsed Gemini response");
    return parsed;
  } catch (error) {
    console.error(
      "❌ Failed to parse Gemini response:",
      responseText.substring(0, 500)
    );
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
  sanitizeForFirestore,
  validateContentStructure,
};
