// Material Detail View Component

import Header from "./Header";

export const MaterialDetailView = ({
  material,
  onBack,
  onDownload,
  onDownloadAll,
}) => {
  return (
    <>
      <Header Heading={"AI Material"} />

      <div className="space-y-6 mx-6 lg:mx-8 pt-3">
        {/* Header */}
        {/* <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-indigo-600 hover:text-indigo-800 font-semibold transition-colors duration-200"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Materials
          </button>
          <button
            onClick={() => onDownloadAll(material)}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 flex items-center gap-2 shadow-lg"
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
            Download All Worksheets
          </button>
        </div> */}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-lg">
          {/* Title Section */}
          <div className="border-b border-gray-200 pb-6 mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              📚 {material.analysis?.subject || "General"} -{" "}
              {material.analysis?.topic || "Worksheet"}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4">📍</span>
                {material.location}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4">🗣️</span>
                {material.language}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4">📅</span>
                {new Date(material.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4">🎯</span>
                Grade {material.analysis?.difficulty} Level
              </span>
            </div>
          </div>

          {/* Analysis Section */}
          {material.analysis && (
            <div className="mb-8 border borger-gray-600 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Content Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <p>
                    <span className="font-semibold text-slate-900">
                      Subject:
                    </span>{" "}
                    <span className="text-slate-700">
                      {material.analysis.subject}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Topic:</span>{" "}
                    <span className="text-slate-700">
                      {material.analysis.topic}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Language:
                    </span>{" "}
                    <span className="text-slate-700">
                      {material.analysis.language}
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    <span className="font-semibold text-slate-900">
                      Difficulty:
                    </span>{" "}
                    <span className="text-slate-700">
                      Grade {material.analysis.difficulty}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Key Terms:
                    </span>{" "}
                    <span className="text-slate-700">
                      {material.analysis.keyTerms?.join(", ") || "None"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Common Objectives */}
          {material.commonObjectives?.length > 0 && (
            <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-emerald-800 mb-4">
                Common Learning Objectives
              </h3>
              <ul className="list-disc list-inside text-sm leading-relaxed text-slate-700 space-y-2">
                {material.commonObjectives.map((objective, idx) => (
                  <li key={idx}>{objective}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Grade-wise Materials */}
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-slate-900">
              Grade-wise Worksheets
            </h3>
            {Object.entries(material.versions || {}).map(([grade, content]) => (
              <div
                key={grade}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
              >
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-bold text-indigo-600">
                    {grade.charAt(0).toUpperCase() + grade.slice(1)} Worksheet
                  </h4>
                  <button
                    onClick={() =>
                      onDownload(material.materialId, grade, content)
                    }
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-2 shadow-lg"
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
                    Download
                  </button>
                </div>

                <div className="space-y-6">
                  {content.content && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3">
                        Content:
                      </h5>
                      <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {content.content}
                      </div>
                    </div>
                  )}

                  {content.objectives?.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3">
                        Learning Objectives:
                      </h5>
                      <ul className="list-disc list-inside text-slate-700 space-y-1 leading-relaxed">
                        {content.objectives.map((objective, idx) => (
                          <li key={idx}>{objective}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {content.activities?.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3">
                        Activities:
                      </h5>
                      <ul className="list-disc list-inside text-slate-700 space-y-1 leading-relaxed">
                        {content.activities.map((activity, idx) => (
                          <li key={idx}>{activity}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {content.vocabulary?.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3">
                        Key Vocabulary:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {content.vocabulary.map((word, idx) => (
                          <span
                            key={idx}
                            className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {content.assessmentQuestions?.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3">
                        Assessment Questions:
                      </h5>
                      <ol className="list-decimal list-inside text-slate-700 space-y-1 leading-relaxed">
                        {content.assessmentQuestions.map((question, idx) => (
                          <li key={idx}>{question}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
