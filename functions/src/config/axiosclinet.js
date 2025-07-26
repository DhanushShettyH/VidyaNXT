const { GoogleAuth } = require("google-auth-library");
const axios = require("axios");

async function callADKAgent(payload) {
  const projectId = "400977849683";
  const location = "us-central1";
  const reasoningEngineId = "3459987170750627840";

  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/reasoningEngines/${reasoningEngineId}:streamQuery`;

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken.token}`,
  };

  try {
    // Format the teacher data into a clear message
    const teacherInfo = `Name: ${payload.name}, Grades: ${payload.grades.join(", ")}, Location: ${payload.location}, Experience: ${payload.experience} years`;

    const response = await axios.post(
      endpoint,
      {
        input: {
          message: `Generate a professional summary for this teacher profile: ${teacherInfo}`,
          user_id: `teacher_${payload.id || Date.now()}`,
        },
      },
      { headers, timeout: 30000 }
    );

    // Extract the actual summary from the response
    const summary = response.data?.content?.parts?.[0]?.text || response.data;
    console.log("------------------------------");
    console.log("ADK ");
    console.log("------------------------------");

    return { summary };
  } catch (error) {
    console.error(
      "Error calling ADK Agent:",
      error.response?.data || error.message
    );
    throw error;
  }
}

module.exports = { callADKAgent };
