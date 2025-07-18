// functions/src/agents/visual-artist-agent.js
const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class VisualArtistAgent {
  async createBlackboardDiagram(concept, grade) {
    const diagramPrompt = `
      Create a simple blackboard-friendly diagram for concept: "${concept}"
      Grade level: ${grade}
      
      Provide:
      1. SVG code for a simple line drawing
      2. Step-by-step drawing instructions for teachers
      3. Key labels and annotations
      4. Alternative simple representations
      
      Keep it:
      - Simple black lines on white background
      - Easy to draw with chalk
      - Clear and educational
      - Appropriate for grade ${grade}
      
      Response format:
      {
        "svgCode": "<svg>...</svg>",
        "drawingInstructions": ["Step 1: Draw...", "Step 2: Add..."],
        "labels": ["Label 1", "Label 2"],
        "alternativeRepresentations": ["Alternative way 1", "Alternative way 2"],
        "materialsNeeded": ["chalk", "eraser"]
      }
    `;

    const response = await generateText(diagramPrompt);
    return parseGeminiResponse(response);
  }

  async createWorksheetTemplate(topic, grade) {
    const templatePrompt = `
      Create a worksheet template for topic: "${topic}"
      Grade: ${grade}
      
      Include:
      1. Header with title and student name field
      2. 5-8 questions of varying types
      3. Space for answers
      4. Simple decorative elements
      5. Instructions for teachers
      
      Provide as HTML template that can be easily printed:
      {
        "htmlTemplate": "<html>...</html>",
        "cssStyles": "css code",
        "printInstructions": "printing guidelines",
        "customizationOptions": ["option1", "option2"]
      }
    `;

    const response = await generateText(templatePrompt);
    return parseGeminiResponse(response);
  }
}

module.exports = VisualArtistAgent;
