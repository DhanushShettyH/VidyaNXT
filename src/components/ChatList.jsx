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
  doc,
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";

// Sidebar: List of conversations (friends)
export function ChatList({ onSelect }) {
  const [conversations, setConversations] = useState([]);
  const userId = auth.currentUser.uid;

  useEffect(() => {
    // Listen to conversations where current user is a member
    const q = query(
      collection(db, "conversations"),
      where("members", "array-contains", userId),
      orderBy("lastUpdated", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setConversations(list);
    });
    return unsub;
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
