const { generateText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");

class VisualAidAgent {
  async generateContent(request, language) {
    // Step 1: Try to get SVG from AI
    const aiResponse = await this.tryAIGeneration(request, language);

    // Step 2: Validate and ensure SVG exists
    const validatedResponse = await this.validateAndEnhanceResponse(
      aiResponse,
      request,
      language
    );

    return validatedResponse;
  }

  async tryAIGeneration(request, language) {
    const prompt = `
You are an expert SVG generator for educational content. You MUST generate actual SVG code for each visual aid.

Request: ${request}
Language: ${language}

CRITICAL REQUIREMENTS:
1. Generate working SVG code for each visual aid in the "svgCode" property
2. SVG must be complete and valid
3. Use viewBox="0 0 800 600" for all SVGs
4. Include educational labels and colors
5. Make diagrams relevant to the specific request
6. NEVER leave svgCode empty or undefined

EXAMPLE of required JSON structure:
{
  "aids": [
    {
      "type": "svg",
      "title": "Water Cycle Diagram",
      "description": "Shows evaporation and condensation",
      "svgCode": "<svg viewBox='0 0 800 600' xmlns='http://www.w3.org/2000/svg'><rect x='50' y='50' width='200' height='100' fill='#e3f2fd' stroke='#1976d2' stroke-width='2'/><text x='150' y='105' text-anchor='middle' font-family='Arial' font-size='18' fill='#333'>Evaporation</text></svg>",
      "teachingPoints": ["Explain evaporation process", "Show water becoming vapor"],
      "interactiveElements": ["Water bodies", "Sun rays", "Vapor clouds"]
    }
  ],
  "handsonActivities": [
    {
      "name": "Water Cycle Model",
      "materials": ["Clear container", "Water", "Heat source"],
      "steps": ["Fill container with water", "Apply heat", "Observe condensation"],
      "learningOutcome": "Students understand water cycle processes"
    }
  ]
}

IMPORTANT: Every aid object MUST have a complete svgCode property with valid SVG markup.
Generate 2-3 different visual aids for: "${request}"
Return only valid JSON with working SVG code in each aid.
`;

    try {
      const response = await generateText(prompt);
      const parsedResponse = parseGeminiResponse(response);
      console.log("=======================================");
      console.log(
        "AI Response received:",
        JSON.stringify(parsedResponse, null, 2)
      );
      return parsedResponse;
    } catch (error) {
      console.error("AI SVG generation failed:", error);
      return null;
    }
  }

  async validateAndEnhanceResponse(aiResponse, request, language) {
    let finalResponse = aiResponse;

    // If AI failed completely, create from scratch
    if (
      !finalResponse ||
      !finalResponse.aids ||
      finalResponse.aids.length === 0
    ) {
      // console.log("AI response is null or empty, creating from scratch");
      finalResponse = this.createCompleteResponse(request, language);
    } else {
      // Validate each aid and fix missing SVG
      finalResponse.aids = finalResponse.aids.map((aid, index) => {
        // console.log(`Validating aid ${index}:`, aid);

        // Check if svgCode exists and is valid
        if (
          !aid.svgCode ||
          typeof aid.svgCode !== "string" ||
          !aid.svgCode.includes("<svg") ||
          aid.svgCode.trim() === ""
        ) {
          // console.log(
          //   `Missing or invalid SVG for aid ${index}, generating fallback`
          // );
          aid.svgCode = this.generateDynamicSVG(
            aid.title || request,
            aid.description || "",
            index
          );
        }

        // Ensure required fields exist
        aid.type = aid.type || "svg";
        aid.title = aid.title || `${request} - Diagram ${index + 1}`;
        aid.description =
          aid.description || `Educational diagram for ${request}`;
        aid.teachingPoints = aid.teachingPoints || [
          "Use this visual to explain key concepts",
          "Point out important elements",
          "Encourage student discussion",
        ];
        aid.interactiveElements = aid.interactiveElements || [
          "Main diagram elements",
          "Labels and annotations",
          "Visual connections",
        ];

        return aid;
      });
    }

    // Ensure we have at least 2 visual aids
    if (finalResponse.aids.length < 2) {
      const additionalAids = 2 - finalResponse.aids.length;
      for (let i = 0; i < additionalAids; i++) {
        finalResponse.aids.push({
          type: "svg",
          title: `${request} - Additional Diagram ${finalResponse.aids.length + 1}`,
          description: `Supplementary visual aid for ${request}`,
          svgCode: this.generateDynamicSVG(
            request,
            "additional diagram",
            finalResponse.aids.length
          ),
          teachingPoints: [
            "Use this visual to reinforce learning",
            "Connect to main concepts",
            "Facilitate group discussions",
          ],
          interactiveElements: [
            "Key visual elements",
            "Interactive components",
            "Discussion points",
          ],
        });
      }
    }

    // Ensure hands-on activities exist
    if (
      !finalResponse.handsonActivities ||
      finalResponse.handsonActivities.length === 0
    ) {
      finalResponse.handsonActivities = [
        {
          name: `Interactive ${request} Activity`,
          materials: ["Paper", "Colored pencils", "Ruler"],
          steps: [
            "Students observe the diagram",
            "Identify key elements",
            "Draw their own version",
            "Explain the process to peers",
          ],
          learningOutcome: `Students will understand the concepts related to ${request}`,
        },
      ];
    }

    // console.log(
    //   "Final validated response:",
    //   JSON.stringify(finalResponse, null, 2)
    // );
    return finalResponse;
  }

  createCompleteResponse(request, language) {
    // Create multiple visual aids based on the request
    const aids = this.generateMultipleAids(request);

    return {
      aids: aids,
      handsonActivities: [
        {
          name: `Interactive ${request} Activity`,
          materials: ["Paper", "Colored pencils", "Ruler"],
          steps: [
            "Students observe the diagram",
            "Identify key elements",
            "Draw their own version",
            "Explain the process to peers",
          ],
          learningOutcome: `Students will understand the concepts related to ${request}`,
        },
      ],
    };
  }

  generateMultipleAids(request) {
    // Generate 2-3 different visual aids based on the request
    const aids = [];

    // Main diagram
    aids.push({
      type: "svg",
      title: `${request} - Main Diagram`,
      description: `Educational diagram explaining ${request}`,
      svgCode: this.generateDynamicSVG(request, "main diagram", 0),
      teachingPoints: [
        "Point out the main elements",
        "Explain the relationships between components",
        "Encourage student questions",
      ],
      interactiveElements: [
        "Main components",
        "Labels and arrows",
        "Color-coded sections",
      ],
    });

    // Process/Flow diagram
    aids.push({
      type: "svg",
      title: `${request} - Process Flow`,
      description: `Step-by-step process related to ${request}`,
      svgCode: this.generateDynamicSVG(request, "process flow", 1),
      teachingPoints: [
        "Walk through each step",
        "Highlight the sequence",
        "Connect to real-world examples",
      ],
      interactiveElements: [
        "Process steps",
        "Flow arrows",
        "Sequential elements",
      ],
    });

    return aids;
  }

  generateDynamicSVG(topic, subtype, index) {
    // Color schemes for different diagrams
    const colorSchemes = [
      { primary: "#4CAF50", secondary: "#81C784", accent: "#2E7D32" },
      { primary: "#2196F3", secondary: "#64B5F6", accent: "#1565C0" },
      { primary: "#FF9800", secondary: "#FFB74D", accent: "#E65100" },
      { primary: "#9C27B0", secondary: "#BA68C8", accent: "#6A1B9A" },
    ];

    const colors = colorSchemes[index % colorSchemes.length];

    // Generate different SVG layouts based on subtype
    if (subtype.includes("process") || subtype.includes("flow")) {
      return this.generateProcessSVG(topic, colors, index);
    } else {
      return this.generateConceptSVG(topic, colors, index);
    }
  }

  generateConceptSVG(topic, colors, index) {
    return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowhead${index}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="${colors.accent}"/>
        </marker>
      </defs>
      
      <!-- Background -->
      <rect x="0" y="0" width="800" height="600" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>
      
      <!-- Title -->
      <rect x="50" y="30" width="700" height="60" fill="${colors.primary}" rx="10" opacity="0.1"/>
      <text x="400" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${colors.accent}">${topic}</text>
      
      <!-- Central concept -->
      <circle cx="400" cy="300" r="80" fill="${colors.primary}" opacity="0.8" stroke="${colors.accent}" stroke-width="3"/>
      <text x="400" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white">Main Concept</text>
      
      <!-- Supporting elements -->
      <rect x="150" y="180" width="120" height="80" fill="${colors.secondary}" opacity="0.7" stroke="${colors.accent}" stroke-width="2" rx="10"/>
      <text x="210" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${colors.accent}">Element 1</text>
      
      <rect x="530" y="180" width="120" height="80" fill="${colors.secondary}" opacity="0.7" stroke="${colors.accent}" stroke-width="2" rx="10"/>
      <text x="590" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${colors.accent}">Element 2</text>
      
      <rect x="150" y="400" width="120" height="80" fill="${colors.secondary}" opacity="0.7" stroke="${colors.accent}" stroke-width="2" rx="10"/>
      <text x="210" y="445" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${colors.accent}">Element 3</text>
      
      <rect x="530" y="400" width="120" height="80" fill="${colors.secondary}" opacity="0.7" stroke="${colors.accent}" stroke-width="2" rx="10"/>
      <text x="590" y="445" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${colors.accent}">Element 4</text>
      
      <!-- Connecting lines -->
      <line x1="270" y1="220" x2="320" y2="260" stroke="${colors.accent}" stroke-width="2" marker-end="url(#arrowhead${index})"/>
      <line x1="530" y1="220" x2="480" y2="260" stroke="${colors.accent}" stroke-width="2" marker-end="url(#arrowhead${index})"/>
      <line x1="270" y1="440" x2="320" y2="380" stroke="${colors.accent}" stroke-width="2" marker-end="url(#arrowhead${index})"/>
      <line x1="530" y1="440" x2="480" y2="380" stroke="${colors.accent}" stroke-width="2" marker-end="url(#arrowhead${index})"/>
      
      <!-- Footer -->
      <text x="400" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666">Educational Diagram - ${topic}</text>
    </svg>`;
  }

  generateProcessSVG(topic, colors, index) {
    return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowhead${index}" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="${colors.accent}"/>
        </marker>
      </defs>
      
      <!-- Background -->
      <rect x="0" y="0" width="800" height="600" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>
      
      <!-- Title -->
      <rect x="50" y="30" width="700" height="60" fill="${colors.primary}" rx="10" opacity="0.1"/>
      <text x="400" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${colors.accent}">${topic} Process</text>
      
      <!-- Process steps -->
      <rect x="100" y="150" width="120" height="80" fill="${colors.primary}" opacity="0.8" stroke="${colors.accent}" stroke-width="2" rx="10"/>
      <text x="160" y="195" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">Step 1</text>
      
      <rect x="300" y="150" width="120" height="80" fill="${colors.secondary}" opacity="0.8" stroke="${colors.accent}" stroke-width="2" rx="10"/>
      <text x="360" y="195" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${colors.accent}">Step 2</text>
      
      <rect x="500" y="150" width="120" height="80" fill="${colors.primary}" opacity="0.8" stroke="${colors.accent}" stroke-width="2" rx="10"/>
      <text x="560" y="195" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">Step 3</text>
      
      <!-- Second row -->
      <rect x="200" y="350" width="120" height="80" fill="${colors.secondary}" opacity="0.8" stroke="${colors.accent}" stroke-width="2" rx="10"/>
      <text x="260" y="395" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${colors.accent}">Step 4</text>
      
      <rect x="400" y="350" width="120" height="80" fill="${colors.primary}" opacity="0.8" stroke="${colors.accent}" stroke-width="2" rx="10"/>
      <text x="460" y="395" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">Step 5</text>
      
      <!-- Flow arrows -->
      <line x1="220" y1="190" x2="280" y2="190" stroke="${colors.accent}" stroke-width="3" marker-end="url(#arrowhead${index})"/>
      <line x1="420" y1="190" x2="480" y2="190" stroke="${colors.accent}" stroke-width="3" marker-end="url(#arrowhead${index})"/>
      <line x1="560" y1="230" x2="560" y2="280" stroke="${colors.accent}" stroke-width="3" marker-end="url(#arrowhead${index})"/>
      <line x1="540" y1="390" x2="420" y2="390" stroke="${colors.accent}" stroke-width="3" marker-end="url(#arrowhead${index})"/>
      <line x1="380" y1="390" x2="320" y2="390" stroke="${colors.accent}" stroke-width="3" marker-end="url(#arrowhead${index})"/>
      
      <!-- Footer -->
      <text x="400" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666">Process Flow - ${topic}</text>
    </svg>`;
  }
}

module.exports = VisualAidAgent;
