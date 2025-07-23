// src/components/DifferentiatedMaterialsLibrary.jsx
import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { MaterialDetailView } from "./MaterialDetailView";
import { useNavigate } from "react-router-dom";

const DifferentiatedMaterialsLibrary = () => {
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [filters, setFilters] = useState({
    subject: "",
    grades: [],
    language: "",
  });
  const [teacherData, setTeacherData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedTeacherData = JSON.parse(sessionStorage.getItem("teacherData"));
    setTeacherData(storedTeacherData);
  }, []);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!teacherData?.id) return;

      setIsLoading(true);
      try {
        const getDifferentiatedMaterials = httpsCallable(
          functions,
          "getDifferentiatedMaterials"
        );

        const result = await getDifferentiatedMaterials({
          teacherId: teacherData.id,
          ...filters,
        });

        if (result.data.success) {
          setMaterials(result.data.materials);
        }
      } catch (error) {
        console.error("Error fetching materials:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterials();
  }, [teacherData, filters]);

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleGradeToggle = (grade) => {
    setFilters((prev) => ({
      ...prev,
      grades: prev.grades.includes(grade)
        ? prev.grades.filter((g) => g !== grade)
        : [...prev.grades, grade],
    }));
  };

  const handleSelectMaterial = (material) => {
    navigate(`/material/${material.materialId}`);
  };

  const downloadWorksheet = (materialId, grade, content) => {
    const element = document.createElement("a");
    const worksheetContent = `
GRADE ${grade.replace("grade", "")} WORKSHEET
Generated on: ${new Date().toLocaleDateString()}
Material ID: ${materialId}

==========================================

${content.content || "No content available"}

${
  content.objectives?.length
    ? `
LEARNING OBJECTIVES:
${content.objectives.map((obj, idx) => `${idx + 1}. ${obj}`).join("\n")}
`
    : ""
}

${
  content.activities?.length
    ? `
ACTIVITIES:
${content.activities
  .map((activity, idx) => `${idx + 1}. ${activity}`)
  .join("\n")}
`
    : ""
}

${
  content.vocabulary?.length
    ? `
KEY VOCABULARY:
${content.vocabulary.map((word, idx) => `${idx + 1}. ${word}`).join("\n")}
`
    : ""
}

${
  content.assessmentQuestions?.length
    ? `
ASSESSMENT QUESTIONS:
${content.assessmentQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n")}
`
    : ""
}
        `;

    const file = new Blob([worksheetContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Grade_${grade.replace(
      "grade",
      ""
    )}_Worksheet_${materialId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadAllGrades = (material) => {
    Object.entries(material.versions || {}).forEach(([grade, content]) => {
      setTimeout(() => {
        downloadWorksheet(material.materialId, grade, content);
      }, 500 * Object.keys(material.versions).indexOf(grade));
    });
  };

  // if (selectedMaterial) {
  //   return (
  //     <MaterialDetailView
  //       material={selectedMaterial}
  //       onBack={() => setSelectedMaterial(null)}
  //       onDownload={downloadWorksheet}
  //       onDownloadAll={downloadAllGrades}
  //     />
  //   );
  // }

  return (
    <div className="space-y-8">
      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          {/* <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">🔍</span>
          </div> */}
          Filters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Subject
            </label>
            <select
              value={filters.subject}
              onChange={(e) => handleFilterChange("subject", e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-medium text-slate-700 transition-all duration-300"
            >
              <option value="">All Subjects</option>
              <option value="science">Science</option>
              <option value="mathematics">Mathematics</option>
              <option value="language">Language</option>
              <option value="social_studies">Social Studies</option>
              <option value="computer_science">Computer Science</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Language
            </label>
            <select
              value={filters.language}
              onChange={(e) => handleFilterChange("language", e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-medium text-slate-700 transition-all duration-300"
            >
              <option value="">All Languages</option>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="kannada">Kannada</option>
              <option value="marathi">Marathi</option>
              <option value="tamil">Tamil</option>
              <option value="telugu">Telugu</option>
              <option value="bengali">Bengali</option>
              <option value="gujarati">Gujarati</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Grades
            </label>
            <div className="flex flex-wrap gap-2">
              {["1", "2", "3", "4", "5"].map((grade) => (
                <button
                  key={grade}
                  onClick={() => handleGradeToggle(grade)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 ${
                    filters.grades.includes(grade)
                      ? "bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-lg"
                      : "bg-white/80 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Materials Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="relative">
            <div className="animate-pulse w-16 h-16 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl text-white">📚</span>
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            <MaterialCard
              key={material.materialId}
              material={material}
              onClick={() => handleSelectMaterial(material)}
              onDownload={downloadWorksheet}
              onDownloadAll={downloadAllGrades}
            />
          ))}
        </div>
      )}

      {materials.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-4xl text-white">📚</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">
            No differentiated materials found.
          </h3>
          <p className="leading-relaxed text-slate-600 max-w-md mx-auto">
            Start creating some worksheets to see them here!
          </p>
        </div>
      )}
    </div>
  );
};

// Material Card Component with Clean Design
const MaterialCard = ({ material, onClick, onDownload, onDownloadAll }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const gradeCount = Object.keys(material.versions || {}).length;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-gray-200 transition-all duration-500 hover:-translate-y-1">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-2">
            {/* <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-sm">📚</span>
                        </div> */}
            <h3 className="text-lg font-semibold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors duration-300">
              {material.analysis?.subject || "General"} -{" "}
              {material.analysis?.topic || "Worksheet"}
            </h3>
          </div>

          {/* Subject and Language Tags */}
          <div className="flex items-center gap-2 mb-3">
            {/* <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
              {gradeCount} grade{gradeCount !== 1 ? "s" : ""}
            </span> */}
            <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium border border-gray-100">
              {material.language || "English"}
            </span>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-col gap-1">
          {material.hasImage && (
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              📷
            </span>
          )}
          {material.hasContext && (
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
              📝
            </span>
          )}
        </div>
      </div>

      {/* Grades Section */}
      {Object.keys(material.versions || {}).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.keys(material.versions || {})
            .slice(0, 4)
            .map((grade) => (
              <span
                key={grade}
                className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium"
              >
                {grade}
              </span>
            ))}
          {Object.keys(material.versions || {}).length > 4 && (
            <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-500 rounded-md text-xs font-medium">
              +{Object.keys(material.versions || {}).length - 4}
            </span>
          )}
        </div>
      )}

      {/* Meta Information */}
      <div className="text-xs text-gray-500 mb-6 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 text-gray-400">📍</span>
          <span>{material.location || "Not specified"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 text-gray-400">📅</span>
          <span>
            {new Date(material.createdAt || Date.now()).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 text-gray-400">🎯</span>
          <span>Difficulty: Grade {material.analysis?.difficulty || "2"}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all duration-200"
        >
          {isExpanded ? "Less" : "Preview"}
        </button>
        <button
          onClick={onClick}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          View Details
        </button>
      </div>

      {/* Download All Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDownloadAll(material);
        }}
        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Download All Grades
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-4 animate-in slide-in-from-top duration-300">
          {/* Analysis Section */}
          <div className="bg-gradient-to-r from-indigo-50/50 to-emerald-50/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 text-xs">📊</span>
              </div>
              <h4 className="font-semibold text-gray-900 text-sm">Analysis</h4>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-medium">Subject:</span>{" "}
                {material.analysis?.subject || "General"}
              </p>
              <p>
                <span className="font-medium">Topic:</span>{" "}
                {material.analysis?.topic || "Not specified"}
              </p>
              <p>
                <span className="font-medium">Key Terms:</span>{" "}
                {material.analysis?.keyTerms?.join(", ") || "None"}
              </p>
            </div>
          </div>

          {/* Common Objectives */}
          {material.commonObjectives?.length > 0 && (
            <div className="bg-emerald-50/70 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 text-xs">🎯</span>
                </div>
                <h4 className="font-semibold text-gray-900 text-sm">
                  Common Objectives
                </h4>
              </div>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                {material.commonObjectives.slice(0, 2).map((objective, idx) => (
                  <li key={idx}>{objective}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DifferentiatedMaterialsLibrary;
