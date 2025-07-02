import { useState } from "react";
import reactLogo from "./assets/react.svg";
import appLogo from "/favicon.webp";
import PWABadge from "./PWABadge.jsx";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import RegisterTeacher from "./components/RegisterTeacher.jsx";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import PeerAdvice from "./pages/PeerAdvice.jsx";

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterTeacher />} />
        <Route path="/home" element={<Home />} />
        <Route path="/peer-advice" element={<PeerAdvice />} />
      </Routes>

      <PWABadge />
    </>
  );
}

export default App;
