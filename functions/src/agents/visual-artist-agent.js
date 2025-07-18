const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class VisualArtistAgent {
  constructor() {
    this.name = "Visual Artist Agent";
  }

  async createVisualAid(
    concept,
    type = "diagram",
    grade,
    style = "blackboard"
  ) {
    try {
      const visualPrompt = `
        You are an expert in creating educational visual aids for Indian classrooms.
        
        Concept: ${concept}
        Type: ${type}
        Grade Level: ${grade}
        Style: ${style}
        
        Create a detailed description for a ${style}-friendly visual aid that:
        1. Is simple enough to draw on blackboard with chalk
        2. Uses basic geometric shapes
        3. Includes clear labels in both English and regional language
        4. Suitable for Grade ${grade} understanding
        
        Return in JSON format:
        {
          "svgCode": "<svg>...</svg>",
          "description": "detailed description",
          "drawingInstructions": ["step 1", "step 2"],
          "materials": ["chalk", "ruler"],
          "labels": {"english": "regional"},
          "difficulty": "easy/medium/hard"
        }
      `;

      const response = await generateText(visualPrompt);
      const result = parseGeminiResponse(response);

      // Generate actual SVG code
      result.svgCode = this.generateSVG(concept, result.description, grade);

      return result;
    } catch (error) {
      console.error("Visual aid creation failed:", error);
      throw error;
    }
  }

  generateSVG(concept, description, grade) {
    // Simple SVG generator for basic educational diagrams
    const width = 400;
    const height = 300;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="white" stroke="black" stroke-width="2"/>`;

    // Add concept-specific elements
    if (concept.toLowerCase().includes("water cycle")) {
      svg += this.createWaterCycleSVG();
    } else if (concept.toLowerCase().includes("soil")) {
      svg += this.createSoilLayersSVG();
    } else {
      svg += this.createGenericDiagramSVG(concept);
    }

    svg += "</svg>";
    return svg;
  }

  createWaterCycleSVG() {
    return `
      <circle cx="100" cy="80" r="40" fill="yellow" stroke="orange" stroke-width="2"/>
      <text x="85" y="85" font-family="Arial" font-size="12">Sun</text>
      <path d="M 50 200 Q 150 150 250 200" stroke="blue" stroke-width="3" fill="none"/>
      <text x="140" y="170" font-family="Arial" font-size="12">Water</text>
      <path d="M 200 100 Q 250 80 300 100" stroke="gray" stroke-width="2" fill="none"/>
      <text x="240" y="95" font-family="Arial" font-size="12">Clouds</text>
    `;
  }

  createSoilLayersSVG() {
    return `
      <rect x="50" y="50" width="300" height="40" fill="brown" stroke="black"/>
      <text x="180" y="75" font-family="Arial" font-size="12">Topsoil</text>
      <rect x="50" y="90" width="300" height="40" fill="orange" stroke="black"/>
      <text x="180" y="115" font-family="Arial" font-size="12">Subsoil</text>
      <rect x="50" y="130" width="300" height="40" fill="gray" stroke="black"/>
      <text x="180" y="155" font-family="Arial" font-size="12">Bedrock</text>
    `;
  }

  createGenericDiagramSVG(concept) {
    return `
      <rect x="100" y="100" width="200" height="100" fill="lightblue" stroke="blue" stroke-width="2"/>
      <text x="190" y="155" font-family="Arial" font-size="14" text-anchor="middle">${concept}</text>
    `;
  }
}

module.exports = new VisualArtistAgent();
