const { onCall } = require("firebase-functions/v2/https");
const vision = require("@google-cloud/vision");
const DifferentiatorAgent = require("../agents/differentiator-agent");

exports.processTextbookImage = onCall(async (request) => {
  const { imageUrl, teacherId, grades } = request.data;

  const client = new vision.ImageAnnotatorClient();
  const differentiator = new DifferentiatorAgent();

  try {
    // Step 1: OCR the image
    const [result] = await client.textDetection(imageUrl);
    const detections = result.textAnnotations;
    const extractedText = detections[0]?.description || "";

    // Step 2: Create differentiated worksheets
    const worksheets = await differentiator.createWorksheetFromImage(
      extractedText,
      grades
    );

    // Step 3: Store results
    const worksheetDoc = await admin.firestore().collection("worksheets").add({
      teacherId,
      sourceImageUrl: imageUrl,
      extractedText,
      grades,
      worksheets: worksheets.versions,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      worksheetId: worksheetDoc.id,
      extractedText,
      worksheets: worksheets.versions,
    };
  } catch (error) {
    console.error("Vision processing error:", error);
    throw error;
  }
});
