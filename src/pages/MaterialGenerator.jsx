// src/components/MaterialGenerator.jsx
import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const MaterialGenerator = () => {
	const [selectedImage, setSelectedImage] = useState(null);
	const [imagePreview, setImagePreview] = useState(null);
	const [contextText, setContextText] = useState('');
	const [loading, setLoading] = useState(false);
	const [generatedMaterials, setGeneratedMaterials] = useState(null);
	const [error, setError] = useState('');

	const teacherData = JSON.parse(sessionStorage.getItem('teacherData') || '{}');

	const handleImageUpload = (event) => {
		const file = event.target.files[0];
		if (file && file.type.startsWith('image/')) {
			if (file.size > 5 * 1024 * 1024) { // 5MB limit
				setError('Image size should be less than 5MB');
				return;
			}
			setSelectedImage(file);
			setError('');
			const reader = new FileReader();
			reader.onload = (e) => setImagePreview(e.target.result);
			reader.readAsDataURL(file);
		} else {
			setError('Please select a valid image file');
		}
	};

	const convertImageToBase64 = (file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result.split(',')[1]);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	};

	const generateMaterials = async () => {
		if (!selectedImage && !contextText.trim()) {
			setError('Please provide either an image or context text');
			return;
		}

		setLoading(true);
		setError('');

		try {
			let imageBase64 = null;
			if (selectedImage) {
				imageBase64 = await convertImageToBase64(selectedImage);
			}

			const generateDifferentiatedMaterials = httpsCallable(functions, 'generateDifferentiatedMaterials');

			const result = await generateDifferentiatedMaterials({
				imageBase64,
				contextText: contextText.trim(),
				teacherId: teacherData.id,
				teacherGrades: teacherData.grades || ['1', '2', '3'],
				teacherLocation: teacherData.location
			});

			setGeneratedMaterials(result.data);
		} catch (error) {
			console.error('Error generating materials:', error);
			setError('Failed to generate materials. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const downloadWorksheet = (grade, content) => {
		const element = document.createElement('a');
		const file = new Blob([content], { type: 'text/plain' });
		element.href = URL.createObjectURL(file);
		element.download = `Grade_${grade}_Worksheet.txt`;
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	};

	return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Create Differentiated Materials
        </h2>
        <p className="text-gray-600">
          Upload a textbook page or provide context to generate
          grade-appropriate worksheets
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Image Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Textbook Page (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              {imagePreview ? (
                <div>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full max-h-48 mx-auto rounded-lg mb-2"
                  />
                  <p className="text-sm text-gray-600">Click to change image</p>
                </div>
              ) : (
                <div className="text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p>Click to upload textbook page</p>
                  <p className="text-xs mt-1">PNG, JPG up to 5MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Context Text Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            placeholder="Provide additional context like: 'Create math worksheets about addition for grades 1-3 in Kannada' or 'Science lesson about plants'"
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Specify subject, topic, language, or any special requirements
          </p>
        </div>
      </div>

      {/* Teacher Info Display */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-gray-700 mb-2">
          Your Class Information:
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <span className="font-medium">Grades:</span>{" "}
            {teacherData.grades?.join(", ") || "Not specified"}
          </p>
          <p>
            <span className="font-medium">Location:</span>{" "}
            {teacherData.location || "Not specified"}
          </p>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateMaterials}
        disabled={(!selectedImage && !contextText.trim()) || loading}
        className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generating Materials...
          </>
        ) : (
          "Generate Differentiated Materials"
        )}
      </button>

      {/* Results Section */}
      {generatedMaterials && (
        <div className="mt-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Generated Materials
          </h3>

          {/* Analysis Summary */}
          {generatedMaterials.analysis && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">
                Content Analysis
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <p>
                  <span className="font-medium">Subject:</span>{" "}
                  {generatedMaterials.analysis.subject}
                </p>
                <p>
                  <span className="font-medium">Topic:</span>{" "}
                  {generatedMaterials.analysis.topic}
                </p>
                <p>
                  <span className="font-medium">Language:</span>{" "}
                  {generatedMaterials.analysis.language}
                </p>
                <p>
                  <span className="font-medium">Difficulty:</span>{" "}
                  {generatedMaterials.analysis.difficulty}
                </p>
              </div>
            </div>
          )}

          {/* Grade-wise Materials */}
          <div className="space-y-6">
            {Object.entries(generatedMaterials.versions || {}).map(
              ([grade, content]) => (
                <div
                  key={grade}
                  className="border border-gray-200 rounded-lg p-6 bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-semibold text-blue-600">
                      {grade.replace("grade", "Grade ")} Worksheet
                    </h4>
                    <button
                      onClick={() =>
                        downloadWorksheet(
                          grade.replace("grade", ""),
                          content.content
                        )
                      }
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                    >
                      Download
                    </button>
                  </div>

                  <div className="space-y-4">
                    {content.content && (
                      <div className="bg-white p-4 rounded border">
                        <h5 className="font-medium text-gray-700 mb-2">
                          Content:
                        </h5>
                        <div className="text-gray-600 whitespace-pre-wrap">
                          {content.content}
                        </div>
                      </div>
                    )}

                    {content.objectives && content.objectives.length > 0 && (
                      <div className="bg-white p-4 rounded border">
                        <h5 className="font-medium text-gray-700 mb-2">
                          Learning Objectives:
                        </h5>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          {content.objectives.map((objective, idx) => (
                            <li key={idx}>{objective}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {content.activities && content.activities.length > 0 && (
                      <div className="bg-white p-4 rounded border">
                        <h5 className="font-medium text-gray-700 mb-2">
                          Activities:
                        </h5>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          {content.activities.map((activity, idx) => (
                            <li key={idx}>{activity}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {content.vocabulary && content.vocabulary.length > 0 && (
                      <div className="bg-white p-4 rounded border">
                        <h5 className="font-medium text-gray-700 mb-2">
                          Key Vocabulary:
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {content.vocabulary.map((word, idx) => (
                            <span
                              key={idx}
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                            >
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialGenerator;
