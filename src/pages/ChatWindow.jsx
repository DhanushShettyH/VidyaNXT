// src/pages/ChatWindow.jsx
import React, { useEffect, useState, useRef } from "react";
import { db, auth, functions } from "../firebase";
import {
	collection,
	query,
	onSnapshot,
	orderBy,
	addDoc,
	serverTimestamp,
	doc,
	setDoc,
	getDoc,
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { httpsCallable } from "firebase/functions";

export default function ChatWindow() {
	const { convoId } = useParams();
	const navigate = useNavigate();
	const [messages, setMessages] = useState([]);
	const [newMsg, setNewMsg] = useState("");
	const [peerName, setPeerName] = useState("");
	const bottomRef = useRef(null);
	const userId = auth.currentUser.uid;
	const teacherData = JSON.parse(sessionStorage.getItem("teacherData"));
	const teacherId = teacherData?.id;

	// Fetch and listen to messages
	useEffect(() => {
		if (!convoId) return;

		// Fetch conversation members to get peerId and name
		const getPeerName = async () => {
			const convoRef = doc(db, "conversations", convoId);
			const convoSnap = await getDoc(convoRef);
			if (convoSnap.exists()) {
				const members = convoSnap.data().members;
				const peerId = members.find((m) => m !== teacherId);
				// fetch teacher displayName
				const teacherRef = doc(db, "teachers", peerId);
				const teacherSnap = await getDoc(teacherRef);
				setPeerName(teacherSnap.data()?.displayName || peerId);
			}
		};
		getPeerName();

		// listen for messages
		const messagesRef = collection(db, "conversations", convoId, "messages");
		const q = query(messagesRef, orderBy("createdAt", "asc"));
		const unsub = onSnapshot(q, (snap) => {
			setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		});
		return unsub;
	}, [convoId, teacherId]);

	// send message
	const sendMessage = async (e) => {
		e.preventDefault();
		if (!newMsg.trim() || !convoId) return;

		await addDoc(collection(db, "conversations", convoId, "messages"), {
			text: newMsg.trim(),
			sender: teacherId,
			createdAt: serverTimestamp(),
		});

		await setDoc(
			doc(db, "conversations", convoId),
			{ lastUpdated: serverTimestamp() },
			{ merge: true }
		);

		setNewMsg("");
	};

	useEffect(() => {
		if (!convoId) return;

		const stored = sessionStorage.getItem("teacherData");
		if (!stored) return;

		const teacherData = JSON.parse(stored);
		const markRead = httpsCallable(functions, "markAsRead");

		markRead({ convoId, teacherId: teacherData.id }).catch(console.error);
	}, [convoId]);

	return (
		<div className="flex flex-col h-screen bg-gray-50">
			{/* Top Nav with Peer Name */}
			<nav className="bg-white shadow p-4 flex items-center">
				<button onClick={() => navigate(-1)} className="mr-4">
					<ArrowLeft className="w-6 h-6 text-gray-700" />
				</button>
				<h2 className="text-lg font-semibold text-gray-900">{peerName}</h2>
			</nav>

			{/* Messages area */}
			<div className="flex-1 overflow-auto p-4">
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`mb-2 flex ${msg.sender === teacherId ? "justify-end" : "justify-start"}`}
					>
						<div
							className={`px-4 py-2 rounded-lg max-w-xs break-words ${msg.sender === teacherId ? "bg-indigo-500 text-white" : "bg-gray-200"
								}`}
						>
							{msg.text}
						</div>
					</div>
				))}
				<div ref={bottomRef} />
			</div>

			{/* Input */}
			<form onSubmit={sendMessage} className="p-4 border-t bg-white flex">
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
		</div>
	);
}
