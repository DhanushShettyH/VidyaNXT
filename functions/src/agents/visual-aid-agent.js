const { generateText } = require("../config/gemini");
const { VertexAIService } = require("../config/vertex-ai");
const { parseGeminiResponse } = require("../utils/helpers");

class VisualAidAgent {
  constructor() {
    this.vertexAI = VertexAIService;
  }

  async generateContent(request, language, options = {}) {
    //console.log(`🎨 Generating visual aids for: ${request} in ${language}`);

    try {
      // Generate structured content using existing Gemini setup
      const structuredContent = await this.generateStructuredContent(
        request,
        language
      );

      // Try Vertex AI first, then fallback to Gemini
      const visualAids = await this.generateActualImagesWithFallback(
        structuredContent,
        request,
        language
      );

      //   console.log("========================================================");
      //   console.log(visualAids);
      //   ("========================================================");
      // Combine and enhance the response
      return await this.finalizeResponse(
        visualAids,
        structuredContent,
        request,
        language
      );
    } catch (error) {
      console.error("Visual aid generation failed:", error);
      return this.createFallbackResponse(request, language);
    }
  }
  async generateStructuredContent(request, language) {
    const prompt = `You are an expert educational content creator for Indian multi-grade classrooms.

Create structured content for: ${request}
Language preference: ${language}

Generate a JSON response with this structure:
{
  "visualConcepts": [
    {
      "title": "Main concept title",
      "imagePrompt": "Detailed prompt for educational diagram - simple, black and white line art suitable for blackboard replication, educational poster style, minimal detail, high contrast",
      "description": "Educational description in ${language}",
      "gradeLevel": "mixed",
      "culturalContext": "Indian rural classroom context"
    }
  ],
  "teachingPoints": ["Point 1", "Point 2", "Point 3"],
  "handsonActivities": [
    {
      "name": "Activity name",
      "materials": ["material 1", "material 2"],
      "steps": ["step 1", "step 2"],
      "learningOutcome": "What students will learn"
    }
  ]
}

Requirements:
- Generate 2-3 visual concepts
- Make image prompts specific for educational line drawings
- Include cultural context for Indian rural schools
- Ensure content is appropriate for multi-grade classrooms

Topic: ${request}`;

    try {
      const response = await generateText(prompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("Structured content generation failed:", error);
      return null;
    }
  }

  async processVisualAids(request, language = "english", grades = []) {
    try {
      //console.log(`🎨 Processing visual aids for: "${request}" in ${language}`);
      //console.log(`📚 Target grades: ${grades.join(", ")}`);

      // Pass grades to all downstream functions
      const structuredContent = await this.generateStructuredVisualContent(
        request,
        language,
        grades
      );
      const visualAids = await this.generateActualImagesWithFallback(
        structuredContent,
        request,
        language,
        grades
      );

      return {
        success: true,
        aids: visualAids,
        metadata: {
          request,
          language,
          grades: grades || [],
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("🔥 Visual aid processing failed:", error);
      throw error;
    }
  }

  async generateActualImagesWithFallback(
    structuredContent,
    request,
    language,
    grades = []
  ) {
    const visualAids = [];

    if (
      !structuredContent?.visualConcepts ||
      structuredContent.visualConcepts.length === 0
    ) {
      //console.log("⚠️ No visual concepts found, creating fallback aids");
      return this.createDefaultVisualAids(request, language);
    }

    for (const [index, concept] of structuredContent.visualConcepts.entries()) {
      try {
        //console.log(`🎨 Attempting Vertex AI Imagen for concept ${index}...`);
        const gradeContext =
          grades.length > 0
            ? `suitable for grades ${grades.join(", ")}`
            : "suitable for elementary students";
        const enhancedPrompt = `${concept.imagePrompt}. Educational content ${gradeContext}, Indian classroom context.`;

        const imageResults = await this.vertexAI.generateImageWithImagen(
          enhancedPrompt,
          {
            numberOfImages: 1,
            aspectRatio: "1:1",
          }
        );

        // Handle successful Vertex AI response
        if (imageResults && imageResults.length > 0) {
          const imageData = imageResults[0];
          const fileName = `visual_aid_${Date.now()}_${index}.png`;

          // Use whichever upload method you implement
          const imageUrl = await this.vertexAI.saveImageToStorage(
            imageData,
            fileName
          );

          const result = {
            type: "image",
            title: concept.title || `Educational Concept ${index + 1}`,
            description:
              concept.description || "Generated educational illustration",
            imageUrl,
            gradeLevel: gradeContext,
            culturalContext: "Indian classroom context",
            teachingPoints: concept.teachingPoints || [
              "Use this image for classroom explanation",
            ],
            interactiveElements: concept.interactiveElements || [
              "Visual elements",
              "Key concepts",
            ],
          };

          visualAids.push(result);
          //console.log(`✅ Successfully generated image for concept ${index}`);
        } else {
          throw new Error("Vertex AI returned empty results");
        }
      } catch (error) {
        console.error(
          `❌ Vertex AI failed for concept ${index}: ${error.message}`
        );

        // Immediate fallback to Gemini SVG generation
        try {
          const fallbackResult = await this.generateWithGeminiFallback(
            concept,
            grades,
            request,
            language
          );
          visualAids.push(fallbackResult);
          //console.log(`✅ Generated SVG fallback for concept ${index}`);
        } catch (fallbackError) {
          console.error(
            `❌ Gemini fallback failed for concept ${index}:`,
            fallbackError
          );

          // Last resort: hardcoded educational SVG
          const hardcodedResult = this.generateHardcodedFallback(
            concept,
            index,
            request
          );
          visualAids.push(hardcodedResult);
          //console.log(`🔄 Using hardcoded fallback for concept ${index}`);
        }
      }
    }

    return visualAids;
  }

  async generateWithGeminiFallback(concept, grades, request, language) {
    try {
      const gradeContext =
        grades.length > 0
          ? `for grades ${grades.join(", ")}`
          : "for elementary students";
      const svgPrompt = `
      Generate SVG code for an educational diagram: ${concept.imagePrompt}.
      Style: Simple black and white line drawing, easy to replicate on blackboard.
      Include labels in ${language}. ${gradeContext}. Topic: ${request}.
      Return only the SVG code as a string.
    `;
      let svgResponse = await generateText(svgPrompt); // From gemini.js
      svgResponse = svgResponse.replace(/``````/g, "").trim();

      return {
        type: "svg",
        title: concept.title,
        description: concept.description,
        svgCode: svgResponse, // Clean up the response
        gradeLevel: concept.gradeLevel || "mixed",
        culturalContext: concept.culturalContext,
        teachingPoints: ["Use this SVG for classroom explanation"],
        interactiveElements: ["Labels", "Key elements"],
      };
    } catch (fallbackError) {
      console.error("Gemini fallback failed:", fallbackError);
      return this.generateFallbackSVG(concept.title, index); // Use existing hardcoded fallback
    }
  }

  async generateActualImages(structuredContent, request, language) {
    if (!structuredContent?.visualConcepts) {
      //console.log("No visual concepts found, creating fallback");
      return [];
    }

    const visualAids = [];

    for (const [index, concept] of structuredContent.visualConcepts.entries()) {
      try {
        // Enhanced prompt for educational visuals suitable for Indian classrooms
        const educationalPrompt = `Educational diagram: ${concept.imagePrompt}. 
Style: Simple black and white line drawing, easy to replicate on blackboard, 
clear labels in English, suitable for Indian classroom, minimal detail, high contrast, 
educational poster style, no complex shading, vector-like appearance, clean lines`;

        // console.log(
        //   `🎨 Generating image ${index + 1} with Vertex AI Imagen...`
        // );

        // Generate image using Vertex AI Imagen
        const imageResults = await this.vertexAI.generateImageWithImagen(
          educationalPrompt,
          {
            numberOfImages: 1,
            aspectRatio: "1:1",
          }
        );

        if (imageResults && imageResults[0]) {
          // Save image to Cloud Storage
          const fileName = `visual-aid-${Date.now()}-${index}.png`;
          let imageUrl = null;

          try {
            imageUrl = await this.vertexAI.saveImageToStorage(
              imageResults[0],
              fileName
            );
            //console.log(`✅ Image ${index + 1} saved successfully`);
          } catch (storageError) {
            console.error(`Storage failed for image ${index}:`, storageError);
          }

          visualAids.push({
            type: "image",
            title: concept.title,
            description: concept.description,
            imageUrl: imageUrl, // This will be the Cloud Storage URL
            fallbackSvg: this.generateFallbackSVG(concept.title, index), // Keep SVG as backup
            gradeLevel: concept.gradeLevel || "mixed",
            culturalContext: concept.culturalContext,
            teachingPoints: structuredContent.teachingPoints || [
              "Explain the main concept using the visual",
              "Point out key relationships in the diagram",
              "Connect to real-world examples from your region",
            ],
            interactiveElements: [
              "Main diagram components",
              "Educational labels and arrows",
              "Visual connections between concepts",
            ],
          });
        }
      } catch (error) {
        console.error(`Failed to generate image for concept ${index}:`, error);

        // Add fallback SVG if image generation fails
        visualAids.push({
          type: "svg",
          title: concept.title,
          description: concept.description,
          svgCode: this.generateFallbackSVG(concept.title, index),
          gradeLevel: concept.gradeLevel || "mixed",
          culturalContext: concept.culturalContext,
          teachingPoints: [
            "Use this visual to explain concepts",
            "Point out key elements",
          ],
          interactiveElements: ["Main elements", "Labels", "Connections"],
        });
      }
    }

    return visualAids;
  }

  async finalizeResponse(visualAids, structuredContent, request, language) {
    // Ensure we have at least 2 visual aids
    while (visualAids.length < 2) {
      visualAids.push({
        type: "svg",
        title: `${request} - Additional Diagram ${visualAids.length + 1}`,
        description: `Supplementary visual aid for ${request}`,
        svgCode: this.generateFallbackSVG(request, visualAids.length),
        gradeLevel: "mixed",
        teachingPoints: ["Reinforce main concepts", "Encourage discussion"],
        interactiveElements: ["Visual elements", "Educational components"],
        generatedBy: "supplementary-fallback",
      });
    }

    // Count generation methods used
    // Count generation methods properly
    const vertexCount = visualAids.filter((aid) => aid.type === "image").length;
    const geminiCount = visualAids.filter(
      (aid) =>
        aid.type === "svg" && aid.svgCode && !aid.svgCode.includes("fallback")
    ).length;
    const fallbackCount = visualAids.filter(
      (aid) => aid.svgCode && aid.svgCode.includes("fallback")
    ).length;

    //console.log(
    //   `📊 Generation Summary: Vertex AI: ${vertexCount}, Gemini: ${geminiCount}, Fallback: ${fallbackCount}`
    // );

    return {
      success: true,
      aids: visualAids,
      handsonActivities: structuredContent?.handsonActivities || [
        {
          name: `Interactive ${request} Activity`,
          materials: ["Paper", "Colored pencils", "Ruler", "Blackboard"],
          steps: [
            "Display the generated visual aid to students",
            "Ask students to identify key elements",
            "Have them draw simplified versions",
            "Facilitate group discussions about the concept",
            "Connect to local examples and experiences",
          ],
          learningOutcome: `Students understand ${request} concepts through visual learning and hands-on practice`,
        },
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        language: language,
        totalVisualAids: visualAids.length,
        vertexAISuccessful: vertexCount,
        geminiFallbackUsed: geminiCount,
        hardcodedFallbackUsed: fallbackCount,
        fallbackStrategy: "vertex-ai-first-then-gemini",
      },
    };
  }

  createFallbackResponse(request, language) {
    //console.log("Creating fallback response with SVG aids");

    return {
      success: true,
      aids: [
        {
          type: "svg",
          title: `${request} - Main Concept`,
          description: `Educational diagram for ${request}`,
          svgCode: this.generateFallbackSVG(request, 0),
          teachingPoints: ["Explain main concepts", "Use for discussion"],
          interactiveElements: ["Key elements", "Labels"],
        },
        {
          type: "svg",
          title: `${request} - Process Flow`,
          description: `Step-by-step process for ${request}`,
          svgCode: this.generateFallbackSVG(request, 1),
          teachingPoints: ["Walk through steps", "Connect to examples"],
          interactiveElements: ["Process steps", "Flow arrows"],
        },
      ],
      handsonActivities: [
        {
          name: `Basic ${request} Activity`,
          materials: ["Paper", "Pencils", "Blackboard"],
          steps: ["Observe diagram", "Discuss concepts", "Practice drawing"],
          learningOutcome: `Basic understanding of ${request}`,
        },
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        language: language,
        fallbackUsed: true,
        vertexAIEnabled: false,
      },
    };
  }

  // Keep your existing generateFallbackSVG methods...
  generateFallbackSVG(topic, index) {
    const colorSchemes = [
      { primary: "#4CAF50", secondary: "#81C784", accent: "#2E7D32" },
      { primary: "#2196F3", secondary: "#64B5F6", accent: "#1565C0" },
      { primary: "#FF9800", secondary: "#FFB74D", accent: "#E65100" },
    ];

    const colors = colorSchemes[index % colorSchemes.length];

    return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="800" height="600" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>
      <rect x="50" y="30" width="700" height="60" fill="${colors.primary}" rx="10" opacity="0.1"/>
      <text x="400" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${colors.accent}">${topic}</text>
      <circle cx="400" cy="300" r="80" fill="${colors.primary}" opacity="0.8" stroke="${colors.accent}" stroke-width="3"/>
      <text x="400" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white">Main Concept</text>
      <rect x="150" y="200" width="120" height="60" fill="${colors.secondary}" opacity="0.7" stroke="${colors.accent}" stroke-width="2" rx="5"/>
      <text x="210" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${colors.accent}">Element 1</text>
      <rect x="530" y="200" width="120" height="60" fill="${colors.secondary}" opacity="0.7" stroke="${colors.accent}" stroke-width="2" rx="5"/>
      <text x="590" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${colors.accent}">Element 2</text>
      <text x="400" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666">Educational Diagram - ${topic}</text>
    </svg>`;
  }
}

module.exports = VisualAidAgent;
