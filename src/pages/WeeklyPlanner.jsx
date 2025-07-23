// src/pages/WeeklyPlanner.jsx

import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import Header from "../components/Header";

const WeeklyPlanner = () => {
  const [formData, setFormData] = useState({
    weekStart: "",
    grades: [],
    syllabus: "",
    mustCoverTopics: [""],
    language: "english",
  });

  const [currentPlan, setCurrentPlan] = useState(null);
  const [existingPlans, setExistingPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingContent, setGeneratingContent] = useState({});

  // Auto-select grades from teacherData on component mount
  useEffect(() => {
    const teacherData = JSON.parse(sessionStorage.getItem("teacherData"));
    if (teacherData && teacherData.grades) {
      setFormData((prev) => ({
        ...prev,
        grades: Array.isArray(teacherData.grades)
          ? teacherData.grades
          : [teacherData.grades],
      }));
    }
  }, []);

  // Form submission - creates plan structure only
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const teacherData = JSON.parse(sessionStorage.getItem("teacherData"));
      const createWeeklyPlan = httpsCallable(
        functions,
        "createWeeklyLessonPlan"
      );

      const result = await createWeeklyPlan({
        teacherId: teacherData.id,
        weekStart: formData.weekStart,
        grades: formData.grades,
        syllabus: formData.syllabus,
        mustCoverTopics: formData.mustCoverTopics.filter((topic) =>
          topic.trim()
        ),
        language: formData.language,
      });

      if (result.data.success) {
        setCurrentPlan(result.data.data);
        if (result.data.isExisting) {
          alert("Using existing plan for similar syllabus");
        }
      }
    } catch (error) {
      console.error("Error creating plan:", error);
      alert("Failed to create lesson plan");
    } finally {
      setLoading(false);
    }
  };

  // Generate content for specific day
  const handleGenerateContent = async (day) => {
    if (!currentPlan) return;

    setGeneratingContent((prev) => ({ ...prev, [`${day}-content`]: true }));

    try {
      const generateContent = httpsCallable(functions, "generateDayContent");
      const result = await generateContent({
        planId: currentPlan.planId,
        day: day,
        teacherId: currentPlan.teacherId,
      });

      if (result.data.success) {
        // Update local state
        setCurrentPlan((prev) => ({
          ...prev,
          dailyPlans: {
            ...prev.dailyPlans,
            [day]: {
              ...prev.dailyPlans[day],
              contentIds: result.data.contentIds,
              contentStatus: "ready",
            },
          },
        }));

        alert("Content generated successfully!");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      alert("Failed to generate content");
    } finally {
      setGeneratingContent((prev) => ({ ...prev, [`${day}-content`]: false }));
    }
  };

  // Generate worksheet for specific day
  const handleGenerateWorksheet = async (day) => {
    if (!currentPlan) return;

    setGeneratingContent((prev) => ({ ...prev, [`${day}-worksheet`]: true }));

    try {
      const generateWorksheet = httpsCallable(
        functions,
        "generateDayWorksheet"
      );
      const result = await generateWorksheet({
        planId: currentPlan.planId,
        day: day,
        teacherId: currentPlan.teacherId,
      });

      if (result.data.success) {
        setCurrentPlan((prev) => ({
          ...prev,
          dailyPlans: {
            ...prev.dailyPlans,
            [day]: {
              ...prev.dailyPlans[day],
              worksheetIds: result.data.worksheetIds,
              worksheetStatus: "ready",
            },
          },
        }));

        alert("Worksheet generated successfully!");
      }
    } catch (error) {
      console.error("Error generating worksheet:", error);
      alert("Failed to generate worksheet");
    } finally {
      setGeneratingContent((prev) => ({
        ...prev,
        [`${day}-worksheet`]: false,
      }));
    }
  };

  return (
    <>
      <Header Heading={"Week Planner"} />

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 py-12 px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Form for creating new plan */}
          {!currentPlan && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-lg">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-800 via-indigo-700 to-emerald-700 bg-clip-text text-transparent">
                  Create Weekly Lesson Plan
                </h2>
                <p className="text-slate-600 mt-2">
                  Plan your week of teaching
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Week Start Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Week Starting Date
                  </label>
                  <input
                    type="date"
                    value={formData.weekStart}
                    onChange={(e) =>
                      setFormData({ ...formData, weekStart: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900"
                    required
                  />
                </div>

                {/* Grades Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Student Grades
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {["1", "2", "3", "4", "5"].map((grade) => (
                      <label
                        key={grade}
                        className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 ${
                          formData.grades.includes(grade)
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shadow-lg"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.grades.includes(grade)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                grades: [...formData.grades, grade],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                grades: formData.grades.filter(
                                  (g) => g !== grade
                                ),
                              });
                            }
                          }}
                          className="sr-only"
                        />
                        Grade {grade}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Syllabus Topic */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Main Syllabus Topic
                  </label>
                  <input
                    type="text"
                    value={formData.syllabus}
                    onChange={(e) =>
                      setFormData({ ...formData, syllabus: e.target.value })
                    }
                    placeholder="e.g., Periodic Table, Water Cycle, Indian History"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500"
                    required
                  />
                </div>

                {/* Must Cover Topics */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Must Cover Topics
                  </label>
                  <div className="space-y-3">
                    {formData.mustCoverTopics.map((topic, index) => (
                      <div key={index} className="flex gap-3">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => {
                            const newTopics = [...formData.mustCoverTopics];
                            newTopics[index] = e.target.value;
                            setFormData({
                              ...formData,
                              mustCoverTopics: newTopics,
                            });
                          }}
                          placeholder="e.g., History of periodic table"
                          className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500"
                        />
                        {formData.mustCoverTopics.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newTopics = formData.mustCoverTopics.filter(
                                (_, i) => i !== index
                              );
                              setFormData({
                                ...formData,
                                mustCoverTopics: newTopics,
                              });
                            }}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-300 font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          mustCoverTopics: [...formData.mustCoverTopics, ""],
                        })
                      }
                      className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-300"
                    >
                      + Add Topic
                    </button>
                  </div>
                </div>

                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Teaching Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900"
                  >
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="kannada">Kannada</option>
                    <option value="marathi">Marathi</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? "Creating Plan..." : "Create Weekly Plan"}
                </button>
              </form>
            </div>
          )}

          {/* Display Generated Plan */}
          {currentPlan && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  📅 Week of{" "}
                  {new Date(currentPlan.weekStart).toLocaleDateString()}
                </h2>
                <button
                  onClick={() => setCurrentPlan(null)}
                  className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-300"
                >
                  Create New Plan
                </button>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-lg mb-2 text-slate-900">
                  📚 {currentPlan.syllabus}
                </h3>
                <p className="text-slate-600 text-sm mb-1">
                  Grades: {currentPlan.grades.join(", ")}
                </p>
                <p className="text-slate-600 text-sm">
                  Estimated: {currentPlan.totalEstimatedHours} hours
                </p>
              </div>

              {/* Daily Plans */}
              <div className="space-y-4">
                {Object.entries(currentPlan.dailyPlans).map(
                  ([day, dayPlan]) => (
                    <DayPlanCard
                      key={day}
                      day={day}
                      dayPlan={dayPlan}
                      onGenerateContent={() => handleGenerateContent(day)}
                      onGenerateWorksheet={() => handleGenerateWorksheet(day)}
                      isGeneratingContent={generatingContent[`${day}-content`]}
                      isGeneratingWorksheet={
                        generatingContent[`${day}-worksheet`]
                      }
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Day Plan Card Component
const DayPlanCard = ({
  day,
  dayPlan,
  onGenerateContent,
  onGenerateWorksheet,
  isGeneratingContent,
  isGeneratingWorksheet,
}) => {
  const dayName = new Date(day).toLocaleDateString("en-US", {
    weekday: "long",
  });

  return (
    <div className="border border-slate-200 rounded-xl p-6 bg-white/50 backdrop-blur-sm">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-slate-900 mb-2">
          {dayName} - {dayPlan.topic}
        </h4>
        <p className="text-slate-600 text-sm mb-3">{dayPlan.description}</p>
        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-lg inline-block">
          Duration: {dayPlan.estimatedDuration}
        </div>
      </div>

      {/* Key Points */}
      {dayPlan.keyPoints && dayPlan.keyPoints.length > 0 && (
        <div className="mb-4">
          <h5 className="font-medium text-slate-800 mb-2 text-sm">
            Key Points:
          </h5>
          <div className="bg-slate-50 rounded-lg p-3">
            {dayPlan.keyPoints.map((point, idx) => (
              <div key={idx} className="flex items-start mb-1 last:mb-0">
                <span className="text-slate-400 mr-2 text-xs">•</span>
                <span className="text-slate-600 text-sm">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      {dayPlan.activities && dayPlan.activities.length > 0 && (
        <div className="mb-4">
          <h5 className="font-medium text-slate-800 mb-2 text-sm">
            Activities:
          </h5>
          <div className="bg-slate-50 rounded-lg p-3">
            {dayPlan.activities.map((activity, idx) => (
              <div key={idx} className="flex items-start mb-1 last:mb-0">
                <span className="text-slate-400 mr-2 text-xs">•</span>
                <span className="text-slate-600 text-sm">{activity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        {/* Content Generation */}
        <div className="flex-1">
          {dayPlan.contentStatus === "ready" ? (
            <div className="flex items-center justify-center text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl text-sm font-medium">
              <span className="mr-1">✅</span>
              Content Ready ({dayPlan.contentIds.length})
            </div>
          ) : (
            <button
              onClick={onGenerateContent}
              disabled={
                isGeneratingContent || dayPlan.contentStatus === "generating"
              }
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-xl text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingContent || dayPlan.contentStatus === "generating"
                ? "Generating..."
                : "Generate Content"}
            </button>
          )}
        </div>

        {/* Worksheet Generation */}
        <div className="flex-1">
          {dayPlan.worksheetStatus === "ready" ? (
            <div className="flex items-center justify-center text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl text-sm font-medium">
              <span className="mr-1">✅</span>
              Worksheet Ready ({dayPlan.worksheetIds.length})
            </div>
          ) : (
            <button
              onClick={onGenerateWorksheet}
              disabled={
                isGeneratingWorksheet ||
                dayPlan.worksheetStatus === "generating"
              }
              className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 px-3 rounded-xl text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingWorksheet || dayPlan.worksheetStatus === "generating"
                ? "Generating..."
                : "Generate Worksheet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlanner;
