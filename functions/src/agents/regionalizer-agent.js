const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");
const admin = require("firebase-admin");
const db = admin.firestore();

class RegionalizerAgent {
  constructor() {
    this.name = "Regionalizer Agent";
  }

  async localizeContent(prompt, language, region, subject) {
    try {
      // Fetch regional context
      const regionalData = await this.getRegionalContext(
        language,
        region,
        subject
      );

      const localizationPrompt = `
        You are a regional content expert for ${region}, ${language} language.
        
        Original Request: ${prompt}
        
        Regional Context:
        - Local dialect words: ${JSON.stringify(regionalData.dialectWords)}
        - Cultural references: ${regionalData.culturalSnippets.join(", ")}
        - Local examples: ${regionalData.localExamples.join(", ")}
        
        Create culturally relevant content that:
        1. Uses local dialect naturally
        2. Includes regional examples and references
        3. Mentions local landmarks, festivals, or traditions
        4. Uses familiar cultural contexts
        
        Return in JSON format:
        {
          "localizedContent": "content with regional context",
          "culturalElements": ["list of cultural elements used"],
          "dialectWords": {"standard": "local"},
          "confidence": 0.95
        }
      `;

      const response = await generateText(localizationPrompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("Regionalization failed:", error);
      throw error;
    }
  }

  async getRegionalContext(language, region, subject) {
    const docRef = db
      .collection("regional_knowledge")
      .doc(`${language}_${region}_${subject}`);
    const doc = await docRef.get();

    if (doc.exists) {
      return doc.data();
    }

    // Create default regional context
    const defaultContext = await this.createDefaultRegionalContext(
      language,
      region,
      subject
    );
    await docRef.set(defaultContext);
    return defaultContext;
  }

  async createDefaultRegionalContext(language, region, subject) {
    const contextPrompt = `
      Create regional educational context for ${region}, ${language} language, ${subject} subject.
      
      Provide:
      1. Common dialect words for educational terms
      2. Local cultural references relevant to ${subject}
      3. Regional examples and case studies
      4. Traditional knowledge connections
      
      Return in JSON format:
      {
        "dialectWords": {"soil": "माती", "water": "पाणी"},
        "culturalSnippets": ["Sant Tukaram stories", "Warli art"],
        "localExamples": ["Kolhapur farming", "Konkan coast"],
        "festivals": ["Gudi Padwa", "Ganesh Chaturthi"],
        "landmarks": ["Sahyadri mountains", "Godavari river"]
      }
    `;

    const response = await generateText(contextPrompt);
    return parseGeminiResponse(response);
  }
}

module.exports = new RegionalizerAgent();
