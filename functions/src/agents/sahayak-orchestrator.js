const regionalizerAgent = require("./regionalizer-agent");
const differentiatorAgent = require("./differentiator-agent");
const visualArtistAgent = require("./visual-artist-agent");
const simulationAgent = require("./simulation-agent");
const admin = require("firebase-admin");
const db = admin.firestore();

class SahayakOrchestrator {
  constructor() {
    this.name = "Sahayak Orchestrator";
  }

  async processTeachingRequest(request) {
    try {
      const sessionId = `sahayak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Initialize session
      await this.initializeSession(sessionId, request);

      // Phase 1: Parallel content generation
      const contentResults = await this.generateContent(request);

      // Phase 2: Simulate and validate
      const simulationResults = await this.validateContent(
        contentResults,
        request
      );

      // Phase 3: Refine if needed
      const finalContent = await this.refineContent(
        contentResults,
        simulationResults,
        request
      );

      // Phase 4: Store and return
      await this.finalizeSession(sessionId, finalContent, simulationResults);

      return {
        sessionId,
        content: finalContent,
        simulation: simulationResults,
        status: "completed",
      };
    } catch (error) {
      console.error("Orchestration failed:", error);
      throw error;
    }
  }

  async initializeSession(sessionId, request) {
    const session = {
      sessionId,
      request,
      status: "processing",
      createdAt: new Date().toISOString(),
      phases: {
        contentGeneration: "pending",
        simulation: "pending",
        refinement: "pending",
      },
    };

    await db.collection("sahayak_sessions").doc(sessionId).set(session);
  }

  async generateContent(request) {
    const { prompt, language, region, grades, subject } = request;

    // Parallel execution of content generation
    const [localizedContent, differentiatedContent, visualAids] =
      await Promise.all([
        regionalizerAgent.localizeContent(prompt, language, region, subject),
        differentiatorAgent.createGradeLevels(prompt, grades, subject),
        visualArtistAgent.createVisualAid(subject, "diagram", grades[0]),
      ]);

    return {
      localized: localizedContent,
      differentiated: differentiatedContent,
      visual: visualAids,
    };
  }

  async validateContent(contentResults, request) {
    const { grades, subject } = request;

    // Combine all generated content for simulation
    const combinedContent = this.combineContent(contentResults);

    // Run classroom simulation
    const simulationResults = await simulationAgent.runClassroomSimulation(
      combinedContent,
      grades,
      subject
    );

    return simulationResults;
  }

  async refineContent(contentResults, simulationResults, request) {
    if (simulationResults.reliabilityScore >= 0.8) {
      // Content is good, no refinement needed
      return contentResults;
    }

    // Apply refinements based on simulation feedback
    const refinements = await this.applyRefinements(
      contentResults,
      simulationResults.recommendations,
      request
    );

    return refinements;
  }

  async applyRefinements(contentResults, recommendations, request) {
    // Apply specific refinements based on simulation feedback
    const refinedContent = { ...contentResults };

    for (const recommendation of recommendations) {
      if (recommendation.includes("Simplify vocabulary")) {
        // Re-run regionalization with simpler vocabulary
        refinedContent.localized = await regionalizerAgent.localizeContent(
          request.prompt + " (use simple vocabulary)",
          request.language,
          request.region,
          request.subject
        );
      }

      if (recommendation.includes("Add more interactive elements")) {
        // Generate additional visual aids
        refinedContent.visual = await visualArtistAgent.createVisualAid(
          request.subject,
          "interactive",
          request.grades[0]
        );
      }
    }

    return refinedContent;
  }

  combineContent(contentResults) {
    return {
      story: contentResults.localized.localizedContent,
      worksheets: contentResults.differentiated.gradeLevels,
      visualAids: contentResults.visual,
    };
  }

  async finalizeSession(sessionId, content, simulation) {
    const updates = {
      "phases.contentGeneration": "completed",
      "phases.simulation": "completed",
      "phases.refinement": "completed",
      status: "completed",
      finalContent: content,
      simulationResults: simulation,
      completedAt: new Date().toISOString(),
    };

    await db.collection("sahayak_sessions").doc(sessionId).update(updates);

    // Store in content library for reuse
    await this.storeInContentLibrary(content, simulation);
  }

  async storeInContentLibrary(content, simulation) {
    const libraryEntry = {
      content,
      reliabilityScore: simulation.reliabilityScore,
      tags: this.extractTags(content),
      createdAt: new Date().toISOString(),
    };

    await db.collection("content_library").add(libraryEntry);
  }

  extractTags(content) {
    // Extract relevant tags from content for searchability
    const tags = [];

    if (content.localized?.culturalElements) {
      tags.push(...content.localized.culturalElements);
    }

    if (content.differentiated?.gradeLevels) {
      const grades = content.differentiated.gradeLevels.map(
        (g) => `grade_${g.grade}`
      );
      tags.push(...grades);
    }

    return tags;
  }
}

module.exports = new SahayakOrchestrator();
