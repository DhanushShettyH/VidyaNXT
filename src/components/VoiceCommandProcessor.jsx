// src/components/VoiceCommandProcessor.jsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useNavigate } from "react-router-dom";

const VoiceCommandProcessor = ({ command, userId, onComplete, onBack }) => {
  const [processing, setProcessing] = useState(true);
  const [intent, setIntent] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    processCommand();
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [command]);

  const processCommand = async () => {
    try {
      const analyzeVoiceIntent = httpsCallable(functions, "analyzeVoiceIntent");
      const result = await analyzeVoiceIntent({
        command: command,
        userId: userId,
      });

      if (result.data.success) {
        setIntent(result.data.intent);

        // Check if we have all required fields
        if (result.data.missingFields && result.data.missingFields.length > 0) {
          setMissingFields(result.data.missingFields);
          setProcessing(false);
        } else {
          // Execute the command
          await executeCommand(result.data.intent);
        }
      }
    } catch (error) {
      console.error("Command processing failed:", error);
      setProcessing(false);
    }
  };

  const executeCommand = async (intentData) => {
    try {
      const executeVoiceCommand = httpsCallable(
        functions,
        "executeVoiceCommand"
      );
      const result = await executeVoiceCommand({
        intent: intentData,
        userId: userId,
        additionalInfo: additionalInfo,
      });

      if (result.data.success) {
        setSessionId(result.data.sessionId);

        // Start polling for completion using your existing pull mechanism
        startPolling(result.data.sessionId);
      }
    } catch (error) {
      console.error("Command execution failed:", error);
      setProcessing(false);
    }
  };

  const startPolling = (sessionId) => {
    const pollContent = httpsCallable(functions, "pollContentGeneration");

    const interval = setInterval(async () => {
      try {
        const result = await pollContent({ sessionId });

        if (result.data.status === "completed") {
          clearInterval(interval);
          setProcessing(false);

          // Navigate to the appropriate page
          if (result.data.navigateTo) {
            setTimeout(() => {
              navigate(result.data.navigateTo);
              onComplete();
            }, 1000);
          }
        } else if (result.data.status === "error") {
          clearInterval(interval);
          setProcessing(false);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);

    setPollingInterval(interval);
  };

  const handleMissingFieldInput = (field, value) => {
    setAdditionalInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitWithAdditionalInfo = async () => {
    setProcessing(true);
    setMissingFields([]);

    const updatedIntent = {
      ...intent,
      ...additionalInfo,
    };

    await executeCommand(updatedIntent);
  };

  const renderMissingFieldsForm = () => (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <AlertCircle className="text-yellow-500 mr-2" size={20} />
        <span className="font-medium">Need more information</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        I understood: <em>"{command}"</em>
      </p>

      {missingFields.map((field) => (
        <div key={field} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {getFieldLabel(field)}
          </label>
          {renderFieldInput(field)}
        </div>
      ))}

      <div className="flex space-x-2 pt-4">
        <button
          onClick={submitWithAdditionalInfo}
          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create Content
        </button>
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
      </div>
    </div>
  );

  const renderFieldInput = (field) => {
    switch (field) {
      case "grades":
        return (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5].map((grade) => (
              <label key={grade} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={additionalInfo.grades?.includes(grade) || false}
                  onChange={(e) => {
                    const currentGrades = additionalInfo.grades || [];
                    const newGrades = e.target.checked
                      ? [...currentGrades, grade]
                      : currentGrades.filter((g) => g !== grade);
                    handleMissingFieldInput("grades", newGrades);
                  }}
                  className="rounded"
                />
                <span className="text-sm">Grade {grade}</span>
              </label>
            ))}
          </div>
        );

      case "subject":
        return (
          <select
            value={additionalInfo.subject || ""}
            onChange={(e) => handleMissingFieldInput("subject", e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select subject</option>
            <option value="mathematics">Mathematics</option>
            <option value="science">Science</option>
            <option value="hindi">Hindi</option>
            <option value="english">English</option>
            <option value="social_studies">Social Studies</option>
          </select>
        );

      case "topic":
        return (
          <input
            type="text"
            value={additionalInfo.topic || ""}
            onChange={(e) => handleMissingFieldInput("topic", e.target.value)}
            placeholder="Enter topic"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      default:
        return (
          <input
            type="text"
            value={additionalInfo[field] || ""}
            onChange={(e) => handleMissingFieldInput(field, e.target.value)}
            placeholder={`Enter ${field}`}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  const getFieldLabel = (field) => {
    const labels = {
      grades: "Which grades?",
      subject: "Subject",
      topic: "Topic",
      language: "Language",
      difficulty: "Difficulty Level",
    };
    return labels[field] || field;
  };

  const renderProcessingState = () => (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center">
        <Loader className="animate-spin text-blue-500" size={32} />
      </div>
      <div>
        <h4 className="font-medium text-gray-900">Creating your content...</h4>
        <p className="text-sm text-gray-600 mt-1">
          {sessionId ? "Generating content with AI" : "Processing your request"}
        </p>
      </div>
      {sessionId && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-700">
            You'll be notified when ready and automatically navigated to the
            content.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-48">
      {processing ? (
        renderProcessingState()
      ) : missingFields.length > 0 ? (
        renderMissingFieldsForm()
      ) : (
        <div className="text-center space-y-4">
          <CheckCircle className="text-green-500 mx-auto" size={32} />
          <p className="text-green-700 font-medium">Content ready!</p>
        </div>
      )}
    </div>
  );
};

export default VoiceCommandProcessor;
