import React, { useState } from "react";
import { auth, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import {
	createUserWithEmailAndPassword,
	onAuthStateChanged,
} from "firebase/auth";
import { Link } from "react-router-dom";

// AI Loading Component
const AILoadingScreen = ({ loadingText }) => {
	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
				{/* Animated AI Brain */}
				<div className="relative w-20 h-20 mx-auto mb-6">
					<div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-indigo-600 animate-pulse"></div>
					<div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
						<div className="w-8 h-8 relative">
							{/* Animated dots representing neural network */}
							<div
								className="absolute w-2 h-2 bg-purple-600 rounded-full animate-bounce"
								style={{ top: '0px', left: '12px' }}
							></div>
							<div
								className="absolute w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
								style={{ top: '12px', left: '0px', animationDelay: '0.1s' }}
							></div>
							<div
								className="absolute w-2 h-2 bg-purple-600 rounded-full animate-bounce"
								style={{ top: '12px', left: '24px', animationDelay: '0.2s' }}
							></div>
							<div
								className="absolute w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
								style={{ top: '24px', left: '12px', animationDelay: '0.3s' }}
							></div>
							{/* Connecting lines */}
							<div
								className="absolute w-0.5 h-3 bg-purple-300 rotate-45"
								style={{ top: '8px', left: '7px' }}
							></div>
							<div
								className="absolute w-0.5 h-3 bg-purple-300 -rotate-45"
								style={{ top: '8px', left: '20px' }}
							></div>
							<div
								className="absolute w-0.5 h-3 bg-purple-300 rotate-45"
								style={{ top: '13px', left: '7px' }}
							></div>
							<div
								className="absolute w-0.5 h-3 bg-purple-300 -rotate-45"
								style={{ top: '13px', left: '20px' }}
							></div>
						</div>
					</div>
				</div>

				{/* Loading Text */}
				<h3 className="text-xl font-semibold text-gray-800 mb-3">
					Creating Your Profile
				</h3>
				<p className="text-gray-600 mb-4">
					{loadingText}
				</p>

				{/* Progress dots */}
				<div className="flex justify-center space-x-2">
					<div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
					<div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
					<div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
				</div>
			</div>
		</div>
	);
};

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
			await new Promise(resolve => setTimeout(resolve, 800)); // Small delay for UX

			const token = await cred.user.getIdToken(true);
			console.log("Token:", token);

			// Step 3: Analyzing profile
			setLoadingText("Analyzing your teaching profile...");
			await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay for UX

			// Step 4: Finalizing registration
			setLoadingText("Finalizing your registration...");

			const register = httpsCallable(functions, "registerTeacher");
			const result = await register({
				displayName: form.displayName,
				grades: form.grades.split(",").map((g) => g.trim()),
				location: form.location,
				experienceYears: Number(form.experienceYears),
			});

			console.log("Function result:", result.data);

			// Final step
			setLoadingText("Welcome to the platform!");
			await new Promise(resolve => setTimeout(resolve, 500));

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
		<>
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
							className={`p-3 rounded ${status.type === "success"
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
						className={`w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 ${loading ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"
							}`}
					>
						{loading ? "Creating Profile..." : "Register"}
					</button>

					<p className="text-center text-sm text-gray-600">
						Already have an account?{" "}
						<Link to="/login" className="text-indigo-600 hover:underline">
							Sign in
						</Link>
					</p>
				</form>
			</div>

			{/* AI Loading Screen Overlay */}
			{loading && <AILoadingScreen loadingText={loadingText} />}
		</>
	);
}