const { parseGeminiResponse } = require("../utils/helpers");
const { generateText } = require("../config/gemini");

/**
 * Differentiator Agent
 * Splits one lesson into 2-5 grade-level worksheets
 */
class DifferentiatorAgent {
  async differentiateWorksheet({ markdown, grades }) {
    const prompt = `
Take the following lesson and produce differentiated worksheets for grades ${grades.join(",")}.

Lesson:
${markdown}

Respond JSON:
{
  "worksheets": [
    {
      "grade": 3,
      "markdown": "<grade-3 worksheet markdown>"
    },
    {
      "grade": 5,
      "markdown": "<grade-5 worksheet markdown>"
    }
  ]
}
`;
    const raw = await generateText(prompt);
    return parseGeminiResponse(raw).worksheets;
  }
}

module.exports = { differentiatorAgent: new DifferentiatorAgent() };
