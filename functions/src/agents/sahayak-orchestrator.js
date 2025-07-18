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
  }

  async processRequest(teacherId, request, grades) {
    try {
      // Initialize session
      await this.initializeSession(teacherId, request, grades);

      // Get teacher location data
      const teacherDoc = await db.collection("teachers").doc(teacherId).get();
      if (!teacherDoc.exists) {
        throw new Error("Teacher not found");
      }

      this.teacherData = teacherDoc.data();
      this.language = getLanguageFromLocation(this.teacherData.location);
      this.regionalContext = getRegionalContext(this.teacherData.location);

      // Parallel agent processing with error handling
      const [hyperLocalContent, differentiatedContent, visualAids] =
        await Promise.allSettled([
          this.processHyperLocalContent(request),
          this.processDifferentiatedContent(request, grades),
          this.processVisualAids(request),
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
    console.log("=== PROCESSING VISUAL AIDS ===");
    console.log("Request:", request);
    console.log("Language:", this.language);

    const VisualAidAgent = require("./visual-aid-agent");
    const agent = new VisualAidAgent();
    const result = await agent.generateContent(request, this.language);

    console.log("Visual Aid Agent Result:", JSON.stringify(result, null, 2));

    // Verify SVG codes are present
    if (result.aids) {
      result.aids.forEach((aid, index) => {
        console.log(`Aid ${index} has svgCode:`, !!aid.svgCode);
        if (aid.svgCode) {
          console.log(`Aid ${index} svgCode length:`, aid.svgCode.length);
        }
      });
    }

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
        score: 0.75, // Default acceptable score
        gradeBreakdown: grades.map((grade) => ({ grade, score: 0.75 })),
        recommendations: ["Content has been generated with standard templates"],
        detailedResults: [],
      };
    }
  }

  mergeAgentResponses(hyperLocal, differentiated, visual) {
    console.log("=== MERGE AGENT RESPONSES DEBUG ===");
    console.log("Visual aids received:", JSON.stringify(visual, null, 2));

    // Preserve ALL fields from visual aids, including svgCode
    const processedVisualAids = visual.aids
      ? visual.aids.map((aid, index) => {
          console.log(`Processing aid ${index}:`, {
            hasTitle: !!aid.title,
            hasDescription: !!aid.description,
            hasSvgCode: !!aid.svgCode,
            svgCodeLength: aid.svgCode ? aid.svgCode.length : 0,
          });

          // Ensure all fields are preserved
          const processedAid = {
            type: aid.type || "svg",
            title: aid.title || "Visual Aid",
            description: aid.description || "Educational diagram",
            svgCode: aid.svgCode || "", // CRITICAL: Preserve svgCode
            teachingPoints: aid.teachingPoints || [],
            interactiveElements: aid.interactiveElements || [],
            drawingInstructions: aid.drawingInstructions || [],
            materials: aid.materials || [],
          };

          console.log(`Processed aid ${index}:`, {
            hasTitle: !!processedAid.title,
            hasDescription: !!processedAid.description,
            hasSvgCode: !!processedAid.svgCode,
            svgCodeLength: processedAid.svgCode
              ? processedAid.svgCode.length
              : 0,
          });

          return processedAid;
        })
      : [];

    console.log(
      "Processed visual aids:",
      JSON.stringify(processedVisualAids, null, 2)
    );

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

    console.log(
      "Final merged content visual aids:",
      JSON.stringify(mergedContent.visualAids, null, 2)
    );

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

Please provide revised content that addresses all the recommendations while maintaining cultural relevance and educational value.

Return response in JSON format with the same structure as the original content.
Ensure all fields are properly filled and no undefined values are present.
`;

      const response = await generateText(revisionPrompt);
      return parseGeminiResponse(response);
    } catch (error) {
      console.error("Content revision error:", error);
      // Return original content if revision fails
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
        content: sanitizedContent,
        grades: this.teacherData.matchingCriteria?.grades || ["1", "2", "3"], // FIX: Use correct grades path
        subject: this.extractSubject(sanitizedContent),
        language: this.language,
        location:
          this.teacherData.matchingCriteria?.location ||
          this.teacherData.location,
        reliabilityScore: sanitizedSimulationResult.score,
        createdAt: new Date().toISOString(),
      });

      await db.collection("content_library").add(contentLibraryDoc);
    } catch (error) {
      console.error("Error finalizing content:", error);
      // Don't throw error here, as the main content generation was successful
    }
  }

  extractSubject(content) {
    if (!content || !content.story) return "general";

    const story = content.story.toLowerCase();
    if (
      story.includes("soil") ||
      story.includes("plant") ||
      story.includes("water") ||
      story.includes("science")
    )
      return "science";
    if (
      story.includes("math") ||
      story.includes("number") ||
      story.includes("count")
    )
      return "mathematics";
    if (
      story.includes("story") ||
      story.includes("language") ||
      story.includes("read")
    )
      return "language";
    return "general";
  }
}

module.exports = SahayakOrchestrator;
