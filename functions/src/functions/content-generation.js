// functions/src/functions/content-generation.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { generateText } = require("../config/gemini");

const db = getFirestore();

// Main content generation function
exports.generateContent = onCall(async (request) => {
  const {
    teacherId,
    prompt,
    subject,
    grades,
    language = "english",
  } = request.data;

  if (!teacherId || !prompt || !subject || !grades) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    // Create session document
    const sessionRef = db.collection("contentSessions").doc();
    const sessionId = sessionRef.id;

    await sessionRef.set({
      teacherId,
      prompt,
      subject,
      grades,
      language,
      status: "processing",
      createdAt: new Date(),
      lastUpdated: new Date(),
    });

    // Generate content using orchestrator
    const orchestrator = new ContentOrchestrator(sessionId, {
      teacherId,
      prompt,
      subject,
      grades,
      language,
    });

    const result = await orchestrator.generateContent();

    // Update session with result
    await sessionRef.update({
      status: "completed",
      result,
      lastUpdated: new Date(),
    });

    return {
      sessionId,
      status: "completed",
      content: result,
    };
  } catch (error) {
    console.error("Content generation error:", error);
    throw new HttpsError("internal", "Content generation failed");
  }
});

// Content Orchestrator Class
class ContentOrchestrator {
  constructor(sessionId, request) {
    this.sessionId = sessionId;
    this.request = request;
  }

  async generateContent() {
    try {
      // Step 1: Generate base content with local context
      const baseContent = await this.generateLocalContent();

      // Step 2: Create grade-differentiated versions
      const gradeVersions = await this.createGradeDifferentiation(baseContent);

      // Step 3: Create visual aids
      const visualAids = await this.generateVisualAids();

      // Step 4: Simple validation (MVP - skip complex simulation)
      const validated = await this.validateContent(gradeVersions);

      return {
        baseContent,
        gradeVersions: validated,
        visualAids,
        reliabilityScore: 0.85, // MVP: Static score
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Orchestration error:", error);
      throw error;
    }
  }

  async generateLocalContent() {
    const { prompt, subject, language } = this.request;

    const localPrompt = `
    Create educational content for ${subject} in ${language}.
    Request: ${prompt}
    
    Requirements:
    - Use local Indian/regional context and examples
    - Include cultural references relevant to students
    - Make it engaging and age-appropriate
    - Focus on practical, relatable examples
    
    Generate a comprehensive story/explanation that teachers can use directly in classroom.
    `;

    const response = await generateText(localPrompt);
    return response;
  }

  async createGradeDifferentiation(baseContent) {
    const { grades } = this.request;
    const gradeVersions = {};

    for (const grade of grades) {
      const gradePrompt = `
      Adapt this content for Grade ${grade} students:
      
      Original Content: ${baseContent}
      
      Requirements for Grade ${grade}:
      - Adjust vocabulary and complexity appropriately
      - Modify sentence structure for age group
      - Include grade-appropriate activities
      - Ensure comprehension level matches grade
      
      Provide the adapted version:
      `;

      const adaptedContent = await generateText(gradePrompt);
      gradeVersions[grade] = {
        content: adaptedContent,
        activities: await this.generateActivities(grade, adaptedContent),
      };
    }

    return gradeVersions;
  }

  async generateActivities(grade, content) {
    const activityPrompt = `
    Create 3 simple classroom activities for Grade ${grade} based on this content:
    
    Content: ${content}
    
    Activities should be:
    - Age-appropriate for Grade ${grade}
    - Easy to implement in classroom
    - Interactive and engaging
    - Require minimal resources
    
    Format as simple numbered list.
    `;

    const activities = await generateText(activityPrompt);
    return activities;
  }

  async generateVisualAids() {
    const { prompt, subject } = this.request;

    const visualPrompt = `
    Create description for visual aids for this educational content:
    
    Subject: ${subject}
    Content: ${prompt}
    
    Provide:
    1. Simple diagram descriptions that can be drawn on blackboard
    2. Worksheet template structure
    3. Props or materials needed
    
    Keep it simple and practical for classroom use.
    `;

    const visualAids = await generateText(visualPrompt);
    return visualAids;
  }

  async validateContent(gradeVersions) {
    // MVP: Simple validation - just check if content exists and is reasonable length
    const validated = {};

    for (const [grade, version] of Object.entries(gradeVersions)) {
      const isValid =
        version.content &&
        version.content.length > 100 &&
        version.content.length < 2000 &&
        version.activities &&
        version.activities.length > 50;

      validated[grade] = {
        ...version,
        isValid,
        validationScore: isValid ? 0.85 : 0.4,
      };
    }

    return validated;
  }
}

// Get content generation session
exports.getContentSession = onCall(async (request) => {
  const { sessionId } = request.data;

  if (!sessionId) {
    throw new HttpsError("invalid-argument", "Session ID required");
  }

  try {
    const sessionDoc = await db
      .collection("contentSessions")
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      throw new HttpsError("not-found", "Session not found");
    }

    return sessionDoc.data();
  } catch (error) {
    console.error("Get session error:", error);
    throw new HttpsError("internal", "Failed to get session");
  }
});

// Get teacher's content history
exports.getTeacherContentHistory = onCall(async (request) => {
  const { teacherId, limit = 10 } = request.data;

  if (!teacherId) {
    throw new HttpsError("invalid-argument", "Teacher ID required");
  }

  try {
    const query = db
      .collection("contentSessions")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(limit);

    const snapshot = await query.get();
    const history = [];

    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return history;
  } catch (error) {
    console.error("Get history error:", error);
    throw new HttpsError("internal", "Failed to get history");
  }
});

// Save content to library for reuse
exports.saveToContentLibrary = onCall(async (request) => {
  const { sessionId, teacherId, tags = [] } = request.data;

  if (!sessionId || !teacherId) {
    throw new HttpsError(
      "invalid-argument",
      "Session ID and Teacher ID required"
    );
  }

  try {
    // Get session data
    const sessionDoc = await db
      .collection("contentSessions")
      .doc(sessionId)
      .get();
    if (!sessionDoc.exists) {
      throw new HttpsError("not-found", "Session not found");
    }

    const sessionData = sessionDoc.data();

    // Save to content library
    await db
      .collection("contentLibrary")
      .doc(sessionId)
      .set({
        ...sessionData,
        tags,
        savedAt: new Date(),
        savedBy: teacherId,
        isPublic: false, // MVP: Private by default
      });

    return { success: true, libraryId: sessionId };
  } catch (error) {
    console.error("Save to library error:", error);
    throw new HttpsError("internal", "Failed to save to library");
  }
});

// Search content library
exports.searchContentLibrary = onCall(async (request) => {
  const { teacherId, subject, grades, searchTerm, limit = 10 } = request.data;

  if (!teacherId) {
    throw new HttpsError("invalid-argument", "Teacher ID required");
  }

  try {
    let query = db
      .collection("contentLibrary")
      .where("teacherId", "==", teacherId);

    if (subject) {
      query = query.where("subject", "==", subject);
    }

    const snapshot = await query.limit(limit).get();
    const results = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Simple text search for MVP
      if (
        !searchTerm ||
        data.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.subject.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        // Grade filter
        if (!grades || grades.some((g) => data.grades.includes(g))) {
          results.push({
            id: doc.id,
            ...data,
          });
        }
      }
    });

    return results;
  } catch (error) {
    console.error("Search library error:", error);
    throw new HttpsError("internal", "Failed to search library");
  }
});
