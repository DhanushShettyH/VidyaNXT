import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Link, useNavigate } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Step 1: Authenticating credentials
      setLoadingText("Verifying your credentials...");
      const userCred = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const uid = userCred.user.uid;

      // Step 2: Retrieving profile
      setLoadingText("Retrieving your profile...");
      await new Promise((resolve) => setTimeout(resolve, 800)); // Small delay for UX
      const loginTeacher = httpsCallable(getFunctions(), "loginTeacher");
      const result = await loginTeacher({ uid });

      if (result.data.success) {
        // Step 3: Preparing dashboard
        setLoadingText("Preparing your dashboard...");
        await new Promise((resolve) => setTimeout(resolve, 600)); // Small delay for UX
        const data = JSON.stringify(result.data.teacher);
        sessionStorage.setItem("teacherData", data);
        sessionStorage.setItem("displayName", result.data.teacher.displayName);

        // Final step
        setLoadingText("Welcome back!");
        await new Promise((resolve) => setTimeout(resolve, 400));
        console.log("✅ Login success:", result.data.teacher);
        navigate("/home");
      } else {
        setError(result.data.message || "Teacher not found.");
      }
    } catch (err) {
      if (err.code === "auth/user-not-found")
        setError("No user found. Please register.");
      else if (err.code === "auth/wrong-password")
        setError("Invalid password.");
      else if (err.code === "auth/invalid-email")
        setError("Invalid email format.");
      else setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen title={loadingText || "Loading"} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center py-12 px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">V</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-800 via-indigo-700 to-emerald-700 bg-clip-text text-transparent">
            Welcome to VidyaNXT
          </h2>
          <p className="text-slate-600 text-xl leading-relaxed mt-2">
            AI Teaching Intelligence Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-900 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-900 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Sign In
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              New to VidyaNXT?{" "}
              <Link
                to="/register"
                className="text-indigo-700 hover:text-indigo-800 font-medium transition-colors duration-300"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-indigo-50 to-emerald-50 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-slate-700">
              AI-Powered Teaching Platform
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
