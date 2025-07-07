const { GoogleGenerativeAI } = require("@google/generative-ai");
const functions = require("firebase-functions");

// Initialize Gemini AI (free tier)
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || functions.config()?.gemini?.key
);
// Get the model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Helper function to generate text
async function generateText(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log("------------------------------------gemini");
    console.log("Gemini response:", response);
    console.log("------------------------------------gemini");

    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate content");
  }
}

module.exports = {
  model,
  generateText,
};
