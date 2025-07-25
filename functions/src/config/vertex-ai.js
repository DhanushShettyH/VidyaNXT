const {
  PredictionServiceClient,
  ReasoningEngineServiceClient,
} = require("@google-cloud/aiplatform");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const functions = require("firebase-functions");
const { parseADKResponse } = require("../utils/helpers");

// Set credentials path
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
  __dirname,
  "../../vidyanxt-service-account.json"
);

// Initialize clients
const predictionClient = new PredictionServiceClient();
const storage = new Storage();

// Configuration
const PROJECT_ID =
  process.env.GOOGLECLOUD_PROJECT || functions.config()?.project?.id;
const LOCATION = "us-central1";
const BUCKET_NAME = `${PROJECT_ID}-sahayak-images`;
const AUDIO_BUCKET_NAME = `${PROJECT_ID}-sahayak-audio`;

// Model endpoints
const IMAGEN_ENDPOINT = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-002`;
const CHIRP_ENDPOINT = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/chirp-2`;
const DEPLOYED_AGENT_RESOURCE_NAME = `projects/400977849683/locations/us-central1/reasoningEngines/6015779959283384320`;

class VertexAIService {
  constructor() {
    this.predictionClient = predictionClient;
    this.storage = storage;
    this.reasoningEngineClient = new ReasoningEngineServiceClient(); // Add this

    this.bucket = storage.bucket(BUCKET_NAME);
    this.audioBucket = storage.bucket(AUDIO_BUCKET_NAME);
  }

  // Ensure both image and audio buckets exist
  async ensureBucketsExist() {
    try {
      // Image bucket
      const [imageExists] = await this.bucket.exists();
      if (!imageExists) {
        await this.storage.createBucket(BUCKET_NAME, {
          location: "US",
          storageClass: "STANDARD",
        });
        console.log(`✅ Created image storage bucket: ${BUCKET_NAME}`);
      }

      // Audio bucket
      const [audioExists] = await this.audioBucket.exists();
      if (!audioExists) {
        await this.storage.createBucket(AUDIO_BUCKET_NAME, {
          location: "US",
          storageClass: "STANDARD",
        });
        console.log(`✅ Created audio storage bucket: ${AUDIO_BUCKET_NAME}`);
      }
    } catch (error) {
      console.error("❌ Storage bucket setup failed:", error);
    }
  }

  // Speech-to-Text using Chirp model
  async transcribeAudioWithChirp(audioData, options = {}) {
    try {
      const instanceValue = {
        audio_content: { stringValue: audioData },
        config: {
          structValue: {
            fields: {
              encoding: { stringValue: options.encoding || "WEBM_OPUS" },
              sample_rate_hertz: { numberValue: options.sampleRate || 48000 },
              language_code: { stringValue: options.languageCode || "hi-IN" },
              enable_automatic_punctuation: { boolValue: true },
              model: { stringValue: "chirp_2" },
            },
          },
        },
      };

      const request = {
        endpoint: CHIRP_ENDPOINT,
        instances: [{ structValue: { fields: instanceValue } }],
      };

      const [response] = await this.predictionClient.predict(request);

      // Extract transcript from response
      let transcript = "";
      if (
        response.predictions?.[0]?.structValue?.fields?.transcript?.stringValue
      ) {
        transcript =
          response.predictions[0].structValue.fields.transcript.stringValue;
      }

      return { transcript: transcript.trim(), confidence: 0.8 };
    } catch (error) {
      throw new Error(`Speech transcription failed: ${error.message}`);
    }
  }

  // Extract confidence score from prediction
  extractConfidence(prediction) {
    try {
      if (prediction.structValue?.fields?.results?.listValue?.values) {
        const results = prediction.structValue.fields.results.listValue.values;
        if (
          results.length > 0 &&
          results[0].structValue?.fields?.alternatives?.listValue?.values
        ) {
          const alternatives =
            results[0].structValue.fields.alternatives.listValue.values;
          if (
            alternatives.length > 0 &&
            alternatives[0].structValue?.fields?.confidence?.numberValue
          ) {
            return alternatives[0].structValue.fields.confidence.numberValue;
          }
        }
      }
      return 0.8; // Default confidence
    } catch (error) {
      return 0.8;
    }
  }

  // Save audio file to storage
  async saveAudioToStorage(audioData, fileName) {
    try {
      const file = this.audioBucket.file(fileName);
      let buffer;

      if (Buffer.isBuffer(audioData)) {
        buffer = audioData;
      } else if (typeof audioData === "string") {
        buffer = Buffer.from(audioData, "base64");
      } else {
        throw new Error("Invalid audio data format");
      }

      await file.save(buffer, {
        metadata: {
          contentType: "audio/webm",
          cacheControl: "public, max-age=3600",
        },
      });

      const publicUrl = `https://storage.googleapis.com/${AUDIO_BUCKET_NAME}/${fileName}`;
      console.log("✅ Audio saved successfully:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error("❌ Audio storage error:", error);
      throw new Error(`Failed to save audio: ${error.message}`);
    }
  }

  async generateImageWithImagen(prompt, options = {}) {
    const maxRetries = 5;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const instanceValue = {
          prompt: {
            stringValue: prompt,
          },
          sampleCount: {
            intValue: options.numberOfImages || 1,
          },
          aspectRatio: {
            stringValue: options.aspectRatio || "1:1",
          },
        };

        const instances = [
          {
            structValue: {
              fields: instanceValue,
            },
          },
        ];

        const request = {
          endpoint: IMAGEN_ENDPOINT,
          instances: instances,
        };

        console.log(
          "🎨 Calling Vertex AI Imagen with prompt:",
          prompt.substring(0, 100)
        );
        const [response] = await this.predictionClient.predict(request);
        // console.log(
        //   "🔍 Vertex AI response structure:",
        //   JSON.stringify(response, null, 2)
        // );
        // console.log("🔍 Predictions count:", response.predictions?.length);

        if (response.predictions && response.predictions.length > 0) {
          //   console.log(
          //     "🔍 First prediction structure:",
          //     JSON.stringify(response.predictions[0], null, 2)
          //   );
        }
        return response.predictions;
      } catch (error) {
        if (error.code === 8 && error.details.includes("Quota exceeded")) {
          // RESOURCE_EXHAUSTED
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Backoff
        } else {
          throw error;
        }
      }
    }
    throw new Error("Quota exceeded after retries");
  }

  async saveImageToStorage(imageData, fileName) {
    try {
      //   console.log(
      //     "🔍 Debugging image data structure:",
      //     JSON.stringify(imageData, null, 2)
      //   );

      const file = this.bucket.file(fileName);
      let buffer;

      // Handle various Vertex AI Imagen response formats
      if (typeof imageData === "string") {
        // Direct base64 string
        buffer = Buffer.from(imageData, "base64");
      } else if (imageData.bytesBase64Encoded) {
        // Standard format
        buffer = Buffer.from(imageData.bytesBase64Encoded, "base64");
      } else if (imageData.structValue?.bytesBase64Encoded?.stringValue) {
        // Nested struct format
        buffer = Buffer.from(
          imageData.structValue.bytesBase64Encoded.stringValue,
          "base64"
        );
      } else if (
        imageData.structValue?.fields?.bytesBase64Encoded?.stringValue
      ) {
        // Deeply nested format
        buffer = Buffer.from(
          imageData.structValue.fields.bytesBase64Encoded.stringValue,
          "base64"
        );
      } else if (imageData.predictions && imageData.predictions[0]) {
        // Wrapped in predictions array
        return this.saveImageToStorage(imageData.predictions[0], fileName);
      } else if (imageData.structValue && imageData.structValue.fields) {
        // Check all fields in structValue
        const fields = imageData.structValue.fields;
        if (
          fields.bytesBase64Encoded &&
          fields.bytesBase64Encoded.stringValue
        ) {
          buffer = Buffer.from(fields.bytesBase64Encoded.stringValue, "base64");
        } else {
          // Log the actual structure for debugging
          console.error(
            "🔍 Unhandled image data structure:",
            JSON.stringify(fields, null, 2)
          );
          throw new Error(
            `Unrecognized image data format. Available fields: ${Object.keys(fields).join(", ")}`
          );
        }
      } else {
        // Log the actual structure for debugging
        console.error(
          "🔍 Unknown image data format:",
          JSON.stringify(imageData, null, 2)
        );
        throw new Error(
          `Invalid image data format. Type: ${typeof imageData}, Keys: ${Object.keys(imageData || {}).join(", ")}`
        );
      }

      await file.save(buffer, {
        metadata: {
          contentType: "image/png",
          cacheControl: "public, max-age=31536000",
        },
      });

      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
      console.log("✅ Image saved successfully:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error(
        "❌ Storage error details:",
        JSON.stringify(error, null, 2)
      );
      if (error.status === 403) {
        console.warn(
          "⚠️ Permission denied. Check service account roles in Google Cloud IAM."
        );
      }
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }

  // **NEW METHOD: Call the deployed ADK agent**
  // **CORRECTED METHOD: Call the deployed ADK agent**
  // **HYBRID APPROACH: Use Google Auth but direct HTTP calls**
  // **RECOMMENDED: Keep axios but use Google client for auth**
  async callDeployedAgent(message) {
    try {
      console.log("🤖 Calling deployed ADK agent with message:", message);

      // Get auth token from the Google client
      const authClient = await this.reasoningEngineClient.auth.getClient();
      const accessToken = await authClient.getAccessToken();

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken.token}`,
      };

      // Generate user ID for this session
      const userId = `session_${Date.now()}`;

      // Use axios for the HTTP call
      const axios = require("axios");
      const response = await axios.post(
        `https://us-central1-aiplatform.googleapis.com/v1/${DEPLOYED_AGENT_RESOURCE_NAME}:streamQuery`,
        {
          input: {
            message: message,
            user_id: userId,
          },
        },
        { headers, timeout: 30000 }
      );

      console.log("🔍 Raw ADK Response received");

      // ✅ Use the parse helper function
      const summary = parseADKResponse(response.data);

      console.log("---------------------------");
      console.log(
        "Final Extracted Summary:",
        summary ? summary.substring(0, 100) + "..." : "null"
      );
      console.log("---------------------------");

      return { summary };
    } catch (error) {
      console.error("❌ Deployed agent call failed:", error);
      throw new Error(`Agent call failed: ${error.message}`);
    }
  }
}

module.exports = {
  VertexAIService: new VertexAIService(),
  PROJECT_ID,
  LOCATION,
  BUCKET_NAME,
  AUDIO_BUCKET_NAME,
};
