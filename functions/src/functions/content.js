const { onCall } = require("firebase-functions/v2/https");
const RegionalizerAgent = require("../agents/regionalizer-agent");
const DifferentiatorAgent = require("../agents/differentiator-agent");
const VisualArtistAgent = require("../agents/visual-artist-agent");

exports.generateLocalizedContent = onCall(async (request) => {
  const { teacherId, contentType, topic, grades, description } = request.data;

  const regionalizer = new RegionalizerAgent();
  const differentiator = new DifferentiatorAgent();
  const visualArtist = new VisualArtistAgent();

  try {
    // Step 1: Generate base content
    const baseContent = await generateText(
      `Create a ${contentType} about ${topic}: ${description}`
    );

    // Step 2: Regionalize content
    const localizedContent = await regionalizer.regionalizeContent(
      teacherId,
      baseContent,
      topic
    );

    // Step 3: Create grade-differentiated versions
    const differentiatedContent = await differentiator.createGradeLevels(
      localizedContent.localizedContent,
      grades
    );

    // Step 4: Generate visual aids
    const visualAids = await visualArtist.createVisualAids(topic, grades);

    // Step 5: Store in Firestore
    const contentDoc = await admin
      .firestore()
      .collection("content_library")
      .add({
        teacherId,
        topic,
        grades,
        localizedContent,
        differentiatedContent,
        visualAids,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      contentId: contentDoc.id,
      localizedContent,
      differentiatedContent,
      visualAids,
    };
  } catch (error) {
    console.error("Content generation error:", error);
    throw error;
  }
});
