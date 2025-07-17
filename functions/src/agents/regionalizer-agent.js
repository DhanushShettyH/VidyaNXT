const { parseGeminiResponse } = require("../utils/helpers");
const { generateText } = require("../config/gemini");

/**
 * Regionalizer Agent
 * Injects dialect, cultural references & local examples into any prompt
 */
class RegionalizerAgent {
  async regionalizePrompt({ originalPrompt, language, district, state }) {
    const prompt = `
You are a ${language} teacher from ${district}, ${state}.
Rewrite the following prompt so it contains:
- local dialect words
- cultural references children know
- relatable village examples
Keep the academic meaning identical.

Original prompt:
${originalPrompt}

Respond JSON:
{
  "regionalizedPrompt": "<new prompt>"
}
`;
    const raw = await generateText(prompt);
    return parseGeminiResponse(raw).regionalizedPrompt;
  }
}

module.exports = { regionalizerAgent: new RegionalizerAgent() };
