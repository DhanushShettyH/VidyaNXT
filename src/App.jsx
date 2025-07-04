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
				{/* defaults to list view */}
				<Route path="/chat/:convoId" element={<ChatWindow />} />{" "}
				{/* opens specific convo */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>

			<PWABadge />
		</>
	);
}

export default App;
