import { useState } from "react";
import reactLogo from "./assets/react.svg";
import appLogo from "/favicon.webp";
import PWABadge from "./PWABadge.jsx";
import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import RegisterTeacher from "./components/RegisterTeacher.jsx";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import PeerAdvice from "./pages/PeerAdvice.jsx";
import ChatWindow from "./pages/ChatWindow.jsx";
import PeersList from "./pages/PeersList.jsx";
import AiChatWindow from "./pages/AiChatWindow.jsx";
import WellnessDashboard from "./pages/WellnessDashboard.jsx";
import WellnessRecommendations from "./components/WellnessRecommendations.jsx";
import WellnessNotifications from "./components/WellnessNotifications.jsx";
import WellnessAnalytics from "./components/WellnessAnalytics.jsx";
import WellnessAlerts from "./components/WellnessAlert.jsx";
import WellnessMetrics from "./components/WellnessMetrics.jsx";

function App() {
	return (
		<>
			<Routes>
				<Route path="/" element={<Navigate to="/register" replace />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<RegisterTeacher />} />
				<Route path="/home" element={<Home />} />
				<Route path="/peer-advice" element={<PeerAdvice />} />
				<Route path="/peers" element={<PeersList />} />
				<Route path="/chat" element={<Navigate to="/chat/list" replace />} />
				<Route path="/chat/list" element={<ChatWindow />} />{" "}
				<Route path="/chat/ai" element={<AiChatWindow />} />
				<Route path="/chat/:convoId" element={<ChatWindow />} />{" "}
				{/* opens specific convo */}

				<Route path="/wellness-dashboard" element={<WellnessDashboard />} />
				<Route path="/wellness/metrics" element={<WellnessMetrics />} />
				<Route path="/wellness/alerts" element={<WellnessAlerts />} />
				<Route path="/wellness/analytics" element={<WellnessAnalytics />} />
				<Route path="/wellness/notifications" element={<WellnessNotifications />} />
				<Route path="/wellness/recommendations" element={<WellnessRecommendations />} />

				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>

			<PWABadge />
		</>
	);
}

export default App;
