const { parseGeminiResponse } = require("../utils/helpers");
const { generateText } = require("../config/gemini");

/**
 * Visual-Artist Agent
 * Converts concept → blackboard-friendly SVG/PNG
 */
class VisualArtistAgent {
  async createVisualAid({ concept, grade }) {
    const prompt = `
Create a simple chalk-drawing SVG diagram for the concept "${concept}" suitable for Grade ${grade}.
Use only white lines on a dark background. No colors.
Embed any labels directly in the SVG.

Respond JSON:
{
  "svgData": "<raw SVG string>"
}
`;
    const raw = await generateText(prompt);
    return parseGeminiResponse(raw).svgData;
  }
}

module.exports = { visualArtistAgent: new VisualArtistAgent() };
