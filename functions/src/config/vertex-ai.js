const { PredictionServiceClient } = require("@google-cloud/aiplatform");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const functions = require("firebase-functions");

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

// Model endpoints
const IMAGEN_ENDPOINT = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-002`;

class VertexAIService {
  constructor() {
    this.predictionClient = predictionClient;
    this.storage = storage;
    this.bucket = storage.bucket(BUCKET_NAME);
  }

  // In your vertex-ai.js or a setup file
  async ensureBucketExists() {
    try {
      const { Storage } = require("@google-cloud/storage");
      const storage = new Storage();
      const PROJECT_ID = process.env.GOOGLECLOUD_PROJECT;
      const BUCKET_NAME = `${PROJECT_ID}-sahayak-images`;

      const [exists] = await storage.bucket(BUCKET_NAME).exists();
      if (!exists) {
        await storage.createBucket(BUCKET_NAME, {
          location: "US",
          storageClass: "STANDARD",
        });
        console.log(`✅ Created storage bucket: ${BUCKET_NAME}`);
      }
    } catch (error) {
      console.error("❌ Storage bucket setup failed:", error);
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
}

module.exports = {
  VertexAIService: new VertexAIService(),
  PROJECT_ID,
  LOCATION,
  BUCKET_NAME,
};
