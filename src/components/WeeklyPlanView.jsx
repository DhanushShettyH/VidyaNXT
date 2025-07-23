import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

const WeeklyPlanView = ({ teacherData }) => {
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWeeklyPlan();
  }, [teacherData]);

  const fetchWeeklyPlan = async () => {
    try {
      setLoading(true);
      const getWeeklyPlan = httpsCallable(functions, "getWeeklyPlan");
      const result = await getWeeklyPlan({
        teacherId: teacherData.id || teacherData.uid,
      });

      if (result.data.success) {
        setWeeklyPlan(result.data.plan);
      } else {
        setError("No weekly plan found");
      }
    } catch (err) {
      console.error("Error fetching weekly plan:", err);
      setError("Failed to load weekly plan");
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = (contentId) => {
    navigate(`/content/${contentId}`);
  };

  const handleViewWorksheet = (worksheetId) => {
    navigate(`/material/${worksheetId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ready":
        return "bg-green-100 text-green-800";
      case "generating":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-600";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading weekly plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            No Weekly Plan Found
          </h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/weekly-planner")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200"
          >
            Create Weekly Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header Heading={"Weekly Lesson Plan"} />

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 py-6 lg:py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}

          {/* Plan Overview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  📚 Subject
                </h3>
                <div className="flex justify-between">
                  <p className="text-slate-600">{weeklyPlan.syllabus}</p>
                  <div className="flex items-center justify-between ">
                    <p className="text-slate-600">
                      {new Date(weeklyPlan.weekStart).toLocaleDateString()} -{" "}
                      {new Date(weeklyPlan.weekEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">🎯 Grades</h3>
                <div className="flex flex-wrap gap-1">
                  {weeklyPlan.grades.map((grade) => (
                    <span
                      key={grade}
                      className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm"
                    >
                      Grade {grade}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  🗣️ Language
                </h3>
                <p className="text-slate-600">{weeklyPlan.language}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  ⏱️ Total Hours
                </h3>
                <p className="text-slate-600">
                  {weeklyPlan.totalEstimatedHours} hours
                </p>
              </div>
            </div>

            {weeklyPlan.weeklyObjective && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="font-semibold text-slate-900 mb-2">
                  🎯 Weekly Objective
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {weeklyPlan.weeklyObjective}
                </p>
              </div>
            )}
          </div>

          {/* Daily Plans */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Daily Breakdown
            </h2>

            <div className="grid gap-6">
              {Object.entries(weeklyPlan.dailyPlans).map(([date, dayPlan]) => (
                <DayPlanCard
                  key={date}
                  date={date}
                  dayPlan={dayPlan}
                  onViewContent={handleViewContent}
                  onViewWorksheet={handleViewWorksheet}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Day Plan Card Component
const DayPlanCard = ({
  date,
  dayPlan,
  onViewContent,
  onViewWorksheet,
  getStatusColor,
}) => {
  const dayName = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Day Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {formattedDate.split(" ")[1]}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{dayName}</h3>
              <p className="text-slate-600">{formattedDate}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                📖 {dayPlan.topic}
              </h4>
              <p className="text-slate-600 leading-relaxed">
                {dayPlan.description}
              </p>
            </div>

            {dayPlan.keyPoints && dayPlan.keyPoints.length > 0 && (
              <div>
                <h5 className="font-medium text-slate-900 mb-2">Key Points:</h5>
                <ul className="text-sm text-slate-600 space-y-1">
                  {dayPlan.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2 text-indigo-600">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dayPlan.activities && dayPlan.activities.length > 0 && (
              <div>
                <h5 className="font-medium text-slate-900 mb-2">Activities:</h5>
                <ul className="text-sm text-slate-600 space-y-1">
                  {dayPlan.activities.slice(0, 3).map((activity, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2 text-emerald-600">•</span>
                      {activity}
                    </li>
                  ))}
                  {dayPlan.activities.length > 3 && (
                    <li className="text-slate-500 text-xs">
                      +{dayPlan.activities.length - 3} more activities
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <span>⏱️</span>
                {dayPlan.estimatedDuration}
              </span>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="lg:w-80 space-y-4">
          {/* Content Status */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-slate-900">📖 Lesson Content</h5>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  dayPlan.contentStatus
                )}`}
              >
                {dayPlan.contentStatus}
              </span>
            </div>

            {dayPlan.contentStatus === "ready" &&
            dayPlan.contentIds?.length > 0 ? (
              <button
                onClick={() => onViewContent(dayPlan.contentIds[0])}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
              >
                View Content
              </button>
            ) : (
              <p className="text-sm text-slate-500">
                {dayPlan.contentStatus === "generating"
                  ? "Content is being generated..."
                  : "Content not generated yet"}
              </p>
            )}
          </div>

          {/* Worksheet Status */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-slate-900">📝 Worksheets</h5>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  dayPlan.worksheetStatus
                )}`}
              >
                {dayPlan.worksheetStatus}
              </span>
            </div>

            {dayPlan.worksheetStatus === "ready" &&
            dayPlan.worksheetIds?.length > 0 ? (
              <button
                onClick={() => onViewWorksheet(dayPlan.worksheetIds[0])}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm font-medium"
              >
                View Worksheet
              </button>
            ) : (
              <p className="text-sm text-slate-500">
                {dayPlan.worksheetStatus === "generating"
                  ? "Worksheet is being generated..."
                  : "Worksheet not generated yet"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlanView;
