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
import ContentHub from "./pages/ContentHub.jsx";
import ContentLibrary from "./pages/ContentLibrary.jsx";
import TrainingHub from "./pages/TrainingHub.jsx";
import WeeklyPlanner from "./pages/WeeklyPlanner.jsx";
import ContentDetailPage from "./components/ContentDetailPage.jsx";
import MaterialDetailPage from "./components/MaterialDetailPage.jsx";
import WeeklyPlanPage from "./components/WeeklyPlanPage.jsx";

function App() {
	return (
    <>
      <Routes>
        {/* user routes */}
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
        <Route path="/training-hub" element={<TrainingHub />} />
        <Route
          path="/wellness/notifications"
          element={<WellnessNotifications />}
        />
        <Route
          path="/wellness/recommendations"
          element={<WellnessRecommendations />}
        />
        <Route path="/content-library" element={<ContentLibrary />} />
        <Route path="/content-hub" element={<ContentHub />} />
        <Route path="/content/:id" element={<ContentDetailPage />} />
        <Route path="/material/:id" element={<MaterialDetailPage />} />
        <Route path="/weekly-planner" element={<WeeklyPlanner />} />
        <Route path="/weekly-plan-view" element={<WeeklyPlanPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <PWABadge />
    </>
  );
}

export default App;
