const { parseGeminiResponse } = require("../utils/helpers");
const { generateText } = require("../config/gemini");

/**
 * Planner Agent
 * Builds weekly multi-grade timetable & slots activities
 */
class PlannerAgent {
  async buildWeeklyPlan({ teacherId, language, grades, startDate }) {
    const prompt = `
Build a one-week timetable for a rural teacher handling grades ${grades.join(",")}.
Language of instruction: ${language}
Week starts: ${startDate}
Each day has 5 periods.
Return JSON:
{
  "slots": [
    {
      "day": "Mon",
      "period": 1,
      "grade": 3,
      "topic": "soil",
      "activity": "story",
      "resourceURL": ""
    }
  ]
}
`;
    const raw = await generateText(prompt);
    return parseGeminiResponse(raw);
  }
}

module.exports = { plannerAgent: new PlannerAgent() };
