import { httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, functions } from "../firebase";
import ContentDetailView from "./ContentDetailView";
import { MaterialDetailView } from "./MaterialDetailView"; // Import MaterialDetailView
import { doc, onSnapshot } from "firebase/firestore";

export const TodaysPlan = ({ teacherData }) => {
  const [todaysPlan, setTodaysPlan] = useState(null);
  const [hasWeeklyPlan, setHasWeeklyPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatingWorksheet, setGeneratingWorksheet] = useState(false);

  // New states for content/worksheet viewing
  const [viewingContent, setViewingContent] = useState(false);
  const [viewingWorksheet, setViewingWorksheet] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedWorksheet, setSelectedWorksheet] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTodaysPlan();
  }, []);

  useEffect(() => {
    if (!todaysPlan?.planId) return;

    console.log("🔍 Setting up Firestore listener for:", todaysPlan.planId);

    const planRef = doc(db, "weekly_lesson_plans", todaysPlan.planId);

    const unsubscribe = onSnapshot(
      planRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const updatedPlan = snapshot.data();
          const updatedDayPlan = updatedPlan.dailyPlans[todaysPlan.date];

          console.log("🔄 Firestore update received:", updatedDayPlan);

          // CRITICAL: Update ALL fields from the day plan
          setTodaysPlan((prev) => ({
            ...prev,
            // Merge all the updated day plan fields
            ...updatedDayPlan,
            // Keep the metadata from the original plan
            planId: prev.planId,
            date: prev.date,
            syllabus: prev.syllabus,
            language: prev.language,
          }));

          // Debug log to verify state update
          console.log(
            "📝 Updated contentStatus:",
            updatedDayPlan.contentStatus
          );
          console.log("📋 Updated contentIds:", updatedDayPlan.contentIds);
        }
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

    return () => {
      console.log("🧹 Cleaning up Firestore listener");
      unsubscribe();
    };
  }, [todaysPlan?.planId, todaysPlan?.date]);

  useEffect(() => {
    if (
      todaysPlan?.contentStatus === "ready" ||
      todaysPlan?.contentStatus === "failed"
    ) {
      setGeneratingContent(false);
    }
    if (
      todaysPlan?.worksheetStatus === "ready" ||
      todaysPlan?.worksheetStatus === "failed"
    ) {
      setGeneratingWorksheet(false);
    }
  }, [todaysPlan?.contentStatus, todaysPlan?.worksheetStatus]);

  // Debug effect to track state changes
  useEffect(() => {
    console.log("🔍 Current todaysPlan state:", {
      contentStatus: todaysPlan?.contentStatus,
      contentIds: todaysPlan?.contentIds,
      worksheetStatus: todaysPlan?.worksheetStatus,
      worksheetIds: todaysPlan?.worksheetIds,
    });
  }, [todaysPlan]);

  const fetchTodaysPlan = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const getTodaysPlan = httpsCallable(functions, "getTodaysPlan");
      const result = await getTodaysPlan({
        teacherId: teacherData.id || teacherData.id,
        date: today,
      });

      if (result.data.success) {
        setTodaysPlan(result.data.plan);
        setHasWeeklyPlan(!!result.data.plan);
      }
    } catch (error) {
      console.error("Error fetching today's plan:", error);
      setHasWeeklyPlan(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContent = async () => {
    if (!todaysPlan) return;

    setGeneratingContent(true);
    try {
      console.log("🚀 Starting content generation...");

      const generateContent = httpsCallable(functions, "generateDayContent");
      const result = await generateContent({
        planId: todaysPlan.planId,
        day: todaysPlan.date,
        teacherId: teacherData.uid || teacherData.id,
      });

      console.log("✅ Content generation started:", result.data);

      // Don't update state here - let the Firestore listener handle it
      // The status will change from "pending" → "generating" → "ready" automatically
    } catch (error) {
      console.error("❌ Error starting content generation:", error);
      alert("Failed to start content generation");
      setGeneratingContent(false);
    }
    // Note: We don't set setGeneratingContent(false) here
    // We'll do it when status changes to "ready" or "failed"
  };

  const handleCreateWorksheet = async () => {
    if (!todaysPlan) return;

    setGeneratingWorksheet(true);
    try {
      const generateWorksheet = httpsCallable(
        functions,
        "generateDayWorksheet"
      );
      generateWorksheet.timeout = 300000; // 300 seconds in milliseconds

      const result = await generateWorksheet({
        planId: todaysPlan.planId,
        day: todaysPlan.date,
        teacherId: teacherData.id || teacherData.id,
      });

      if (result.data.success) {
        setTodaysPlan((prev) => ({
          ...prev,
          worksheetStatus: "ready",
          worksheetIds: result.data.worksheetIds,
        }));

        // alert("Worksheet generated successfully!");
      }
    } catch (error) {
      console.error("Error generating worksheet:", error);
      alert("Failed to generate worksheet. Please try again.");
    } finally {
      setGeneratingWorksheet(false);
    }
  };

  const handleViewContent = (contentId) => {
    console.log(contentId);
    navigate(`/content/${contentId}`);
  };

  const handleBrowseLibrary = () => {
    navigate("/content-library");
  };

  // Function to open worksheet using MaterialDetailView
  const handleOpenWorksheet = async () => {
    if (!todaysPlan?.worksheetIds?.length) {
      alert("No worksheets available");
      return;
    }

    // Route to the first worksheet ID
    navigate(`/material/${todaysPlan.worksheetIds[0]}`);
  };

  // Dummy download functions for MaterialDetailView
  const handleDownload = async (materialId, grade, content) => {
    try {
      // You can implement actual download logic here
      console.log(`Downloading ${grade} worksheet:`, content);
      alert(`Downloading ${grade} worksheet...`);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download worksheet.");
    }
  };

  const handleDownloadAll = async (material) => {
    try {
      // You can implement download all logic here
      console.log("Downloading all worksheets:", material);
      alert("Downloading all worksheets...");
    } catch (error) {
      console.error("Download all error:", error);
      alert("Failed to download worksheets.");
    }
  };

  // If viewing content, show ContentDetailView
  if (viewingContent && selectedContent) {
    return (
      <ContentDetailView
        content={selectedContent}
        onBack={() => {
          setViewingContent(false);
          setSelectedContent(null);
        }}
      />
    );
  }

  // If viewing worksheet, show MaterialDetailView
  if (viewingWorksheet && selectedWorksheet) {
    return (
      <MaterialDetailView
        material={selectedWorksheet}
        onBack={() => {
          setViewingWorksheet(false);
          setSelectedWorksheet(null);
        }}
        onDownload={handleDownload}
        onDownloadAll={handleDownloadAll}
      />
    );
  }

  if (loading) {
    return (
      <div className="bg-transparent rounded-2xl p-8 text-white">
        <div className="animate-pulse">Loading today's plan...</div>
      </div>
    );
  }

  // Case 1: No weekly plan exists at all
  if (!hasWeeklyPlan) {
    return (
      <div className="bg-transparent rounded-2xl p-8 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-4xl font-bold text-white mb-2">
              Welcome back, {teacherData.displayName}
            </h2>
            <p className="text-indigo-200 text-xl leading-relaxed max-w-3xl">
              Start your AI-powered teaching journey by creating your first
              weekly plan.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 max-w-72">
          <button
            onClick={() => navigate("/weekly-planner")}
            className="flex-1 bg-white text-indigo-600 font-semibold py-4 px-6 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2 text-lg"
          >
            <span>🚀</span>
            Create Your Weekly Plan
          </button>
          {/* <button
            onClick={() => navigate("/content-hub")}
            className="flex-1 bg-indigo-500 hover:bg-indigo-400 font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>📚</span>
            Browse Materials
          </button> */}
        </div>
      </div>
    );
  }

  // Case 2: Weekly plan exists but no plan for today
  if (hasWeeklyPlan && !todaysPlan) {
    return (
      <div className="bg-transparent rounded-2xl p-8 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-4xl font-bold text-white mb-2">
              Welcome back, {teacherData.displayName}
            </h2>
            <p className="text-indigo-200 text-xl leading-relaxed max-w-3xl">
              Your weekly plan is ready, but no activities are scheduled for
              today.
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
          <div className="flex items-center mb-4">
            <span className="text-4xl mr-4">📅</span>
            <div>
              <h3 className="text-xl font-semibold">No Plan for Today</h3>
              <p className="text-indigo-200">
                Your weekly plan is active, but today (
                {new Date().toLocaleDateString()}) is a rest day or weekend.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate("/weekly-planner")}
            className="flex-1 bg-white text-indigo-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>📋</span>
            View Weekly Plan
          </button>
          <button
            onClick={() => navigate("/content-hub")}
            className="flex-1 bg-indigo-500 hover:bg-indigo-400 font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>📚</span>
            Browse Materials
          </button>
        </div>
      </div>
    );
  }

  // Case 3: Today's plan exists - show with content/worksheet generation options
  return (
    <div className="bg-transparent p-3 rounded-2xl text-white">
      <div className="flex justify-between items-start mb-1">
        <div>
          <h2 className="text-4xl font-bold">
            Welcome back, {teacherData.displayName}
          </h2>
        </div>
      </div>

      {/* Today's Plan Details */}
      <div className="bg-white/10 backdrop-blur rounded-xl p-2 mb-1">
        <h3 className="text-2xl font-semibold mb-4 flex items-center">
          <span className="mr-3">📅</span>
          Today's Plan -{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-lg text-yellow-300 mb-2">
              🎯 {todaysPlan.topic}
            </h4>
            <p className="text-indigo-100 mb-3">{todaysPlan.description}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full">
                📚 {todaysPlan.syllabus}
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full">
                ⏱️ {todaysPlan.estimatedDuration}
              </span>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-indigo-200 mb-2">
              Key Activities:
            </h5>
            <ul className="text-sm text-indigo-100 space-y-1">
              {todaysPlan.activities?.slice(0, 3).map((activity, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-2">•</span>
                  {activity}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons for Content/Worksheet Generation */}
      <div className="bg-white/5 backdrop-blur rounded-xl p-2 mb-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          {/* <span className="mr-2">⚡</span> */}
          Teaching Resources
        </h4>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Content Generation */}
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium">📖 Lesson Content</h5>
              {todaysPlan.contentStatus === "ready" && (
                <span className="text-green-400 text-sm">✅ Ready</span>
              )}
            </div>

            {todaysPlan.contentStatus === "ready" ? (
              <div className="text-sm text-indigo-200 mb-3">
                Content available ({todaysPlan.contentIds?.length || 0} items)
              </div>
            ) : (
              <div className="text-sm text-indigo-200 mb-3">
                Generate comprehensive lesson content with explanations,
                examples, and activities.
              </div>
            )}

            <div className="space-y-2">
              {todaysPlan.contentStatus !== "ready" && (
                <button
                  onClick={handleCreateContent}
                  disabled={
                    generatingContent || todaysPlan.contentStatus === "ready"
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  {generatingContent ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                      Generating...
                    </span>
                  ) : todaysPlan.contentStatus === "ready" ? (
                    "Content Generated ✅"
                  ) : (
                    "Generate Content"
                  )}
                </button>
              )}

              {todaysPlan.contentStatus === "ready" && (
                <button
                  onClick={() => handleViewContent(todaysPlan.contentIds[0])}
                  disabled={loadingContent}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  {loadingContent ? "Loading..." : "📖 Open Content"}
                </button>
              )}
            </div>
          </div>

          {/* Worksheet Generation */}
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium">📝 Worksheets</h5>
              {todaysPlan.worksheetStatus === "ready" && (
                <span className="text-green-400 text-sm">✅ Ready</span>
              )}
            </div>

            {todaysPlan.worksheetStatus === "ready" ? (
              <div className="text-sm text-indigo-200 mb-3">
                Worksheets available ({todaysPlan.worksheetIds?.length || 0}{" "}
                items)
              </div>
            ) : (
              <div className="text-sm text-indigo-200 mb-3">
                Create differentiated worksheets for all grade levels in your
                classroom.
              </div>
            )}

            <div className="space-y-2">
              {todaysPlan.worksheetStatus !== "ready" && (
                <button
                  onClick={handleCreateWorksheet}
                  disabled={
                    generatingWorksheet ||
                    todaysPlan.worksheetStatus === "ready"
                  }
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  {generatingWorksheet ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                      Generating...
                    </span>
                  ) : todaysPlan.worksheetStatus === "ready" ? (
                    "Worksheet Generated ✅"
                  ) : (
                    "Generate Worksheet"
                  )}
                </button>
              )}

              {todaysPlan.worksheetStatus === "ready" && (
                <button
                  onClick={handleOpenWorksheet}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  📝 Open Worksheet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate("/weekly-plan-view")}
          className="flex-1 bg-white text-indigo-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>📋</span>
          View Full Weekly Plan
        </button>
        {/* <button
          onClick={() => navigate("/content-hub")}
          className="flex-1 bg-indigo-500 hover:bg-indigo-400 font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>📚</span>
          Browse All Materials
        </button>
        <button
          onClick={() => navigate("/material-generator")}
          className="flex-1 bg-purple-500 hover:bg-purple-400 font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>✨</span>
          Material Generator
        </button> */}
      </div>
    </div>
  );
};
