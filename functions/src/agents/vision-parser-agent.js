// functions/src/agents/vision-parser-agent.js
const { ImageAnnotatorClient } = require("@google-cloud/vision");
const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class VisionParserAgent {
  constructor() {
    this.visionClient = new ImageAnnotatorClient();
  }

  async parseTextbookImage(imageUrl) {
    try {
      // Detect text in the image
      const [textResult] = await this.visionClient.textDetection(imageUrl);
      const detectedText = textResult.textAnnotations?.[0]?.description || "";

      // Extract educational concepts
      const conceptPrompt = `
        Analyze this textbook content and extract:
        1. Main topic/subject
        2. Key concepts
        3. Grade level (estimate)
        4. Learning objectives
        5. Important facts
        
        Text: "${detectedText}"
        
        Provide response in JSON format:
        {
          "mainTopic": "topic name",
          "subject": "subject area",
          "estimatedGrade": "grade level",
          "keyConcepts": ["concept1", "concept2"],
          "learningObjectives": ["objective1", "objective2"],
          "importantFacts": ["fact1", "fact2"],
          "suggestedActivities": ["activity1", "activity2"]
        }
      `;

      const conceptAnalysis = await generateText(conceptPrompt);
      const parsedConcepts = parseGeminiResponse(conceptAnalysis);

      return {
        detectedText,
        concepts: parsedConcepts,
        imageUrl,
      };
    } catch (error) {
      console.error("Vision API error:", error);
      throw new Error("Failed to parse textbook image");
    }
  }
}

module.exports = VisionParserAgent;
