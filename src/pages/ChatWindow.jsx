// src/pages/ChatWindow.jsx
import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc as docRef,
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";

// Sidebar: list of your conversations
function ChatList({ onSelect }) {
  const [conversations, setConversations] = useState([]);
  const userId = auth.currentUser.uid;

  useEffect(() => {
    const q = query(
      collection(db, "conversations"),
      where("members", "array-contains", userId),
      orderBy("lastUpdated", "desc")
    );
    return onSnapshot(q, (snap) => {
      setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [userId]);

  return (
    <div className="w-1/3 border-r h-full overflow-auto">
      <h2 className="p-4 font-bold">Chats</h2>
      <ul>
        {conversations.map((conv) => {
          const friendId = conv.members.find((m) => m !== userId);
          return (
            <li key={conv.id}>
              <button
                onClick={() => onSelect(conv.id)}
                className="w-full text-left p-3 hover:bg-gray-100"
              >
                {conv.name || friendId}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ChatWindow() {
  const { convoId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const bottomRef = useRef(null);
  const userId = auth.currentUser.uid;

  // Load messages when convoId changes
  useEffect(() => {
    if (!convoId) return;
    const messagesRef = collection(db, "conversations", convoId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return unsub;
  }, [convoId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !convoId) return;

    await addDoc(collection(db, "conversations", convoId, "messages"), {
      text: newMsg.trim(),
      sender: userId,
      createdAt: serverTimestamp(),
    });

    // update lastUpdated timestamp
    await docRef(db, "conversations", convoId).set(
      { lastUpdated: serverTimestamp() },
      { merge: true }
    );

    setNewMsg("");
  };

  return (
    <div className="flex h-screen">
      <ChatList onSelect={(id) => navigate(`/chat/${id}`)} />

      <div className="flex-1 flex flex-col">
        {convoId ? (
          <>
            <div className="flex-1 overflow-auto p-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-2 flex ${
                    msg.sender === userId ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-lg max-w-xs break-words ${
                      msg.sender === userId
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form
              onSubmit={sendMessage}
              className="p-4 border-t flex items-center"
            >
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newMsg.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-r-lg disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
