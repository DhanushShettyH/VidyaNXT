import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import ContentDetailView from "./ContentDetailView";

const ContentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      if (!id) {
        setError("No content ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const getContentById = httpsCallable(functions, "getContentById");
        const result = await getContentById({ contentId: id });

        if (result.data.success) {
          setContent(result.data.data);
        } else {
          setError("Failed to fetch content");
        }
      } catch (err) {
        console.error("Error fetching content:", err);
        setError(err.message || "Failed to fetch content");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  const handleBack = () => {
    navigate("/content-library"); // Adjust this path to your library route
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading content...</p>
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
            Content Not Found
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

  if (!content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">No content available</p>
        </div>
      </div>
    );
  }

  return <ContentDetailView content={content} onBack={handleBack} />;
};

export default ContentDetailPage;
