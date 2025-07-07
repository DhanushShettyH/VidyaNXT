import React, { useState } from "react";
import { auth, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { Link } from "react-router-dom";

export default function RegisterTeacher() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    grades: "",
    location: "",
    experienceYears: "",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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
      // Create user
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      console.log("User registered:", cred.user.uid);
      setCurrentUser(cred.user);

      // Optional: force token refresh
      const token = await cred.user.getIdToken(true);
      console.log("Token:", token);

      // Call Cloud Function
      const register = httpsCallable(functions, "registerTeacher");
      const result = await register({
        displayName: form.displayName,
        grades: form.grades.split(",").map((g) => g.trim()),
        location: form.location,
        experienceYears: Number(form.experienceYears),
      });

      console.log("Function result:", result.data);
      setStatus({ type: "success", message: "Registration successful!" });
      setForm({
        email: "",
        password: "",
        displayName: "",
        grades: "",
        location: "",
        experienceYears: "",
      });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg space-y-6"
      >
        <h2 className="text-2xl font-semibold text-gray-800 text-center">
          Teacher Registration
        </h2>

        {status && (
          <div
            className={`p-3 rounded ${
              status.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border rounded-md"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border rounded-md"
          />
          <input
            name="displayName"
            type="text"
            placeholder="Full Name"
            value={form.displayName}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border rounded-md"
          />
          <input
            name="grades"
            type="text"
            placeholder="Grades (comma-separated)"
            value={form.grades}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border rounded-md"
          />
          <input
            name="location"
            type="text"
            placeholder="Location"
            value={form.location}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border rounded-md"
          />
          <input
            name="experienceYears"
            type="number"
            placeholder="Years of Experience"
            value={form.experienceYears}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border rounded-md"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            loading ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Registering…" : "Register"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
