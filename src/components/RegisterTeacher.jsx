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
			await new Promise(resolve => setTimeout(resolve, 800)); // Small delay for UX

			const token = await cred.user.getIdToken(true);
			console.log("Token:", token);

			// Step 3: Analyzing profile
			setLoadingText("Analyzing your teaching profile...");
			await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay for UX

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
			await new Promise(resolve => setTimeout(resolve, 500));

			setStatus({ type: "success", message: "Registration successful! Redirecting to login..." });

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
							className="block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
						/>
						<input
							name="password"
							type="password"
							placeholder="Password"
							value={form.password}
							onChange={handleChange}
							required
							className="block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
						/>
						<input
							name="displayName"
							type="text"
							placeholder="Full Name"
							value={form.displayName}
							onChange={handleChange}
							required
							className="block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
						/>
						<input
							name="grades"
							type="text"
							placeholder="Grades (comma-separated)"
							value={form.grades}
							onChange={handleChange}
							required
							className="block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
						/>
						<input
							name="location"
							type="text"
							placeholder="Location"
							value={form.location}
							onChange={handleChange}
							required
							className="block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
						/>
						<input
							name="experienceYears"
							type="number"
							placeholder="Years of Experience"
							value={form.experienceYears}
							onChange={handleChange}
							required
							className="block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
						/>

						{/* New optional expertise field */}
						<div>
							<input
								name="expertise"
								type="text"
								placeholder="Areas of Expertise (optional - comma-separated)"
								value={form.expertise}
								onChange={handleChange}
								className="block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
							/>
							<p className="text-xs text-gray-500 mt-1">
								e.g., Mathematics, Science, Creative Writing, Special Education
							</p>
						</div>
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
			{loading && <LoadingScreen loadingText={loadingText} title={"Creating Your Profile"} />}
		</>
	);
}