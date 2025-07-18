import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

const ContentHub = () => {
  const [request, setRequest] = useState("");
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [teacherData, setTeacherData] = useState(null);

  useEffect(() => {
    const storedTeacherData = JSON.parse(sessionStorage.getItem("teacherData"));
    console.log("Stored teacher data:", storedTeacherData);
    setTeacherData(storedTeacherData);

    if (storedTeacherData?.grades) {
      setSelectedGrades(storedTeacherData.grades);
    }
  }, []);

  const handleCreateContent = async () => {
    if (!request.trim()) {
      setError("Please enter a content request");
      return;
    }

    if (selectedGrades.length === 0) {
      setError("Please select at least one grade");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createSahayakContent = httpsCallable(
        functions,
        "createSahayakContent"
      );
      const result = await createSahayakContent({
        teacherId: teacherData.id,
        contentRequest: request,
        grades: selectedGrades,
      });

      console.log("Result from backend:", result.data);

      if (result.data.success) {
        setContent(result.data.data);
        console.log("Content set:", result.data.data);
      } else {
        setError("Failed to create content");
      }
    } catch (error) {
      console.error("Error creating content:", error);
      setError("Failed to create content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeToggle = (grade) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🎓 Sahayak AI Assistant
        </h1>
        <p className="text-gray-600 mb-6">
          Create localized, differentiated content for your multi-grade
          classroom
        </p>

        {/* Content Request Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content Request
          </label>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Example: Create a story about soil types for farming, or Explain the water cycle with local examples"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
          />
        </div>

        {/* Grade Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Grades
          </label>
          <div className="flex flex-wrap gap-2">
            {["1", "2", "3", "4", "5"].map((grade) => (
              <button
                key={grade}
                onClick={() => handleGradeToggle(grade)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedGrades.includes(grade)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Grade {grade}
              </button>
            ))}
          </div>
        </div>

        {/* Teacher Location Info */}
        {teacherData && (
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Location:</strong> {teacherData?.location}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Content will be localized for your region with cultural context
              and local language support.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreateContent}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Content...
            </span>
          ) : (
            "Create Localized Content"
          )}
        </button>

        {/* Content Display */}
        {content && (
          <ContentDisplay
            content={content}
            reliabilityScore={content.reliabilityScore}
            wasRevised={content.wasRevised}
          />
        )}
      </div>
    </div>
  );
};

// Content Display Component
const ContentDisplay = ({ content, reliabilityScore, wasRevised }) => {
  const [activeTab, setActiveTab] = useState("story");

  return (
    <div className="mt-8 bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Generated Content</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">
              Reliability Score:
            </span>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                reliabilityScore > 0.8
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {Math.round(reliabilityScore * 100)}%
            </div>
          </div>
          {wasRevised && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Revised
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { id: "story", label: "Story", icon: "📚" },
          { id: "grades", label: "Grade Versions", icon: "📊" },
          { id: "visual", label: "Visual Aids", icon: "🎨" },
          { id: "tips", label: "Teaching Tips", icon: "💡" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "story" && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Main Story</h3>
          <div className="bg-white p-4 rounded-md border">
            <p className="text-gray-800 leading-relaxed">
              {content.content.story}
            </p>
          </div>

          {content.content.culturalContext && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">
                Cultural Context
              </h4>
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Local References:</strong>{" "}
                  {content.content.culturalContext.localReferences?.join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "grades" && (
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Grade-Specific Versions
          </h3>
          <div className="space-y-4">
            {Object.entries(content.content.gradeVersions).map(
              ([grade, version]) => (
                <div key={grade} className="bg-white p-4 rounded-md border">
                  <h4 className="font-medium text-gray-700 mb-2 capitalize">
                    {grade.replace("grade", "Grade ")}
                  </h4>
                  <p className="text-gray-800 mb-3">{version.content}</p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-600 mb-1">
                        Learning Objectives
                      </h5>
                      <ul className="text-sm text-gray-700 list-disc list-inside">
                        {version.objectives?.map((obj, index) => (
                          <li key={index}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-600 mb-1">
                        Key Vocabulary
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {version.vocabulary?.map((word, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {activeTab === "visual" && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Visual Aids</h3>
          <div className="space-y-6">
            {/* Debug: Show raw data */}
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">Debug Info:</h4>
              <pre className="text-xs text-yellow-700 overflow-x-auto">
                {JSON.stringify(content.content.visualAids, null, 2)}
              </pre>
            </div>

            {content.content.visualAids?.aids?.length > 0 ? (
              content.content.visualAids.aids.map((aid, index) => (
                <VisualAidCard key={index} aid={aid} />
              ))
            ) : (
              <div className="bg-white p-6 rounded-md border">
                <p className="text-gray-500 text-center">
                  No visual aids generated. Please try again.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "tips" && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Teaching Tips</h3>
          <div className="bg-white p-4 rounded-md border">
            <ul className="space-y-2">
              {content.content.teachingTips?.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">💡</span>
                  <span className="text-gray-800">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Visual Aid Card Component
const VisualAidCard = ({ aid }) => {
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Debug: Log the aid object
  console.log("Visual Aid Object:", aid);

  // Clean and validate SVG code
  const cleanSvgCode = (svgString) => {
    if (!svgString || typeof svgString !== "string") {
      console.log("Invalid SVG string:", svgString);
      return "";
    }

    // Remove any potential harmful scripts
    const cleanedSvg = svgString.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );

    // Ensure it's a valid SVG
    if (!cleanedSvg.includes("<svg")) {
      console.log("No SVG tag found in:", cleanedSvg);
      return "";
    }

    return cleanedSvg;
  };

  const svgCode = cleanSvgCode(aid.svgCode);

  return (
    <div className="bg-white p-6 rounded-md border">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-medium text-gray-700 text-lg">{aid.title}</h4>
          <p className="text-gray-600 mt-1">{aid.description}</p>
        </div>
        {svgCode && (
          <button
            onClick={() => setShowFullscreen(true)}
            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
          >
            View Fullscreen
          </button>
        )}
      </div>

      {/* SVG Display */}
      {svgCode ? (
        <div className="mb-4">
          <div
            className="border border-gray-200 rounded-md p-4 bg-gray-50 svg-container"
            dangerouslySetInnerHTML={{ __html: svgCode }}
            style={{ minHeight: "300px" }}
          />
        </div>
      ) : (
        <div className="mb-4">
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">SVG content not available</p>
              <p className="text-sm text-gray-400">
                Raw SVG data:{" "}
                {aid.svgCode ? "Present but invalid" : "Not present"}
              </p>
              {aid.svgCode && (
                <pre className="text-xs text-gray-400 mt-2 max-w-full overflow-x-auto">
                  {aid.svgCode.substring(0, 200)}...
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Teaching Points */}
      {aid.teachingPoints && aid.teachingPoints.length > 0 && (
        <div className="mb-4">
          <h5 className="font-medium text-gray-600 mb-2">Teaching Points</h5>
          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
            {aid.teachingPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Interactive Elements */}
      {aid.interactiveElements && aid.interactiveElements.length > 0 && (
        <div className="mb-4">
          <h5 className="font-medium text-gray-600 mb-2">
            Interactive Elements
          </h5>
          <div className="flex flex-wrap gap-2">
            {aid.interactiveElements.map((element, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
              >
                {element}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Traditional Drawing Instructions (fallback) */}
      {aid.drawingInstructions && aid.drawingInstructions.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <h5 className="font-medium text-gray-600 mb-1">
              Drawing Instructions (for blackboard)
            </h5>
            <ol className="text-sm text-gray-700 list-decimal list-inside">
              {aid.drawingInstructions.map((instruction, i) => (
                <li key={i}>{instruction}</li>
              ))}
            </ol>
          </div>
          <div>
            <h5 className="font-medium text-gray-600 mb-1">Materials Needed</h5>
            <ul className="text-sm text-gray-700 list-disc list-inside">
              {aid.materials?.map((material, i) => (
                <li key={i}>{material}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && svgCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-5xl max-h-[90vh] w-full mx-4 overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{aid.title}</h3>
              <button
                onClick={() => setShowFullscreen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div
                className="w-full svg-container"
                dangerouslySetInnerHTML={{ __html: svgCode }}
                style={{ minHeight: "400px" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentHub;
