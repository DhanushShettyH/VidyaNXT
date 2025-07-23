import React, { useState } from "react";
import { auth, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";

export default function RegisterTeacher() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    grades: "",
    location: "",
    experienceYears: "",
    expertise: "", // New optional field
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingText, setLoadingText] = useState("");

  // Listen to auth state
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      }
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      // Step 1: Creating account
      setLoadingText("Setting up your account...");
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      console.log("User registered:", cred.user.uid);
      setCurrentUser(cred.user);

      // Step 2: Generating token
      setLoadingText("Generating secure credentials...");
      await new Promise((resolve) => setTimeout(resolve, 800)); // Small delay for UX
      const token = await cred.user.getIdToken(true);
      console.log("Token:", token);

      // Step 3: Analyzing profile
      setLoadingText("Analyzing your teaching profile...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Small delay for UX

      // Step 4: Finalizing registration
      setLoadingText("Finalizing your registration...");
      const register = httpsCallable(functions, "registerTeacher");
      const registerData = {
        displayName: form.displayName,
        grades: form.grades.split(",").map((g) => g.trim()),
        location: form.location,
        experienceYears: Number(form.experienceYears),
      };

      // Add expertise only if provided
      if (form.expertise.trim()) {
        registerData.expertise = form.expertise.split(",").map((e) => e.trim());
      }

      const result = await register(registerData);
      console.log("Function result:", result.data);

      // Final step
      setLoadingText("Welcome to the platform!");
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStatus({
        type: "success",
        message: "Registration successful! Redirecting to login...",
      });

      // Clear form
      setForm({
        email: "",
        password: "",
        displayName: "",
        grades: "",
        location: "",
        experienceYears: "",
        expertise: "",
      });

      // Redirect to login page after a brief delay
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Error:", err);
      setStatus({
        type: "error",
        message: err.message || "Registration failed",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen title={loadingText || "Loading"} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center py-12 px-6 lg:px-8">
      <div className="max-w-2xl w-full">
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
            Join VidyaNXT
          </h2>
          <p className="text-slate-600 text-xl leading-relaxed mt-2">
            Transform education with AI-powered teaching intelligence
          </p>
        </div>

        {/* Registration Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Row 1: Name and Email */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-slate-900 mb-2"
                >
                  Full Name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={form.displayName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500"
                  placeholder="Enter your full name"
                />
              </div>
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
            </div>

            {/* Row 2: Password */}
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
                placeholder="Create a secure password"
              />
            </div>

            {/* Row 3: Grades and Location */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="grades"
                    className="block text-sm font-medium text-slate-900 mb-2"
                  >
                    Grades Taught
                  </label>
                  <input
                    id="grades"
                    name="grades"
                    type="text"
                    required
                    value={form.grades}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500"
                    placeholder="e.g., 1, 2, 3"
                  />
                  {/* <p className="text-xs text-slate-500 mt-1">
                    Separate multiple grades with commas
                  </p> */}
                </div>
                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-slate-900 mb-2"
                  >
                    Location
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    required
                    value={form.location}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500"
                    placeholder="City, State"
                  />
                </div>
              </div>

              {/* Row 4: Experience and Expertise */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="experienceYears"
                    className="block text-sm font-medium text-slate-900 mb-2"
                  >
                    Years of Experience
                  </label>
                  <input
                    id="experienceYears"
                    name="experienceYears"
                    type="number"
                    required
                    value={form.experienceYears}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500"
                    placeholder="Years teaching"
                    min="0"
                  />
                </div>
                <div>
                  <label
                    htmlFor="expertise"
                    className="block text-sm font-medium text-slate-900 mb-2"
                  >
                    Expertise
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="expertise"
                    name="expertise"
                    type="text"
                    value={form.expertise}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500"
                    placeholder="e.g., Math, Science, English"
                  />
                  {/* <p className="text-xs text-slate-500 mt-1">
                    Separate multiple subjects with commas
                  </p> */}
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {status && (
              <div
                className={`rounded-xl p-4 ${
                  status.type === "success"
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <p
                  className={`text-sm ${
                    status.type === "success"
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {status.message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Create Account
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-indigo-700 hover:text-indigo-800 font-medium transition-colors duration-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-indigo-50 to-emerald-50 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-slate-700">
              Join India's distributed teaching intelligence network
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
