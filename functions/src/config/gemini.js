// functions/src/config/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const functions = require("firebase-functions");

// Initialize Gemini AI (free tier)
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || functions.config()?.gemini?.key
);

// Get the text-only model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Get the vision model for image analysis
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Helper function to generate text
async function generateText(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log("------------------------------------gemini");
    console.log("------------------------------------gemini");
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate content");
  }
}

// NEW: Helper function to analyze images with text prompt
async function analyzeImageWithText(imageBase64, textPrompt) {
  try {
    const imageParts = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg", // or detect from image
        },
      },
    ];

    const result = await visionModel.generateContent([
      textPrompt,
      ...imageParts,
    ]);
    const response = await result.response;

    console.log("------------------------------------gemini-vision");
    console.log(
      "Analyzing image with prompt:",
      textPrompt.substring(0, 100) + "..."
    );
    console.log("------------------------------------gemini-vision");

    return response.text();
  } catch (error) {
    console.error("Gemini Vision API error:", error);
    throw new Error("Failed to analyze image: " + error.message);
  }
}

module.exports = {
  model,
  generateText,
  analyzeImageWithText, // NEW function export
};
