import React, { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Send, X, Heart } from "lucide-react";

const FeedbackModal = ({ teacherId, teacherData, onClose }) => {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const functions = getFunctions();
  const submitFeedback = httpsCallable(functions, "submitWeeklyFeedback");

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await submitFeedback({
        teacherId,
        feedback: feedback.trim(),
        isWeekend: true,
      });

      if (result.data.success) {
        setFeedback("");
        onClose();
        showSuccessNotification();
      }
    } catch (error) {
      console.error("Feedback submission error:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSuccessNotification = () => {
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-500";
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        Thank you for sharing! 🙏
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const handleModalClick = (e) => {
    // Prevent closing when clicking inside the modal content
    e.stopPropagation();
  };

  return (
    <div
      className="bg-white rounded-3xl max-w-lg w-full shadow-2xl transform transition-all duration-300 scale-100 mx-4"
      onClick={handleModalClick}
    >
      {/* Modal Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Heart size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Share with Community</h3>
              <p className="text-blue-100 text-sm">Your voice matters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white hover:bg-opacity-20 rounded-full"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Modal Body */}
      <div className="p-6">
        <div className="mb-4">
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            Share your classroom experiences, teaching moments, challenges
            you've overcome, or insights you've gained this week. Your story can
            inspire and help other teachers! 🌟
          </p>
        </div>

        <div className="space-y-4">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What would you like to share with fellow teachers?

Some ideas to get you started:
• A teaching moment that made you proud
• A challenge you faced and how you handled it
• Something new you tried in your classroom
• A student achievement that made your day
• Any insights or tips you'd like to share..."
            className="w-full h-40 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-relaxed"
            maxLength={800}
            autoFocus
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {feedback.length}/800 characters
              </span>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <span className="text-xs text-green-600 font-medium">
                Anonymous sharing
              </span>
            </div>

            <div className="flex gap-3">
              {/* <button
                onClick={onClose}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button> */}
              <button
                onClick={handleSubmitFeedback}
                disabled={!feedback.trim() || isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sharing...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Share with Community
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
