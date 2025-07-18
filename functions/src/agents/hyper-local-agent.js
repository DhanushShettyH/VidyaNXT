const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class HyperLocalAgent {
  async generateContent(request, language, regionalContext) {
    const prompt = `
You are a hyper-local content generator for Indian teachers. Create culturally relevant educational content.

Request: ${request}
Language: ${language}
Regional Context: ${JSON.stringify(regionalContext)}

Generate a story that:
1. Uses local crops, festivals, and landmarks from the regional context
2. Incorporates local heroes and cultural references
3. Is written in simple ${language} (with English translation if needed)
4. Includes teaching tips for multi-grade classrooms
5. Maintains educational value while being culturally engaging

Return response in JSON format:
{
  "story": "main story content",
  "culturalContext": {
    "localReferences": ["list of local references used"],
    "culturalConnections": ["connections to local culture"]
  },
  "teachingTips": ["tips for using this content in classroom"],
  "language": "${language}",
  "englishTranslation": "if not in English"
}
`;

    const response = await generateText(prompt);
    return parseGeminiResponse(response);
  }
}

module.exports = HyperLocalAgent;
