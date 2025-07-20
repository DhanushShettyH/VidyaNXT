const { Storage } = require("@google-cloud/storage");
const path = require("path");

// Set credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
  __dirname,
  "../vidyanxt-service-account.json" // Adjust path based on placement
);

const storage = new Storage();

async function createBucket() {
  const PROJECT_ID = process.env.GOOGLECLOUD_PROJECT || "vidyanxt-c5816";
  const bucketName = `${PROJECT_ID}-sahayak-images`;

  try {
    console.log(`🔄 Creating bucket: ${bucketName}...`);

    await storage.createBucket(bucketName, {
      location: "US",
      storageClass: "STANDARD",
      publicReadAccess: true, // For easy image serving
      uniformBucketLevelAccess: true,
    });

    console.log(`✅ Bucket ${bucketName} created successfully.`);

    // Set public read permissions
    await storage.bucket(bucketName).makePublic();
    console.log(`✅ Bucket ${bucketName} made publicly readable.`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`ℹ️  Bucket ${bucketName} already exists.`);

      // Check if bucket is publicly readable
      try {
        await storage.bucket(bucketName).makePublic();
        console.log(`✅ Confirmed bucket ${bucketName} is publicly readable.`);
      } catch (permError) {
        console.log(`ℹ️  Bucket permissions already configured.`);
      }
    } else {
      console.error("❌ Error creating bucket:", error);
      throw error;
    }
  }
}

// Run the setup
if (require.main === module) {
  createBucket()
    .then(() => {
      console.log("🎉 Storage setup completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Storage setup failed:", error);
      process.exit(1);
    });
}

module.exports = { createBucket };
