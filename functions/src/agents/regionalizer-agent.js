const admin = require("firebase-admin");
const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class RegionalizerAgent {
  constructor() {
    this.db = admin.firestore();
  }

  async regionalizeContent(teacherId, content, topic) {
    try {
      // Get teacher's location from profile
      const teacherDoc = await this.db
        .collection("teacherProfiles")
        .doc(teacherId)
        .get();
      const teacherData = teacherDoc.data();

      // Determine language based on location
      const language = this.getLanguageFromLocation(teacherData.location);

      // Get regional context
      const regionalContext = await this.getRegionalContext(language, topic);

      const prompt = `
        You are creating localized educational content for ${teacherData.location}.
        
        Original content: ${content}
        Topic: ${topic}
        Target language: ${language}
        Regional context: ${JSON.stringify(regionalContext)}
        
        Transform this content to include:
        1. Local cultural references and examples
        2. Regional dialect where appropriate
        3. Familiar local scenarios and places
        4. Traditional stories or folklore connections
        
        Return JSON format:
        {
          "localizedContent": "story with regional context",
          "culturalElements": ["element1", "element2"],
          "dialectWords": {"english": "local_translation"},
          "localExamples": ["example1", "example2"]
        }
      `;

      const response = await generateText(prompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("Regionalization error:", error);
      throw error;
    }
  }

  getLanguageFromLocation(location) {
    const locationLanguageMap = {
      Maharashtra: "Marathi",
      Karnataka: "Kannada",
      "Tamil Nadu": "Tamil",
      Gujarat: "Gujarati",
      Rajasthan: "Hindi",
      "West Bengal": "Bengali",
      // Add more mappings
    };

    for (const [state, language] of Object.entries(locationLanguageMap)) {
      if (location.includes(state)) return language;
    }
    return "Hindi"; // Default
  }

  async getRegionalContext(language, topic) {
    const regionalDoc = await this.db
      .collection("regional_prompts")
      .doc(language.toLowerCase())
      .collection("topics")
      .doc(topic)
      .get();

    if (regionalDoc.exists) {
      return regionalDoc.data();
    }

    // Create default regional context
    return {
      culturalSnippets: [],
      dialectWords: {},
      localExamples: [],
    };
  }
}

module.exports = RegionalizerAgent;
