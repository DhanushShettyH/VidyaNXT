import React, { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";

const FeedbackSystem = ({ onOpenFeedbackModal, teacherId, teacherData }) => {
  const [showWeekendPrompt, setShowWeekendPrompt] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState(0.75);

  // Check if it's weekend and show prompt
  useEffect(() => {
    checkWeekendPrompt();
  }, []);

  const checkWeekendPrompt = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if user has already been prompted this week
    const lastPromptWeek = sessionStorage.getItem("lastFeedbackPromptWeek");
    const currentWeek = getWeekStart(today);

    if (isWeekend && lastPromptWeek !== currentWeek) {
      setShowWeekendPrompt(true);
    }
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split("T")[0];
  };

  const handleWeekendPromptResponse = (accepted) => {
    const currentWeek = getWeekStart(new Date());
    sessionStorage.setItem("lastFeedbackPromptWeek", currentWeek);

    if (accepted) {
      onOpenFeedbackModal();
    }
    setShowWeekendPrompt(false);
  };

  const handleModalBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowWeekendPrompt(false);
    }
  };

  return (
    <>
      {/* Weekend Prompt Modal */}
      {showWeekendPrompt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={handleModalBackdropClick}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Share Your Weekly Journey 📚
              </h3>
            </div>
            <p className="text-gray-600 mb-6 text-center leading-relaxed">
              How was your week in the classroom? Share your experiences,
              challenges, or victories with fellow teachers. Your insights
              matter!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleWeekendPromptResponse(true)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Yes, let's share! ✨
              </button>
              <button
                onClick={() => handleWeekendPromptResponse(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-all duration-300 font-medium"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Feedback Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onMouseEnter={() => setButtonOpacity(1)}
          onMouseLeave={() => setButtonOpacity(0.5)}
          onClick={onOpenFeedbackModal}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-12 relative group"
          style={{ opacity: buttonOpacity }}
          title="Share your teaching experience"
        >
          <MessageCircle
            size={24}
            className="transition-transform duration-300 group-hover:scale-110"
          />

          {/* Floating pulse animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-ping opacity-20"></div>
        </button>

        {/* Development Test Button */}
        {/* {process.env.NODE_ENV === "development" && (
          <div className="absolute bottom-16 right-0">
            <button
              onClick={onOpenFeedbackModal}
              className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600 transition-colors shadow-lg"
            >
              Test Feedback
            </button>
          </div>
        )} */}
      </div>
    </>
  );
};

export default FeedbackSystem;
