import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import Header from "./Header";

const ContentDetailView = ({ content, onBack }) => {
  const [activeTab, setActiveTab] = useState("story");

  return (
    <>
      {/* Header Section */}
      <Header Heading={"AI Content"} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 py-6 lg:py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-8">
          {/* Title Section */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                {content.content?.story?.substring(0, 100) + "..." ||
                  "Content Details"}
              </h1>

              <div className="flex flex-wrap gap-3 mb-4">
                <span className="px-4 py-2 bg-white rounded-xl border border-gray-200 text-slate-700 text-sm font-medium shadow-sm">
                  {content.subject || "General"}
                </span>
                <span className="px-4 py-2 bg-white rounded-xl border border-gray-200 text-slate-700 text-sm font-medium shadow-sm">
                  {content.language || "English"}
                </span>
                <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-gray-600 text-sm font-medium shadow-sm">
                  <span>📍</span>
                  {content.location || "Not specified"}
                </span>
              </div>

              {/* Grades */}
              <div className="flex flex-wrap gap-2">
                {(content.grades || []).map((grade) => (
                  <span
                    key={grade}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold"
                  >
                    Grade {grade}
                  </span>
                ))}
              </div>
            </div>

            {/* Reliability Score */}
            <div className="flex-shrink-0">
              <div
                className={`px-6 py-3 rounded-xl text-sm font-semibold shadow-sm ${
                  (content.reliabilityScore || 0) > 0.8
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                }`}
              >
                {Math.round((content.reliabilityScore || 0) * 100)}% Reliable
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-2xl max-w-2xl">
            {[
              { id: "story", label: "Story", icon: "📚" },
              { id: "grades", label: "Grades", icon: "📊" },
              { id: "visual", label: "Visual", icon: "🎨" },
              { id: "tips", label: "Tips", icon: "💡" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                } flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === "story" && (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">
                    Main Story
                  </h3>
                  <div className="prose max-w-none">
                    <p className="text-slate-700 leading-relaxed text-base whitespace-pre-wrap">
                      {content.content?.story || "No story content available"}
                    </p>
                  </div>
                </div>

                {content.content?.culturalContext?.localReferences?.length >
                  0 && (
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
                    <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">🌍</span>
                      Cultural Context
                    </h4>
                    <p className="text-emerald-800 leading-relaxed">
                      <strong>Local References:</strong>{" "}
                      {content.content.culturalContext.localReferences.join(
                        ", "
                      )}
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "grades" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900">
                  Grade-Specific Versions
                </h3>

                {content.content?.gradeVersions &&
                Object.keys(content.content.gradeVersions).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(content.content.gradeVersions).map(
                      ([grade, version]) => (
                        <div
                          key={grade}
                          className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
                        >
                          <h4 className="text-lg font-bold text-purple-600 mb-4 capitalize">
                            {grade.replace("grade", "Grade ")}
                          </h4>

                          <div className="bg-gray-50 rounded-xl p-6 mb-6">
                            <p className="text-slate-700 leading-relaxed">
                              {version.content}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {version.objectives && (
                              <div>
                                <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                  <span>🎯</span>
                                  Learning Objectives
                                </h5>
                                <ul className="space-y-2">
                                  {version.objectives.map((obj, index) => (
                                    <li
                                      key={index}
                                      className="flex items-start gap-2"
                                    >
                                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></span>
                                      <span className="text-sm text-slate-600 leading-relaxed">
                                        {obj}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {version.vocabulary && (
                              <div>
                                <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                  <span>📝</span>
                                  Key Vocabulary
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                  {version.vocabulary.map((word, index) => (
                                    <span
                                      key={index}
                                      className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium"
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
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-slate-500">
                      No grade-specific versions available
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "visual" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900">
                  Visual Aids
                </h3>

                {content.content?.visualAids?.aids?.length > 0 ? (
                  <div className="space-y-6">
                    {content.content.visualAids.aids?.map((aid, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
                      >
                        <h4 className="text-lg font-bold text-slate-900 mb-4">
                          {aid.title || `Visual Aid ${index + 1}`}
                        </h4>

                        {aid.description && (
                          <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <p className="text-slate-600 leading-relaxed">
                              {aid.description}
                            </p>
                          </div>
                        )}

                        {aid.imageUrl && (
                          <div className="mb-6">
                            <img
                              src={aid.imageUrl}
                              alt={aid.title}
                              className="w-full h-auto max-h-64 object-contain border border-gray-200 rounded-xl"
                            />
                          </div>
                        )}

                        {aid.svgCode && (
                          <div className="mb-6 border border-gray-200 rounded-xl p-4 bg-gray-50 overflow-x-auto">
                            <div
                              dangerouslySetInnerHTML={{ __html: aid.svgCode }}
                            />
                          </div>
                        )}

                        {aid.teachingPoints?.length > 0 && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                            <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                              <span>💡</span>
                              Teaching Points
                            </h5>
                            <ul className="space-y-2">
                              {aid.teachingPoints.map((point, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                                  <span className="text-sm text-slate-600 leading-relaxed">
                                    {point}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎨</div>
                    <p className="text-slate-500">No visual aids available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "tips" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900">
                  Teaching Tips
                </h3>

                {content.content?.teachingTips?.length > 0 ? (
                  <div className="space-y-4">
                    {content.content.teachingTips.map((tip, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-lg">💡</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed flex-1">
                            {tip}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💡</div>
                    <p className="text-slate-500">No teaching tips available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ContentDetailView;
