const admin = require("firebase-admin");
const { generateText } = require("../config/gemini");
const {
  parseGeminiResponse,
  sanitizeForFirestore,
  validateContentStructure,
} = require("../utils/helpers");
const {
  getLanguageFromLocation,
  getRegionalContext,
} = require("../utils/location-mapping");

const { db } = require("../config/firebase-config");

class SahayakOrchestrator {
  constructor() {
    this.sessionId = null;
    this.teacherData = null;
    this.language = "english";
    this.regionalContext = null;
    this.teacherId = null;
    this.subject = "general"; // Add subject property
  }

  async processRequest(teacherId, request, grades) {
    try {
      // Initialize session
      await this.initializeSession(teacherId, request, grades);

      // Get teacher location data
      this.teacherId = teacherId;
      const teacherDoc = await db.collection("teachers").doc(teacherId).get();
      if (!teacherDoc.exists) {
        throw new Error("Teacher not found");
      }

      this.teacherData = teacherDoc.data();

      // NEW: Extract language and subject from request first
      const requestAnalysis = await this.analyzeRequest(request);

      // Set language: user-specified takes priority over location-based
      this.language =
        requestAnalysis.language ||
        getLanguageFromLocation(this.teacherData.location);

      // Set subject: user-specified takes priority over content-based extraction
      this.subject = requestAnalysis.subject || "general";

      this.regionalContext = getRegionalContext(this.teacherData.location);

      // Parallel agent processing with error handling
      const [hyperLocalContent, differentiatedContent, visualAids] =
        await Promise.allSettled([
          this.processHyperLocalContent(request),
          this.processDifferentiatedContent(request, grades),
          this.processVisualAids(request, this.language, grades),
        ]);

      // Handle settled promises and provide defaults for failed ones
      const processedResults = this.handleSettledResults([
        hyperLocalContent,
        differentiatedContent,
        visualAids,
      ]);

      // Merge responses with validation
      const mergedContent = this.mergeAgentResponses(
        processedResults[0],
        processedResults[1],
        processedResults[2]
      );

      // Validate and sanitize merged content
      const validatedContent = validateContentStructure(mergedContent);
      const sanitizedContent = sanitizeForFirestore(validatedContent);

      // Test with simulated classroom
      const simulationResult = await this.testWithSimulatedClassroom(
        sanitizedContent,
        grades
      );

      if (simulationResult.score > 0.8) {
        // Content approved
        await this.finalizeContent(sanitizedContent, simulationResult);
        return {
          success: true,
          content: sanitizedContent,
          reliabilityScore: simulationResult.score,
          sessionId: this.sessionId,
        };
      } else {
        // Content needs revision
        const revisedContent = await this.reviseContent(
          sanitizedContent,
          simulationResult.recommendations
        );
        const validatedRevisedContent =
          validateContentStructure(revisedContent);
        const sanitizedRevisedContent = sanitizeForFirestore(
          validatedRevisedContent
        );

        const finalSimulation = await this.testWithSimulatedClassroom(
          sanitizedRevisedContent,
          grades
        );

        await this.finalizeContent(sanitizedRevisedContent, finalSimulation);
        return {
          success: true,
          content: sanitizedRevisedContent,
          reliabilityScore: finalSimulation.score,
          sessionId: this.sessionId,
          wasRevised: true,
        };
      }
    } catch (error) {
      console.error("Sahayak orchestrator error:", error);

      // Update session with error
      if (this.sessionId) {
        await db
          .collection("sahayak_sessions")
          .doc(this.sessionId)
          .update({
            status: "error",
            error: error.message,
            lastUpdated: new Date().toISOString(),
          })
          .catch(console.error);
      }

      throw error;
    }
  }

  // NEW: Analyze request for language and subject
  async analyzeRequest(request) {
    try {
      const analysisPrompt = `
      Analyze the following educational content request and extract:
      1. Language preference (if explicitly mentioned)
      2. Subject area (if explicitly mentioned)

      Request: "${request}"

      Common languages: english, hindi, kannada, marathi, tamil, telugu, bengali, gujarati
      Common subjects: science, mathematics, language, social_studies, computer_science, general

      Return a JSON object with this structure:
      {
        "language": "detected_language_or_null",
        "subject": "detected_subject_or_null"
      }

      Rules:
      - Only return a language if it's EXPLICITLY mentioned (e.g., "in Hindi", "explain in Tamil")
      - Only return a subject if it's CLEARLY specified (e.g., "math problem", "science experiment", "history lesson", "computer programming", "social studies")
      - Use null if not explicitly mentioned
      - Be conservative - only extract if you're confident
      - For computer/technology related requests, use "computer_science"
      - For history/geography/civics related requests, use "social_studies"
    `;

      const response = await generateText(analysisPrompt);
      const analysis = parseGeminiResponse(response);

      console.log("Request analysis result:", analysis);

      return {
        language: analysis.language,
        subject: analysis.subject,
      };
    } catch (error) {
      console.error("Error analyzing request:", error);
      return {
        language: null,
        subject: null,
      };
    }
  }

  handleSettledResults(results) {
    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        console.error(`Agent ${index} failed:`, result.reason);
        // Return default values based on agent type
        switch (index) {
          case 0: // Hyper-local agent
            return {
              story: "Default story content will be generated.",
              culturalContext: { localReferences: [], culturalConnections: [] },
              teachingTips: ["Use local examples to make content relatable."],
            };
          case 1: // Differentiation agent
            return {
              versions: this.getDefaultGradeVersions(),
              commonObjectives: ["Basic understanding of the topic"],
              differentiationStrategy:
                "Content adapted for different grade levels",
            };
          case 2: // Visual aid agent
            return {
              aids: [
                {
                  type: "diagram",
                  title: "Basic Diagram",
                  description: "Simple visual representation",
                  drawingInstructions: ["Draw basic shapes", "Add labels"],
                  materials: ["Chalk", "Blackboard"],
                },
              ],
              handsonActivities: [
                {
                  name: "Basic Activity",
                  materials: ["Paper", "Pencil"],
                  steps: ["Step 1", "Step 2"],
                  learningOutcome: "Students will understand basic concepts",
                },
              ],
            };
          default:
            return {};
        }
      }
    });
  }

  getDefaultGradeVersions() {
    const defaultVersions = {};
    ["1", "2", "3", "4", "5"].forEach((grade) => {
      defaultVersions[`grade${grade}`] = {
        content: `Grade ${grade} appropriate content will be generated.`,
        objectives: [`Grade ${grade} learning objectives`],
        activities: [`Grade ${grade} activities`],
        vocabulary: [`Grade ${grade} vocabulary`],
      };
    });
    return defaultVersions;
  }

  async initializeSession(teacherId, request, grades) {
    this.sessionId = `sahayak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const sessionDoc = sanitizeForFirestore({
      sessionId: this.sessionId,
      teacherId,
      request,
      grades,
      status: "processing",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    });

    await db.collection("sahayak_sessions").doc(this.sessionId).set(sessionDoc);
  }

  async processHyperLocalContent(request) {
    const HyperLocalAgent = require("./hyper-local-agent");
    const agent = new HyperLocalAgent();
    return await agent.generateContent(
      request,
      this.language,
      this.regionalContext
    );
  }

  async processDifferentiatedContent(request, grades) {
    const DifferentiationAgent = require("./differentiation-agent");
    const agent = new DifferentiationAgent();
    return await agent.generateContent(
      request,
      grades,
      this.language,
      this.teacherData.location
    );
  }

  async processVisualAids(request) {
    const VisualAidAgent = require("./visual-aid-agent");
    const agent = new VisualAidAgent();
    const result = await agent.generateContent(request, this.language, {
      priority: "vertex-ai",
    });

    return result;
  }

  async testWithSimulatedClassroom(content, grades) {
    try {
      const SimulatedClassroomAgent = require("./simulated-classroom-agent");
      const agent = new SimulatedClassroomAgent();
      return await agent.testContent(content, grades);
    } catch (error) {
      console.error("Simulation error:", error);
      // Return default simulation result
      return {
        score: 0.75,
        gradeBreakdown: grades.map((grade) => ({ grade, score: 0.75 })),
        recommendations: ["Content has been generated with standard templates"],
        detailedResults: [],
      };
    }
  }

  mergeAgentResponses(hyperLocal, differentiated, visual) {
    const processedVisualAids = visual.aids
      ? visual.aids.map((aid, index) => {
          const processedAid = {
            type: aid.type || "svg",
            title: aid.title || "Visual Aid",
            description: aid.description || "Educational diagram",
            imageUrl:
              aid.imageUrl ||
              (aid.type === "image" ? "placeholder_url_if_missing" : ""),
            svgCode: aid.svgCode || "",
            teachingPoints: aid.teachingPoints || [],
            interactiveElements: aid.interactiveElements || [],
            drawingInstructions: aid.drawingInstructions || [],
            materials: aid.materials || [],
            gradeLevel: aid.gradeLevel || "mixed",
            culturalContext: aid.culturalContext || "Indian classroom context",
          };

          if (processedAid.type === "image" && !processedAid.imageUrl) {
            console.warn(
              `Missing imageUrl for aid ${index}; fallback to SVG if available.`
            );
          }
          return processedAid;
        })
      : [];

    const mergedContent = {
      story: hyperLocal.story || "Story content will be provided.",
      gradeVersions: differentiated.versions || {},
      visualAids: {
        aids: processedVisualAids,
        handsonActivities: visual.handsonActivities || [],
      },
      culturalContext: hyperLocal.culturalContext || {
        localReferences: [],
        culturalConnections: [],
      },
      learningObjectives: differentiated.commonObjectives || [],
      teachingTips: hyperLocal.teachingTips || [],
    };

    return sanitizeForFirestore(mergedContent);
  }

  async reviseContent(content, recommendations) {
    try {
      const revisionPrompt = `
      Revise the following educational content based on these recommendations:
      Content: ${JSON.stringify(content)}
      Recommendations: ${JSON.stringify(recommendations)}
      Language: ${this.language}
      Regional Context: ${JSON.stringify(this.regionalContext)}
      
      Provide revised content that addresses all recommendations while maintaining cultural relevance and educational value.
      Return ONLY the JSON object with the same structure as the original content. Do NOT include any additional text, notes, or markdown.
    `;

      const response = await generateText(revisionPrompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("Content revision error:", error);
      return content;
    }
  }

  async finalizeContent(content, simulationResult) {
    try {
      const sanitizedContent = sanitizeForFirestore(content);
      const sanitizedSimulationResult = sanitizeForFirestore(simulationResult);

      // Update session with final content
      await db.collection("sahayak_sessions").doc(this.sessionId).update({
        status: "completed",
        finalContent: sanitizedContent,
        reliabilityScore: sanitizedSimulationResult.score,
        completedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });

      // Store in content library for reuse
      const contentLibraryDoc = sanitizeForFirestore({
        sessionId: this.sessionId,
        teacherId: this.teacherId || "",
        content: sanitizedContent,
        grades: this.teacherData.matchingCriteria?.grades || ["1", "2", "3"],
        subject: this.subject, // Use the analyzed/extracted subject
        language: this.language, // Use the analyzed/extracted language
        location:
          this.teacherData.matchingCriteria?.location ||
          this.teacherData.location,
        reliabilityScore: sanitizedSimulationResult.score,
        createdAt: new Date().toISOString(),
      });

      await db.collection("content_library").add(contentLibraryDoc);
    } catch (error) {
      console.error("Error finalizing content:", error);
    }
  }

  // UPDATED: Keep existing extraction as fallback but use analyzed subject first
  extractSubject(content) {
    // If we already have a subject from analysis, use it
    if (this.subject && this.subject !== "general") {
      return this.subject;
    }

    // Otherwise use the existing content-based extraction
    if (!content || !content.story) return "general";

    const story = content.story.toLowerCase();

    // Science
    if (
      story.includes("soil") ||
      story.includes("plant") ||
      story.includes("water") ||
      story.includes("science") ||
      story.includes("experiment") ||
      story.includes("biology") ||
      story.includes("chemistry") ||
      story.includes("physics") ||
      story.includes("animal") ||
      story.includes("nature")
    )
      return "science";

    // Mathematics
    if (
      story.includes("math") ||
      story.includes("number") ||
      story.includes("count") ||
      story.includes("calculation") ||
      story.includes("addition") ||
      story.includes("subtraction") ||
      story.includes("multiplication") ||
      story.includes("division") ||
      story.includes("geometry") ||
      story.includes("arithmetic")
    )
      return "mathematics";

    // Social Studies/Social Science
    if (
      story.includes("history") ||
      story.includes("geography") ||
      story.includes("civics") ||
      story.includes("culture") ||
      story.includes("society") ||
      story.includes("community") ||
      story.includes("festival") ||
      story.includes("tradition") ||
      story.includes("government") ||
      story.includes("map") ||
      story.includes("country") ||
      story.includes("state") ||
      story.includes("city") ||
      story.includes("village") ||
      story.includes("social")
    )
      return "social_studies";

    // Computer Science
    if (
      story.includes("computer") ||
      story.includes("coding") ||
      story.includes("programming") ||
      story.includes("algorithm") ||
      story.includes("technology") ||
      story.includes("digital") ||
      story.includes("internet") ||
      story.includes("software") ||
      story.includes("app") ||
      story.includes("robot") ||
      story.includes("artificial intelligence") ||
      story.includes("ai") ||
      story.includes("machine")
    )
      return "computer_science";

    // Language
    if (
      story.includes("story") ||
      story.includes("language") ||
      story.includes("read") ||
      story.includes("write") ||
      story.includes("grammar") ||
      story.includes("vocabulary") ||
      story.includes("poem") ||
      story.includes("essay") ||
      story.includes("letter") ||
      story.includes("communication")
    )
      return "language";

    return "general";
  }
}

module.exports = SahayakOrchestrator;
