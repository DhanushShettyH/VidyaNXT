// src/pages/AiChatWindow.jsx
import React, { useState, useRef, useEffect } from "react";
import { auth, db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import {
	collection,
	query,
	onSnapshot,
	orderBy,
	doc,
	getDoc,
} from "firebase/firestore";

export default function AiChatWindow() {
	const [messages, setMessages] = useState([]);
	const [newMsg, setNewMsg] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isTyping, setIsTyping] = useState(false);
	const [sessionId, setSessionId] = useState(null);
	const [sessionData, setSessionData] = useState(null);
	const [teacherId, setTeacherId] = useState(null);
	const [error, setError] = useState(null);
	const bottomRef = useRef(null);
	const unsubscribeRef = useRef(null);

	useEffect(() => {
		const initAiChat = async () => {
			try {
				const stored = sessionStorage.getItem("teacherData");
				if (!stored) {
					throw new Error("Teacher data not found");
				}

				const teacherData = JSON.parse(stored);
				setTeacherId(teacherData.id);

				const user = auth.currentUser;
				if (!user) throw new Error("Not authenticated");

				// Get challenge text from URL params or use default
				const urlParams = new URLSearchParams(window.location.search);
				const challengeId = urlParams.get("challengeId");
				const challengeText = urlParams.get("challengeText") || "I need some teaching support and guidance.";

				// Create AI chat session
				const createSessionFn = httpsCallable(functions, "createAiChatSession");
				const response = await createSessionFn({
					challengeId: challengeId || `ai-chat-${Date.now()}`,
					challengeText,
					teacherId: teacherData.id,
				});

				if (!response.data || !response.data.success) {
					throw new Error(response.data?.message || "Failed to create AI session");
				}

				const session = response.data.session;
				if (!session || !session.sessionId) {
					throw new Error("Invalid session data received");
				}

				setSessionId(session.sessionId);
				setSessionData(session);

				// Set initial welcome message
				const welcomeMessage = {
					id: "welcome",
					type: "ai",
					message: session.welcomeMessage || "Hello! I'm your AI teaching assistant. How can I assist you today?",
					timestamp: new Date().toISOString(),
				};

				setMessages([welcomeMessage]);

				// Listen for new messages
				const messagesRef = collection(db, "aiChatSessions", session.sessionId, "messages");
				const messageQuery = query(messagesRef, orderBy("timestamp", "asc"));

				const unsubscribe = onSnapshot(
					messageQuery,
					(snapshot) => {
						const msgs = snapshot.docs.map((doc) => ({
							id: doc.id,
							...doc.data(),
						}));

						// Combine welcome message with chat messages
						const allMessages = [welcomeMessage, ...msgs];
						setMessages(allMessages);

						// Scroll to bottom after messages update
						setTimeout(() => {
							bottomRef.current?.scrollIntoView({ behavior: "smooth" });
						}, 100);
					},
					(error) => {
						console.error("❌ Messages listener error:", error);
						setError("Failed to load messages. Please refresh the page.");
					}
				);

				unsubscribeRef.current = unsubscribe;
				setIsLoading(false);

			} catch (error) {
				console.error("❌ AI Chat init failed:", error);
				setError(error.message);
				setIsLoading(false);
			}
		};

		initAiChat();

		// Cleanup function
		return () => {
			if (unsubscribeRef.current) {
				unsubscribeRef.current();
			}
		};
	}, []);

	const sendMessage = async (e) => {
		e.preventDefault();
		if (!newMsg.trim() || !sessionId || isTyping) return;

		const text = newMsg.trim();
		setNewMsg("");
		setIsTyping(true);
		setError(null); // Clear any previous errors

		try {
			const sendMessageFn = httpsCallable(functions, "sendAiChatMessage");
			const response = await sendMessageFn({
				sessionId,
				message: text,
			});

			if (!response.data || !response.data.success) {
				throw new Error(response.data?.message || "Failed to send message");
			}

			// Success - the message will appear via the listener
			console.log("✅ Message sent successfully");

		} catch (error) {
			console.error("❌ sendMessage error:", error);

			// Show specific error message
			let errorMessage = "Failed to send message. Please try again.";
			if (error.code === 'unauthenticated') {
				errorMessage = "Please sign in to continue.";
			} else if (error.code === 'not-found') {
				errorMessage = "Chat session not found. Please start a new session.";
			} else if (error.message) {
				errorMessage = error.message;
			}

			setError(errorMessage);

			// Restore the message text so user can retry
			setNewMsg(text);
		} finally {
			setIsTyping(false);
		}
	};

	const endSession = async () => {
		if (!sessionId) return;

		try {
			setError(null);
			const endSessionFn = httpsCallable(functions, "endAiChatSession");
			const response = await endSessionFn({ sessionId });

			if (response.data && response.data.success) {
				alert("Session ended successfully! Analysis has been saved.");
				// Clean up listener before leaving
				if (unsubscribeRef.current) {
					unsubscribeRef.current();
				}
				window.history.back();
			} else {
				throw new Error(response.data?.message || "Failed to end session");
			}
		} catch (error) {
			console.error("❌ endSession error:", error);
			setError("Failed to end session. Please try again.");
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage(e);
		}
	};

	// Enhanced formatMessage function
	const formatMessage = (text) => {
		if (!text) return "";
		if (typeof text !== "string") return JSON.stringify(text);

		// Split by lines and format each line
		const lines = text.split('\n');
		return lines.map((line, index) => {
			const trimmedLine = line.trim();

			// Skip empty lines
			if (!trimmedLine) return <br key={index} />;

			// Format bullet points
			if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
				return (
					<div key={index} className="flex items-start space-x-2 my-1">
						<span className="text-blue-500 mt-1">•</span>
						<span>{trimmedLine.substring(1).trim()}</span>
					</div>
				);
			}

			// Format numbered lists
			if (/^\d+\./.test(trimmedLine)) {
				return (
					<div key={index} className="flex items-start space-x-2 my-1">
						<span className="text-blue-500 font-medium">{trimmedLine.match(/^\d+\./)[0]}</span>
						<span>{trimmedLine.replace(/^\d+\.\s*/, '')}</span>
					</div>
				);
			}

			// Format headings (lines with colon at end, under 50 chars)
			if (trimmedLine.endsWith(':') && trimmedLine.length < 50 && !trimmedLine.includes('http')) {
				return (
					<div key={index} className="font-semibold text-gray-800 mt-3 mb-1">
						{trimmedLine}
					</div>
				);
			}

			// Regular text
			return (
				<div key={index} className="whitespace-pre-wrap leading-relaxed">
					{trimmedLine}
				</div>
			);
		});
	};

	// Fixed and enhanced function to render AI message with resources
	const renderAiMessage = (message) => {
		let messageText = message.message;
		let parsedMetrics = message.metrics;

		// Check if the message is a JSON string that needs parsing
		if (typeof messageText === 'string' && (messageText.startsWith('{') || messageText.startsWith('['))) {
			try {
				const parsed = JSON.parse(messageText);
				// If it's a structured response object
				if (parsed.text || parsed.message) {
					messageText = parsed.text || parsed.message;

					// Extract metrics from parsed response if not already available
					if (!parsedMetrics && (parsed.confidence || parsed.resources || parsed.type)) {
						parsedMetrics = {
							confidence: parsed.confidence || null,
							resources: parsed.resources || null,
							type: parsed.type || null
						};
					}
				}
			} catch (parseError) {
				// If parsing fails, use the original message as-is
				console.warn("Could not parse AI message JSON:", parseError);
			}
		}

		// Use parsed metrics if available, otherwise fall back to message.metrics
		const metrics = parsedMetrics || message.metrics;

		return (
			<div className="text-sm space-y-3">

				{/* Main message content */}
				<div>{formatMessage(messageText)}</div>

				{/* Confidence score */}
				{metrics?.confidence && (
					<div className="text-xs text-gray-600 flex items-center space-x-2">
						<span>Confidence:</span>
						<span className="font-medium">{Math.round(metrics.confidence * 100)}%</span>
						<div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
							<div
								className="h-full bg-green-500 transition-all duration-300"
								style={{ width: `${metrics.confidence * 100}%` }}
							/>
						</div>
					</div>
				)}

				{/* Response type */}
				{metrics?.type && (
					<div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
						{metrics.type}
					</div>
				)}

				{/* Resources section */}
				{metrics?.resources && Array.isArray(metrics.resources) && metrics.resources.length > 0 && (
					<div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
						<h5 className="font-semibold text-blue-800 mb-2 flex items-center">
							<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
							</svg>
							Recommended Resources
						</h5>
						<div className="space-y-2">
							{metrics.resources.map((resource, index) => (
								<div key={index} className="flex items-start space-x-2">
									<span className="text-xs font-medium uppercase text-blue-600 bg-blue-100 px-2 py-1 rounded">
										{resource.type || 'Resource'}
									</span>
									<div className="flex-1">
										<a
											href={resource.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-700 hover:text-blue-900 underline text-sm font-medium block"
										>
											{resource.title}
										</a>
										{resource.description && (
											<p className="text-xs text-gray-600 mt-1">{resource.description}</p>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		);
	};

	// Handle suggested question click
	const handleSuggestedQuestion = (question) => {
		setNewMsg(question);
		// Focus on textarea for better UX
		setTimeout(() => {
			const textarea = document.querySelector('textarea');
			if (textarea) {
				textarea.focus();
			}
		}, 100);
	};

	if (error && isLoading) {
		return (
			<div className="flex flex-col h-screen bg-gray-100 justify-center items-center">
				<div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
					<h2 className="text-lg font-semibold text-red-600 mb-2">Error</h2>
					<p className="text-gray-700 mb-4">{error}</p>
					<div className="flex space-x-2">
						<button
							onClick={() => window.location.reload()}
							className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
						>
							Retry
						</button>
						<button
							onClick={() => window.history.back()}
							className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
						>
							Go Back
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen bg-gray-100 " >
			{/* Header */}
			<div className="bg-white shadow-sm p-4 flex items-center justify-between">
				<button
					onClick={() => window.history.back()}
					className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
				>
					<span>←</span>
					<span>Back</span>
				</button>
				<div className="flex items-center space-x-2">
					<div className="text-lg font-semibold">AI Teaching Assistant</div>
					<div
						className={`w-2 h-2 rounded-full ${isLoading ? "bg-yellow-400" : "bg-green-400"}`}
					/>
					<span className="text-xs text-gray-500">
						{isLoading ? "Connecting..." : "Online"}
					</span>
				</div>
				<button
					onClick={endSession}
					className="bg-red-500 text-white px-3 py-3 rounded text-sm hover:bg-red-600 disabled:opacity-50"
					disabled={!sessionId || isLoading}
				>
					<svg
						className="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						strokeWidth="2"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
						/>
					</svg>
				</button>
			</div>

			{/* Main Chat Container */}
			<div className="flex-1 flex flex-col max-w-4xl w-full mx-auto overflow-hidden">
				{/* Error Banner */}
				{error && !isLoading && (
					<div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-2">
						<div className="flex items-center">
							<div className="text-red-700 text-sm flex-1">{error}</div>
							<button
								onClick={() => setError(null)}
								className="text-red-500 hover:text-red-700 ml-2"
							>
								×
							</button>
						</div>
					</div>
				)}

				{/* Messages Container - This will take remaining space and be scrollable */}
				<div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
					{/* All your messages content here - same as before */}
					{isLoading ? (
						<div className="flex justify-center items-center h-full">
							<div className="flex flex-col items-center space-y-2">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
								<div className="text-gray-500">Loading AI chat...</div>
							</div>
						</div>
					) : (
						messages.map((m) => (
							<div
								key={m.id}
								className={`flex ${m.type === "user" ? "justify-end" : "justify-start"}`}
							>
								<div
									className={`w-full max-w-[75%] px-4 py-2 rounded-lg ${m.type === "user"
										? "bg-blue-500 text-white"
										: "bg-white text-gray-800 shadow-sm border"
										}`}
								>
									<div className="text-sm">
										{m.type === "ai" ? renderAiMessage(m) : formatMessage(m.message)}
									</div>
									<div className="text-xs opacity-70 mt-1">
										{new Date(m.timestamp).toLocaleTimeString()}
									</div>
								</div>
							</div>
						))
					)}

					{/* Typing indicator */}
					{isTyping && (
						<div className="flex justify-start">
							<div className="bg-white text-gray-800 shadow-sm px-4 py-2 rounded-lg border">
								<div className="flex space-x-1">
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
								</div>
							</div>
						</div>
					)}

					{/* Suggested questions */}
					{sessionData && messages.length === 1 && sessionData.suggestedQuestions && (
						<div className="bg-blue-50 p-4 rounded-lg">
							<h4 className="font-semibold text-blue-800 mb-2">Suggested Questions:</h4>
							<div className="space-y-2">
								{sessionData.suggestedQuestions.map((question, index) => (
									<button
										key={index}
										onClick={() => handleSuggestedQuestion(question)}
										className="block w-full text-left p-2 bg-white rounded border hover:bg-gray-50 text-sm transition-colors"
									>
										{question}
									</button>
								))}
							</div>
						</div>
					)}

					<div ref={bottomRef} />
				</div>

				{/* Input Form - This will stick to bottom */}
				<div className="flex-shrink-0 p-4 bg-white shadow-sm border-t">
					<form onSubmit={sendMessage}>
						<div className="flex space-x-2">
							<textarea
								value={newMsg}
								onChange={(e) => setNewMsg(e.target.value)}
								onKeyPress={handleKeyPress}
								placeholder="Ask me anything about teaching..."
								rows={1}
								className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
								disabled={isTyping || isLoading}
							/>
							<button
								type="submit"
								disabled={!newMsg.trim() || isTyping || isLoading}
								className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
							>
								{isTyping ? "..." : "Send"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);

}