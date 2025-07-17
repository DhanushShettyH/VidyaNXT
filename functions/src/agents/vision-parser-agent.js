const { parseGeminiResponse } = require("../utils/helpers");
const { generateText } = require("../config/gemini");

/**
 * Vision Parser Agent
 * OCR + concept extraction from textbook photo (via Google Vision text)
 * Expects base64 image string
 */
class VisionParserAgent {
  async extractConcepts({ imageBase64, mimeType = "image/jpeg" }) {
    // Step-1  : Ask Gemini to OCR + extract
    const prompt = `
Analyze the provided textbook image.

Return JSON:
{
  "rawText": "<all visible text>",
  "concepts": ["list", "of", "key", "concepts"],
  "gradeEstimate": 3
}
`;
    const imagePart = { inlineData: { data: imageBase64, mimeType } };
    const raw = await generateText([prompt, imagePart]);
    return parseGeminiResponse(raw);
  }
}

module.exports = { visionParserAgent: new VisionParserAgent() };
