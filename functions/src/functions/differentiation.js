// functions/src/functions/differentiation.js
const { onCall } = require("firebase-functions/v2/https");
const { db } = require("../config/firebase-config");
const { generateText, analyzeImageWithText } = require("../config/gemini");
const { parseGeminiResponse } = require("../utils/helpers");
const {
  getLanguageFromLocation,
  getRegionalContext,
} = require("../utils/location-mapping");
const DifferentiationAgent = require("../agents/differentiation-agent");

exports.generateDifferentiatedMaterials = onCall(async (request) => {
  try {
    const {
      imageBase64,
      contextText,
      teacherId,
      teacherGrades,
      teacherLocation,
    } = request.data;

    if (!teacherId) {
      throw new Error("Teacher ID is required");
    }

    if (!imageBase64 && !contextText) {
      throw new Error("Either image or context text is required");
    }

    console.log("Starting differentiated materials generation", {
      teacherId,
      hasImage: !!imageBase64,
      hasContext: !!contextText,
    });

    // Get teacher data for additional context
    const teacherDoc = await db.collection("teachers").doc(teacherId).get();
    const teacherData = teacherDoc.exists ? teacherDoc.data() : {};

    // Determine target grades and location
    const targetGrades = teacherGrades || teacherData.grades || ["1", "2", "3"];
    const location = teacherLocation || teacherData.location || "Karnataka";

    // Get language and regional context
    const language = getLanguageFromLocation(location);
    const regionalContext = getRegionalContext(location);

    let analysisResult;

    // Step 1: Analyze content (image or text)
    if (imageBase64) {
      analysisResult = await analyzeImageContent(
        imageBase64,
        contextText,
        language,
        location
      );
    } else {
      analysisResult = await analyzeTextContent(
        contextText,
        language,
        location
      );
    }

    console.log("Content analysis completed", {
      subject: analysisResult.subject,
      topic: analysisResult.topic,
      language: analysisResult.language,
    });

    // Step 2: Generate differentiated materials using existing DifferentiationAgent
    const differentiationAgent = new DifferentiationAgent();

    const request_for_agent = `
    Subject: ${analysisResult.subject}
    Topic: ${analysisResult.topic}
    Content: ${analysisResult.content}
    Key Terms: ${analysisResult.keyTerms?.join(", ") || ""}
    Difficulty Level: ${analysisResult.difficulty}
    
    Create differentiated worksheets for multi-grade classroom.
    Include culturally relevant examples from ${location}.
    Use local references: ${JSON.stringify(regionalContext)}
    `;

    const differentiatedContent = await differentiationAgent.generateContent(
      request_for_agent,
      targetGrades,
      analysisResult.language || language,
      location
    );

    // Step 3: Store in differentiated_materials collection
    const materialId = `diff-material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const materialData = {
      materialId,
      teacherId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      analysis: analysisResult,
      versions: differentiatedContent.versions,
      commonObjectives: differentiatedContent.commonObjectives,
      differentiationStrategy: differentiatedContent.differentiationStrategy,
      targetGrades,
      language: analysisResult.language || language,
      location,
      regionalContext,
      hasImage: !!imageBase64,
      hasContext: !!contextText,
      status: "completed",
    };

    await db
      .collection("differentiated_materials")
      .doc(materialId)
      .set(materialData);

    // Step 4: Also store in content_library for reuse
    const libraryData = {
      content: {
        ...materialData,
        type: "differentiated_worksheet",
        createdBy: teacherId,
      },
      createdAt: new Date().toISOString(),
      subject: analysisResult.subject,
      language: analysisResult.language || language,
      location,
      grades: targetGrades,
      reliabilityScore: calculateReliabilityScore(
        analysisResult,
        differentiatedContent
      ),
      sessionId: materialId,
    };

    await db.collection("content_library").doc(materialId).set(libraryData);

    console.log("Differentiated materials generated successfully", {
      materialId,
    });

    return {
      success: true,
      materialId,
      analysis: analysisResult,
      versions: differentiatedContent.versions,
      commonObjectives: differentiatedContent.commonObjectives,
      differentiationStrategy: differentiatedContent.differentiationStrategy,
    };
  } catch (error) {
    console.error("Error generating differentiated materials:", error);
    throw new Error(`Failed to generate materials: ${error.message}`);
  }
});

exports.getDifferentiatedMaterials = onCall(async (request) => {
  try {
    const { teacherId, subject, grades, language } = request.data;

    if (!teacherId) {
      throw new Error("Teacher ID is required");
    }

    console.log("Fetching differentiated materials", {
      teacherId,
      filters: { subject, grades, language },
    });

    let query = db
      .collection("differentiated_materials")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .limit(50);

    // Apply filters
    if (subject && subject !== "") {
      query = query.where("analysis.subject", "==", subject);
    }

    if (language && language !== "") {
      query = query.where("language", "==", language);
    }

    const snapshot = await query.get();
    const materials = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Filter by grades if specified
      if (grades && grades.length > 0) {
        const materialGrades = data.targetGrades || [];
        const hasMatchingGrade = grades.some((grade) =>
          materialGrades.includes(grade)
        );
        if (!hasMatchingGrade) {
          return; // Skip this material
        }
      }

      materials.push({
        id: doc.id,
        ...data,
      });
    });

    console.log("Differentiated materials fetched successfully", {
      count: materials.length,
    });

    return {
      success: true,
      materials,
      count: materials.length,
    };
  } catch (error) {
    console.error("Error fetching differentiated materials:", error);
    throw new Error(`Failed to fetch materials: ${error.message}`);
  }
});

async function analyzeImageContent(
  imageBase64,
  contextText,
  language,
  location
) {
  try {
    console.log("Starting actual image analysis with Gemini Vision");

    const imageAnalysisPrompt = `
You are an expert educational content analyzer specializing in Indian curriculum textbooks and educational materials.

Analyze this image carefully and identify:
1. What subject area does this image belong to (science, mathematics, language, social studies, etc.)
2. What specific topic or concept is being illustrated
3. What educational content is visible (text, diagrams, charts, etc.)
4. What grade level would this content be appropriate for

Context provided: ${contextText || "No additional context provided"}
Target language: ${language}
Location context: ${location}, India

Please respond ONLY with valid JSON in this exact format:
{
  "subject": "identified subject area",
  "topic": "specific topic from the image",
  "content": "description of what is shown in the image",
  "difficulty": "estimated grade level (1-5)",
  "language": "${language}",
  "keyTerms": ["important terms visible or implied in image"],
  "objectives": ["learning objectives that can be derived from this image"],
  "visualElements": ["description of diagrams, charts, or visual elements"],
  "extractedText": "any text visible in the image"
}

Focus on what you actually see in the image, not assumptions based on context.
`;

    const response = await analyzeImageWithText(
      imageBase64,
      imageAnalysisPrompt
    );
    const parsed = parseGeminiResponse(response);

    console.log("Image analysis result:", {
      subject: parsed.subject,
      topic: parsed.topic,
      hasVisualElements: parsed.visualElements?.length > 0,
    });

    return {
      subject: parsed.subject || "General",
      topic: parsed.topic || "Educational Content",
      content: parsed.content || "Educational content from image",
      difficulty: parsed.difficulty || "2",
      language: parsed.language || language,
      keyTerms: parsed.keyTerms || [],
      objectives: parsed.objectives || [],
      visualElements: parsed.visualElements || [],
      extractedText: parsed.extractedText || "",
      culturalRelevance: `Content adapted for ${location} educational context`,
    };
  } catch (error) {
    console.error("Error in image analysis:", error);

    // Enhanced fallback - try to use context if image analysis fails
    if (contextText && contextText.toLowerCase().includes("water")) {
      return {
        subject: "Science",
        topic: "Water Cycle",
        content: "Educational content about water cycle from uploaded image",
        difficulty: "3",
        language: language,
        keyTerms: [
          "water cycle",
          "evaporation",
          "condensation",
          "precipitation",
        ],
        objectives: ["Understand the water cycle process"],
        visualElements: ["Water cycle diagram"],
        extractedText: "",
      };
    }

    // Basic fallback
    return {
      subject: "General",
      topic: "Educational Content",
      content: contextText || "Content from uploaded image",
      difficulty: "2",
      language: language,
      keyTerms: [],
      objectives: [],
      visualElements: [],
      extractedText: "",
    };
  }
}

async function analyzeTextContent(contextText, language, location) {
  try {
    const analysisPrompt = `
    You are analyzing educational content for a ${language} speaking classroom in ${location}, India.
    
    Analyze this educational request: "${contextText}"
    
    Extract and provide analysis in JSON format:
    {
      "subject": "identified subject (math, science, language, social studies, etc.)",
      "topic": "specific topic mentioned",
      "content": "expanded content description",
      "difficulty": "suggested grade level (1-5)",
      "language": "detected or default language",
      "keyTerms": ["important terms from the request"],
      "objectives": ["inferred learning objectives"]
    }
    
    Consider Indian curriculum standards and ${location} regional context.
    `;

    const response = await generateText(analysisPrompt);
    const parsed = parseGeminiResponse(response);

    return {
      subject: parsed.subject || "General",
      topic: parsed.topic || "Educational Content",
      content: parsed.content || contextText,
      difficulty: parsed.difficulty || "2",
      language: parsed.language || language,
      keyTerms: parsed.keyTerms || [],
      objectives: parsed.objectives || [],
    };
  } catch (error) {
    console.error("Error analyzing text:", error);
    return {
      subject: "General",
      topic: "Educational Content",
      content: contextText,
      difficulty: "2",
      language: language,
      keyTerms: [],
      objectives: [],
    };
  }
}

function calculateReliabilityScore(analysis, content) {
  let score = 0.5; // Base score

  if (analysis.subject && analysis.subject !== "General") score += 0.1;
  if (analysis.topic && analysis.topic !== "Educational Content") score += 0.1;
  if (analysis.keyTerms && analysis.keyTerms.length > 0) score += 0.1;
  if (content.versions && Object.keys(content.versions).length > 0)
    score += 0.2;

  return Math.min(score, 1.0);
}
