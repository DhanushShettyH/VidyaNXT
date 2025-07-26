const { EXPERIENCE_LEVELS, AI_PREFERENCES } = require("../config/constants");

// utils/helpers.js
function getExperienceLevel(experienceYears) {
  if (experienceYears < 2) return "beginner";
  if (experienceYears < 5) return "intermediate";
  if (experienceYears < 10) return "experienced";
  return "expert";
}

function getAIPreferences(grades, experienceYears) {
  const preferences = {
    contentComplexity: experienceYears >= 3 ? "intermediate" : "basic",
    aiAssistanceLevel: experienceYears < 3 ? "high" : "moderate",
    preferredSubjects: [],
    gradeFocus: grades,
  };

  // Add subject preferences based on grades
  if (grades.some((grade) => ["K", "1", "2", "3"].includes(grade))) {
    preferences.preferredSubjects.push(
      "reading",
      "basic_math",
      "science_basics"
    );
  }
  if (grades.some((grade) => ["4", "5", "6"].includes(grade))) {
    preferences.preferredSubjects.push(
      "mathematics",
      "science",
      "social_studies"
    );
  }
  if (
    grades.some((grade) => ["7", "8", "9", "10", "11", "12"].includes(grade))
  ) {
    preferences.preferredSubjects.push(
      "advanced_math",
      "chemistry",
      "physics",
      "literature"
    );
  }

  return preferences;
}

function calculateProfileStrength(experienceYears, grades) {
  const baseScore = Math.min(experienceYears * 10, 50);
  const gradeDiversity = new Set(grades).size * 5;
  return Math.min(baseScore + gradeDiversity, 100);
}

// Simple topic expertise determination
function determineTopicExpertise(grades, experience) {
  const gradeTypes = [];

  // Check for elementary grades
  if (grades.some((g) => ["K", "1", "2", "3", "4", "5"].includes(g))) {
    gradeTypes.push("elementary");
  }

  // Check for middle school grades
  if (grades.some((g) => ["6", "7", "8"].includes(g))) {
    gradeTypes.push("middle_school");
  }

  // Check for high school grades
  if (grades.some((g) => ["9", "10", "11", "12"].includes(g))) {
    gradeTypes.push("high_school");
  }

  return gradeTypes;
}

// Wait/delay helper
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// Add this function to your existing helpers.js
function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== null);
  }

  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedValue = sanitizeForFirestore(value);
      // CRITICAL: Allow empty strings for SVG code and other fields
      if (sanitizedValue !== null && sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }
    return sanitized;
  }

  // Return the value as-is for strings (including SVG code)
  return obj;
}

function validateContentStructure(content) {
  const defaultContent = {
    story: content.story || "",
    gradeVersions: content.gradeVersions || {},
    visualAids: content.visualAids || { aids: [], handsonActivities: [] },
    culturalContext: content.culturalContext || {
      localReferences: [],
      culturalConnections: [],
    },
    learningObjectives: content.learningObjectives || [],
    teachingTips: content.teachingTips || [],
  };

  // Ensure grade versions have proper structure
  Object.keys(defaultContent.gradeVersions).forEach((grade) => {
    const version = defaultContent.gradeVersions[grade];
    defaultContent.gradeVersions[grade] = {
      content: version.content || "",
      objectives: version.objectives || [],
      activities: version.activities || [],
      vocabulary: version.vocabulary || [],
    };
  });

  // CRITICAL: Ensure visual aids preserve svgCode
  if (defaultContent.visualAids.aids) {
    defaultContent.visualAids.aids = defaultContent.visualAids.aids.map(
      (aid) => ({
        type: aid.type || "svg",
        title: aid.title || "Visual Aid",
        description: aid.description || "",
        svgCode: aid.svgCode || "", // PRESERVE SVG CODE
        imageUrl:
          aid.imageUrl ||
          (aid.type === "image" ? "placeholder_url_if_missing" : ""), // NEW: Prioritize and preserve imageUrl for images
        teachingPoints: aid.teachingPoints || [],
        interactiveElements: aid.interactiveElements || [],
        drawingInstructions: aid.drawingInstructions || [],
        materials: aid.materials || [],
      })
    );
  }

  // Ensure hands-on activities have proper structure
  if (defaultContent.visualAids.handsonActivities) {
    defaultContent.visualAids.handsonActivities =
      defaultContent.visualAids.handsonActivities.map((activity) => ({
        name: activity.name || "Activity",
        materials: activity.materials || [],
        steps: activity.steps || [],
        learningOutcome: activity.learningOutcome || "",
      }));
  }

  return defaultContent;
}

// !Parse ADK response
function parseADKResponse(responseData) {
  try {
    let summary = null;

    // Convert response to string if it's an object
    let responseStr = "";
    if (typeof responseData === "string") {
      responseStr = responseData;
    } else if (responseData && typeof responseData === "object") {
      responseStr = JSON.stringify(responseData);
    } else {
      console.warn("⚠️ Unexpected response format:", typeof responseData);
      return null;
    }

    console.log("📝 Parsing response string length:", responseStr.length);

    // Method 1: Split by newlines and parse each JSON object
    const lines = responseStr
      .split("\n")
      .filter((line) => line.trim().length > 0);
    console.log("📋 Found", lines.length, "lines to parse");

    for (let i = 0; i < lines.length; i++) {
      try {
        const jsonObj = JSON.parse(lines[i]);
        console.log(
          `🔍 Line ${i} - Author: ${jsonObj.author}, Has text: ${!!jsonObj.content?.parts?.[0]?.text}`
        );

        // Look for profile_agent response with actual text content
        if (
          jsonObj.author === "profile_agent" &&
          jsonObj.content?.parts?.[0]?.text
        ) {
          summary = jsonObj.content.parts[0].text.trim();
          console.log(
            "✅ Found summary via JSON parsing:",
            summary.substring(0, 100) + "..."
          );
          break;
        }
      } catch (lineParseErr) {
        console.warn(`⚠️ Failed to parse line ${i}:`, lineParseErr.message);
        continue;
      }
    }

    // Method 2: Fallback regex approach if JSON parsing fails
    if (!summary) {
      console.log("🔄 Trying regex fallback approach...");
      const profileAgentRegex =
        /"author":\s*"profile_agent"[^}]*?"text":\s*"([^"\\]*(\\.[^"\\]*)*)"/;
      const match = responseStr.match(profileAgentRegex);

      if (match && match[1]) {
        summary = match[1]
          .replace(/\\"/g, '"') // Unescape quotes
          .replace(/\\n/g, "\n") // Unescape newlines
          .trim();
        console.log(
          "✅ Found summary via regex:",
          summary.substring(0, 100) + "..."
        );
      }
    }

    // Method 3: Final fallback - look for any text content in profile_agent context
    if (!summary) {
      console.log("🔄 Trying final fallback approach...");
      const textRegex = /"text":\s*"([^"\\]*(\\.[^"\\]*)*)"/g;
      let match;
      const textMatches = [];

      while ((match = textRegex.exec(responseStr)) !== null) {
        textMatches.push(match[1]);
      }

      // Get the last text match (usually the final response)
      if (textMatches.length > 0) {
        summary = textMatches[textMatches.length - 1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n")
          .trim();
        console.log(
          "✅ Found summary via final fallback:",
          summary.substring(0, 100) + "..."
        );
      }
    }

    if (!summary) {
      console.warn("❌ No summary found in response");
      return null;
    }

    // Validate summary content
    if (summary.length < 10) {
      console.warn("⚠️ Summary too short, might be invalid:", summary);
      return null;
    }

    return summary;
  } catch (error) {
    console.error("❌ Error parsing ADK response:", error.message);
    return null;
  }
}

//!parseGeminiResponse function
function parseGeminiResponse(responseText) {
  try {
    console.log("📝 Processing response, length:", responseText.length);

    let cleanText = responseText.trim();

    // Remove markdown code blocks
    cleanText = cleanText.replace(/^```json\s*/gi, "");
    cleanText = cleanText.replace(/^```\s*/g, "");
    cleanText = cleanText.replace(/\s*```$/g, "");

    // Remove control characters and BOM
    cleanText = cleanText.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
    cleanText = cleanText.replace(/^\uFEFF/, "");

    // Find the actual JSON boundaries more accurately
    const jsonBoundaries = findJsonBoundaries(cleanText);
    if (!jsonBoundaries) {
      throw new Error("No valid JSON object found in response");
    }

    // Extract JSON content
    cleanText = cleanText.substring(
      jsonBoundaries.start,
      jsonBoundaries.end + 1
    );

    // CRITICAL FIX: Handle unescaped quotes in Kannada/Unicode text
    cleanText = fixUnescapedQuotes(cleanText);

    // Fix other common JSON issues
    cleanText = cleanText
      // Fix trailing commas before closing braces/brackets
      .replace(/,(\s*[}\]])/g, "$1")
      // Remove any trailing content after the last brace (this was missing proper handling)
      .replace(/}\s*[^}]*$/, "}");

    // Remove notes and other non-JSON content
    cleanText = cleanText.replace(/\*\*Note:\*\*.*/g, "");

    // Try parsing with recovery
    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("❌ Initial parse failed, attempting recovery...");
      console.error("❌ Error:", parseError.message);

      // Show context around error
      const match = parseError.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        console.error(
          "❌ Context around error:",
          cleanText.substring(Math.max(0, pos - 30), pos + 30)
        );
        console.error("❌ Problem character:", cleanText[pos] || "EOF");
      }

      // Final recovery attempt
      cleanText = recoverJson(cleanText);
      parsed = JSON.parse(cleanText);
    }

    console.log("✅ Successfully parsed Gemini response");
    return parsed;
  } catch (error) {
    console.error("❌ Complete failure to parse Gemini response");
    console.error("❌ Final error:", error.message);
    console.error("❌ Response sample:", responseText.substring(0, 300));

    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}
function findJsonBoundaries(text) {
  console.log("🔍 Finding JSON boundaries...");

  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) {
    return null;
  }

  // Count braces to find the matching closing brace
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let jsonEnd = -1;

  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\" && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
    }
  }

  if (jsonEnd === -1) {
    console.log("❌ No matching closing brace found");
    return null;
  }

  console.log(`✅ JSON boundaries found: ${firstBrace} to ${jsonEnd}`);
  return { start: firstBrace, end: jsonEnd };
}
function fixUnescapedQuotes(jsonString) {
  console.log("🔧 Fixing unescaped quotes in JSON string...");

  let result = "";
  let i = 0;
  let inString = false;
  let escapeNext = false;

  while (i < jsonString.length) {
    const char = jsonString[i];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      i++;
      continue;
    }

    if (char === "\\" && inString) {
      result += char;
      escapeNext = true;
      i++;
      continue;
    }

    if (char === '"') {
      if (!inString) {
        // Starting a string
        inString = true;
        result += char;
      } else {
        // Check if this is actually the end of the string or an unescaped quote
        // Look ahead to see what comes next
        let j = i + 1;
        while (j < jsonString.length && /\s/.test(jsonString[j])) {
          j++; // Skip whitespace
        }

        const nextChar = jsonString[j];

        // If next significant character suggests end of string value, it's probably the closing quote
        if (
          nextChar === "," ||
          nextChar === "}" ||
          nextChar === "]" ||
          nextChar === ":" ||
          j >= jsonString.length // End of string
        ) {
          inString = false;
          result += char;
        } else {
          // This is likely an unescaped quote inside the string, escape it
          result += '\\"';
        }
      }
    } else {
      result += char;
    }

    i++;
  }

  console.log("🔧 Quote fixing complete");
  return result;
}
function recoverJson(jsonString) {
  console.log("🔧 Attempting final JSON recovery...");

  // Try a more aggressive quote fixing approach
  jsonString = fixUnescapedQuotesAggressive(jsonString);

  // Remove trailing commas
  jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");

  // Remove incomplete properties at the end
  jsonString = jsonString.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, "");

  // Remove trailing comma
  if (jsonString.trim().endsWith(",")) {
    jsonString = jsonString.trim().slice(0, -1);
  }

  // More aggressive cleanup of extra closing braces
  jsonString = cleanupExtraClosingBraces(jsonString);

  console.log("🔧 Final recovery complete");
  return jsonString;
}
function cleanupExtraClosingBraces(jsonString) {
  console.log("🔧 Cleaning up extra closing braces...");

  // Count opening and closing braces, brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  let validEnd = jsonString.length;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\" && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        // If we go negative, we have extra closing braces
        if (braceCount < 0) {
          validEnd = i;
          break;
        }
        // If we hit zero and this is a top-level object, this might be the end
        if (braceCount === 0) {
          // Check if there's meaningful content after this
          const remainingContent = jsonString.substring(i + 1).trim();
          if (remainingContent && !remainingContent.match(/^[\s}]*$/)) {
            // There's content after, but if it's just extra braces, cut it off
            if (remainingContent.match(/^[\s}]+$/)) {
              validEnd = i + 1;
              break;
            }
          }
        }
      } else if (char === "[") {
        bracketCount++;
      } else if (char === "]") {
        bracketCount--;
      }
    }
  }

  if (validEnd < jsonString.length) {
    console.log(`🔧 Trimming extra content from position ${validEnd}`);
    jsonString = jsonString.substring(0, validEnd);
  }

  return jsonString;
}
function fixUnescapedQuotesAggressive(jsonString) {
  console.log("🔧 Aggressive quote fixing...");

  // Split by lines and fix each line that looks like it contains string values
  const lines = jsonString.split("\n");
  const fixedLines = lines.map((line) => {
    // If line contains string assignment pattern like: "key": "value with "quotes" inside"
    const stringAssignMatch = line.match(/^(\s*"[^"]+"\s*:\s*")(.*)("[\s,]*)$/);
    if (stringAssignMatch) {
      const [, prefix, content, suffix] = stringAssignMatch;
      // Escape all quotes in the content part
      const fixedContent = content.replace(/(?<!\\)"/g, '\\"');
      return prefix + fixedContent + suffix;
    }
    return line;
  });

  return fixedLines.join("\n");
}

module.exports = {
  getExperienceLevel,
  getAIPreferences,
  determineTopicExpertise,
  calculateProfileStrength,
  delay,
  parseGeminiResponse,
  sanitizeForFirestore,
  validateContentStructure,
  parseADKResponse,
};
