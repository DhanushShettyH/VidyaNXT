// src/pages/PeerAdvice.jsx
import React, { useEffect, useState } from "react";
import { auth, db, functions } from "../firebase";
import { useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import Header from "../components/Header";

export default function PeerAdvice() {
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingChallenge, setProcessingChallenge] = useState(false); // New state for challenge processing
  const [challengeText, setChallengeText] = useState("");
  const [challengeId, setChallengeId] = useState(null);
  const [challengeDoc, setChallengeDoc] = useState(null);
  const [peerNames, setPeerNames] = useState({});

  const navigate = useNavigate();

  // 1️⃣ Auth check + load teacherData
  useEffect(() => {
    const stored = sessionStorage.getItem("teacherData");
    if (!stored) {
      navigate("/login");
      return;
    }
    setTeacherData(JSON.parse(stored));
    setLoading(false);
  }, [navigate]);

  // 2️⃣ Subscribe to challenge doc
  useEffect(() => {
    if (!challengeId) return;
    const ref = doc(db, "challenges", challengeId);
    const unsubscribe = onSnapshot(ref, (snap) => {
      const data = snap.data();
      if (data) {
        // Ensure aiChatRecommended is always true
        const updatedData = {
          ...data,
          aiChatRecommended: true,
        };
        setChallengeDoc(updatedData);

        // Stop loading when we get matches or when status is MATCHED/ORCHESTRATED
        if (
          data.matches?.length > 0 ||
          data.status === "MATCHED" ||
          data.status === "ORCHESTRATED"
        ) {
          setProcessingChallenge(false);
        }
      }
    });
    return () => unsubscribe();
  }, [challengeId]);

  // 3️⃣ Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!challengeText.trim()) return;
    setProcessingChallenge(true); // Use processingChallenge instead of loading
    try {
      const postChallenge = httpsCallable(functions, "postChallenge");
      const { data } = await postChallenge({
        text: challengeText.trim(),
        teacherId: teacherData.id,
        urgency: "medium",
      });
      setChallengeId(data.challengeId);
      setChallengeText("");
      // Don't set processingChallenge to false here - let the snapshot listener handle it
    } catch (err) {
      console.error("Error posting challenge:", err);
      setProcessingChallenge(false);
    }
  };

  // Fetch peer display names
  const fetchPeerName = async (peerId) => {
    if (peerNames[peerId]) return;
    try {
      const ref = doc(db, "teachers", peerId);
      const snap = await getDoc(ref);
      const data = snap.data();
      setPeerNames((prev) => ({
        ...prev,
        [peerId]: data?.displayName || "Unknown",
      }));
    } catch (err) {
      console.error("Error fetching peer name:", err);
      setPeerNames((prev) => ({ ...prev, [peerId]: "Unknown" }));
    }
  };

  useEffect(() => {
    if (challengeDoc?.matches) {
      challengeDoc.matches.forEach(({ peerId }) => fetchPeerName(peerId));
    }
  }, [challengeDoc]);

  // Helper to start chat with peer
  const startChatWithPeer = async (peerId) => {
    const fn = httpsCallable(functions, "startChatWith");
    const { data } = await fn({ peerId, teacherId: teacherData.id });
    return data.convoId;
  };

  // Handle peer click
  const handlePeerClick = async (peerId) => {
    setLoading(true);
    try {
      const convoId = await startChatWithPeer(peerId);
      navigate(`/chat/${convoId}`);
    } catch (err) {
      console.error("Failed to start chat:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle AI chat click
  const handleAiChatClick = () => {
    // Pass challenge data to AI chat
    const challengeData = {
      challengeId,
      challengeText: challengeDoc?.text || challengeText,
      classification: challengeDoc?.classification,
      teacherData,
    };

    // Store challenge data for AI chat to use
    sessionStorage.setItem("aiChatChallenge", JSON.stringify(challengeData));

    // Navigate to AI chat
    navigate("/chat/ai");
  };

  // AI Processing Loading Screen Component
  const AIProcessingLoader = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
        {/* Animated AI Brain */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-indigo-600 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
            <div className="w-8 h-8 relative">
              {/* Animated dots representing neural network */}
              <div
                className="absolute w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                style={{ top: "0px", left: "12px" }}
              ></div>
              <div
                className="absolute w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                style={{ top: "12px", left: "0px", animationDelay: "0.1s" }}
              ></div>
              <div
                className="absolute w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                style={{ top: "12px", left: "24px", animationDelay: "0.2s" }}
              ></div>
              <div
                className="absolute w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                style={{ top: "24px", left: "12px", animationDelay: "0.3s" }}
              ></div>
              {/* Connecting lines */}
              <div
                className="absolute w-0.5 h-3 bg-purple-300 rotate-45"
                style={{ top: "8px", left: "7px" }}
              ></div>
              <div
                className="absolute w-0.5 h-3 bg-purple-300 -rotate-45"
                style={{ top: "8px", left: "20px" }}
              ></div>
              <div
                className="absolute w-0.5 h-3 bg-purple-300 rotate-45"
                style={{ top: "13px", left: "7px" }}
              ></div>
              <div
                className="absolute w-0.5 h-3 bg-purple-300 -rotate-45"
                style={{ top: "13px", left: "20px" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Magic sparkles */}
        <div className="absolute top-4 left-8 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
        <div
          className="absolute top-12 right-8 w-1 h-1 bg-blue-400 rounded-full animate-ping"
          style={{ animationDelay: "0.5s" }}
        ></div>
        <div
          className="absolute bottom-12 left-12 w-1 h-1 bg-pink-400 rounded-full animate-ping"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-8 right-12 w-1 h-1 bg-green-400 rounded-full animate-ping"
          style={{ animationDelay: "1.5s" }}
        ></div>

        {/* Text content */}
        <h3 className="text-2xl font-bold text-gray-800 mb-3 flex items-center justify-center">
          <span className="mr-2">🤖</span>
          AI Magic in Progress
        </h3>
        <div className="space-y-2 text-gray-600">
          <p className="font-medium">✨ Analyzing your challenge...</p>
          <p className="font-medium">🔍 Finding perfect peer matches...</p>
          <p className="font-medium">🧠 Preparing AI assistance...</p>
        </div>

        {/* Progress bar */}
        <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full animate-pulse"></div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          This usually takes 10-30 seconds
        </p>
      </div>
    </div>
  );

  if (loading || !teacherData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
      {/* AI Processing Overlay */}
      {processingChallenge && <AIProcessingLoader />}
      <Header Heading={"Peer Advice Center"} />

      <div className="max-w-4xl mx-auto py-7 px-4">
        {/* Teacher Profile */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <p className="text-gray-700">
            Welcome,{" "}
            <span className="font-semibold">{teacherData.displayName}</span>!
            You teach{" "}
            <span className="font-semibold">
              {teacherData.grades?.join(", ") || "N/A"}
            </span>{" "}
            in <span className="font-semibold">{teacherData.location}</span>{" "}
            with{" "}
            <span className="font-semibold">{teacherData.experienceYears}</span>{" "}
            years of experience.
          </p>
        </div>

        {/* Post a Challenge */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Post a Challenge for peer's advice
          </h2>
          <form onSubmit={handleSubmit}>
            <textarea
              rows={5}
              value={challengeText}
              onChange={(e) => setChallengeText(e.target.value)}
              placeholder="Describe the teaching challenge you're facing..."
              className="w-full border border-gray-300 rounded-lg p-3 mb-4"
              disabled={processingChallenge}
            />
            <button
              type="submit"
              disabled={processingChallenge || !challengeText.trim()}
              className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {processingChallenge
                ? "🤖 AI Processing..."
                : "Submit for Peer Help"}
            </button>
          </form>
        </div>

        {/* Real‑time Challenge Status */}
        {challengeDoc && (
          <div className="space-y-6">
            {/* Classification */}
            {challengeDoc.status === "CLASSIFIED" && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  🏷️ Classification
                </h3>
                <p className="text-gray-700">
                  Type:{" "}
                  <span className="font-semibold">
                    {challengeDoc.classification.type}
                  </span>{" "}
                  ({(challengeDoc.classification.confidence * 100).toFixed(1)}%
                  confidence)
                </p>
              </div>
            )}

            {/* Support Options */}
            {(challengeDoc.status === "MATCHED" || challengeDoc.matches) && (
              <div className="space-y-4">
                {/* Peer Matches */}
                {challengeDoc.matches && challengeDoc.matches.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Suggested Peers
                    </h3>
                    <div className="space-y-2">
                      {challengeDoc.matches.map(({ peerId, score }) => (
                        <button
                          key={peerId}
                          className="w-full text-left bg-indigo-100 hover:bg-indigo-200 px-4 py-3 rounded-lg flex justify-between items-center transition-colors"
                          onClick={() => handlePeerClick(peerId)}
                        >
                          <div>
                            <span className="font-medium">
                              {peerNames[peerId] || peerId}
                            </span>
                            <span className="text-sm text-gray-600 ml-2">
                              {(score * 100).toFixed(1)}% match
                            </span>
                          </div>
                          <div className="flex items-center text-indigo-600">
                            <span className="text-sm mr-2">Chat now</span>
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Chat Option - Now always shown when challengeDoc exists */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg shadow border border-purple-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                    <span className="text-2xl mr-2">🤖</span>
                    AI Teaching Assistant
                  </h3>
                  <p className="text-gray-700 mb-4">
                    {challengeDoc.matches && challengeDoc.matches.length > 0
                      ? "Want immediate help while waiting for peers? Chat with our AI assistant trained on teaching best practices."
                      : "No peer matches found right now, but our AI assistant is ready to help! Get instant support and personalized advice."}
                  </p>
                  <button
                    onClick={handleAiChatClick}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center"
                  >
                    <span className="mr-2">Chat with AI Assistant</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </button>
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="font-medium">✨ Features:</span> Instant
                    responses • 24/7 availability • Personalized advice •
                    Resource recommendations
                  </div>
                </div>

                {/* No peer options available */}
                {!challengeDoc.matches?.length && (
                  <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">
                      ⏳ Finding Peer Matches
                    </h3>
                    <p className="text-yellow-700">
                      We're working on finding peer matches for your challenge.
                      In the meantime, try our AI assistant above for immediate
                      help.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Connection Link */}
            {challengeDoc.status === "ORCHESTRATED" &&
              challengeDoc.connectionLink && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    🔗 Connection Link
                  </h3>
                  <a
                    href={challengeDoc.connectionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline break-all"
                  >
                    {challengeDoc.connectionLink}
                  </a>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}