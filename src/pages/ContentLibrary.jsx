import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

const ContentLibrary = () => {
  const [content, setContent] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    subject: "",
    grades: [],
    language: "",
  });
  const [teacherData, setTeacherData] = useState(null);

  useEffect(() => {
    const storedTeacherData = JSON.parse(sessionStorage.getItem("teacherData"));
    setTeacherData(storedTeacherData);
    searchContent();
  }, []);

  const searchContent = async () => {
    setIsLoading(true);
    try {
      const searchContentLibrary = httpsCallable(
        functions,
        "searchContentLibrary"
      );
      const result = await searchContentLibrary({
        teacherId: teacherData?.teacherId,
        ...filters,
      });

      if (result.data.success) {
        setContent(result.data.data);
      }
    } catch (error) {
      console.error("Error searching content:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    if (teacherData) {
      searchContent();
    }
  }, [filters]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          📚 Content Library
        </h1>
        <p className="text-gray-600 mb-6">
          Browse and reuse previously generated content
        </p>

        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-700 mb-3">Filters</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                value={filters.subject}
                onChange={(e) => handleFilterChange("subject", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                <option value="science">Science</option>
                <option value="mathematics">Mathematics</option>
                <option value="language">Language</option>
                <option value="social_studies">Social Studies</option>
                <option value="general">General</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={filters.language}
                onChange={(e) => handleFilterChange("language", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grades
              </label>
              <div className="flex flex-wrap gap-2">
                {["1", "2", "3", "4", "5"].map((grade) => (
                  <button
                    key={grade}
                    onClick={() => handleGradeToggle(grade)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filters.grades.includes(grade)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.map((item, index) => (
              <ContentCard key={index} item={item} />
            ))}
          </div>
        )}

        {content.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No content found matching your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ContentCard = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-800 truncate">
            {item.content.story?.substring(0, 50) + "..."}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {item.subject} • {item.language}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              item.reliabilityScore > 0.8
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {Math.round(item.reliabilityScore * 100)}%
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {item.grades.map((grade) => (
          <span
            key={grade}
            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
          >
            Grade {grade}
          </span>
        ))}
      </div>

      <div className="text-sm text-gray-600 mb-3">
        <p>📍 {item.location}</p>
        <p>📅 {new Date(item.createdAt).toLocaleDateString()}</p>
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-blue-500 hover:text-blue-600 text-sm font-medium"
      >
        {isExpanded ? "Show Less" : "View Details"}
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Story</h4>
              <p className="text-sm text-gray-600">{item.content.story}</p>
            </div>

            {item.content.culturalContext && (
              <div>
                <h4 className="font-medium text-gray-700 mb-1">
                  Cultural Context
                </h4>
                <p className="text-sm text-gray-600">
                  {item.content.culturalContext.localReferences?.join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentLibrary;
