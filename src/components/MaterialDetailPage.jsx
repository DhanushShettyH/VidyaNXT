import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { MaterialDetailView } from "../components/MaterialDetailView";

const MaterialDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      if (!id) {
        setError("No material ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const getMaterialById = httpsCallable(functions, "getMaterialById");
        const result = await getMaterialById({ materialId: id });

        if (result.data.success) {
          setMaterial(result.data.data);
        } else {
          setError("Failed to fetch material");
        }
      } catch (err) {
        console.error("Error fetching material:", err);
        setError(err.message || "Failed to fetch material");
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();
  }, [id]);

  const handleBack = () => {
    navigate("/content-library");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading material...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Material Not Found
          </h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">No material available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 pb-6 lg:pb-10">
      <div className="max-w-7xl mx-auto ">
        <MaterialDetailView
          material={material}
          onBack={handleBack}
          onDownload={downloadWorksheet}
          onDownloadAll={downloadAllGrades}
        />
      </div>
    </div>
  );
};

export default MaterialDetailPage;
