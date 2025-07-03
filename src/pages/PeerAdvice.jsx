// src/pages/PeerAdvice.jsx
import React, { useEffect, useState } from "react";
import { auth, db, functions } from "../firebase"; // ← we’ll import db & functions
import { useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

export default function PeerAdvice() {
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [challengeText, setChallengeText] = useState("");
  const [challengeId, setChallengeId] = useState(null);
  const [challengeDoc, setChallengeDoc] = useState(null);
  const [peerNames, setPeerNames] = useState({});

  const navigate = useNavigate();

  // 1️⃣ Auth check + load teacherData
  useEffect(() => {
    const stored = sessionStorage.getItem("teacherData");
    if (!auth.currentUser || !stored) {
      navigate("/login");
      return;
    }
    setTeacherData(JSON.parse(stored));
    setLoading(false);
  }, [navigate]);

  // 2️⃣ If a challengeId exists, subscribe to its Firestore doc
  useEffect(() => {
    if (!challengeId) return;
    const ref = doc(db, "challenges", challengeId);
    const unsubscribe = onSnapshot(ref, (snap) => {
      setChallengeDoc(snap.data());
    });
    return () => unsubscribe();
  }, [challengeId]);

  // 3️⃣ Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!challengeText.trim()) return;
    setLoading(true);

    try {
      const postChallenge = httpsCallable(functions, "postChallenge");
      const { data } = await postChallenge({
        text: challengeText.trim(),
        teacherId: teacherData.id,
        urgency: "medium",
      });
      setChallengeId(data.challengeId);
      setChallengeText(""); // clear input
    } catch (err) {
      console.error("Error posting challenge:", err);
    } finally {
      setLoading(false);
    }
  };

  // fetch peer data
  const fetchPeerName = async (peerId) => {
    if (peerNames[peerId]) return; // already fetched

    try {
      const ref = doc(db, "teachers", peerId);
      const snap = await getDoc(ref);
      const data = snap.data();
      if (data?.displayName) {
        setPeerNames((prev) => ({ ...prev, [peerId]: data.displayName }));
      } else {
        setPeerNames((prev) => ({ ...prev, [peerId]: "Unknown" }));
      }
    } catch (err) {
      console.error("❌ Error fetching peer name:", err.message);
      setPeerNames((prev) => ({ ...prev, [peerId]: "Unknown" }));
    }
  };
  useEffect(() => {
    if (challengeDoc?.matches) {
      challengeDoc.matches.forEach(({ peerId }) => {
        fetchPeerName(peerId);
      });
    }
  }, [challengeDoc]);

  if (loading || !teacherData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  async function startChatWith(functions, peerId) {
    const fn = httpsCallable(functions, "startChatWith");
    const { data } = await fn({ peerId });
    return data.convoId;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          👥 Peer Advice Center
        </h1>

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
            🔍 Post a Challenge
          </h2>
          <form onSubmit={handleSubmit}>
            <textarea
              rows={5}
              value={challengeText}
              onChange={(e) => setChallengeText(e.target.value)}
              placeholder="Describe the teaching challenge you're facing..."
              className="w-full border border-gray-300 rounded-lg p-3 mb-4"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Submit for Peer Help
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
                  </span>
                  {"  "}(
                  {(challengeDoc.classification.confidence * 100).toFixed(1)}%
                  confidence)
                </p>
              </div>
            )}

            {/* Peer Matches */}
            {(challengeDoc.status === "MATCHED" || challengeDoc.matches) && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  🤝 Suggested Peers
                </h3>
                <ul
                  className="list-disc list-inside text-gray-700"
                  style={{ textDecoration: "none", listStyle: "none" }}
                >
                  {challengeDoc.matches.map(({ peerId, score }) => (
                    <li key={peerId}>
                      <button
                        className="w-full text-left bg-indigo-100 hover:bg-indigo-200 px-4 py-2 rounded flex justify-between items-center"
                        onClick={async () => {
                          try {
                            setLoading(true);
                            const chatRoomId = await startChatWith(
                              functions,
                              peerId
                            );
                            navigate(`/chat/${chatRoomId}`);
                          } catch (err) {
                            console.error("Failed to start chat:", err);
                            // optionally show a toast/error UI
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        <span>
                          {`Chat with ${peerNames[peerId] || peerId} — ${(
                            score * 100
                          ).toFixed(1)}% match`}
                        </span>

                        <svg
                          /* chat icon */ className="w-5 h-5 text-indigo-600"
                        >
                          <use href="#icon-chat" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
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
