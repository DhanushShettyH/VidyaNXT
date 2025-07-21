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
			await new Promise(resolve => setTimeout(resolve, 800)); // Small delay for UX

			const loginTeacher = httpsCallable(getFunctions(), "loginTeacher");
			const result = await loginTeacher({ uid });

			if (result.data.success) {
				// Step 3: Preparing dashboard
				setLoadingText("Preparing your dashboard...");
				await new Promise(resolve => setTimeout(resolve, 600)); // Small delay for UX

				const data = JSON.stringify(result.data.teacher);
				sessionStorage.setItem("teacherData", data);
        sessionStorage.setItem("displayName", result.data.teacher.displayName);

				// Final step
				setLoadingText("Welcome back!");
				await new Promise(resolve => setTimeout(resolve, 400));

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

	return (
		<>
			<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
				<form
					onSubmit={handleSubmit}
					className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg space-y-6"
				>
					<h2 className="text-2xl font-semibold text-gray-800 text-center">
						Teacher Login
					</h2>
					<p className="text-sm text-center text-gray-600">
						Login with your email and password
					</p>

					{error && (
						<div className="bg-red-100 text-red-800 p-3 rounded">{error}</div>
					)}

					<div className="space-y-4">
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700"
							>
								Email
							</label>
							<input
								id="email"
								name="email"
								type="email"
								value={form.email}
								onChange={handleChange}
								required
								className="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700"
							>
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								value={form.password}
								onChange={handleChange}
								required
								className="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className={`w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 ${loading
							? "bg-indigo-300 cursor-not-allowed"
							: "bg-indigo-600 hover:bg-indigo-700"
							}`}
					>
						{loading ? "Signing In..." : "Login"}
					</button>

					<p className="text-center text-sm text-gray-600">
						Don't have an account?{" "}
						<Link to="/register" className="text-indigo-600 hover:underline">
							Register here
						</Link>
					</p>
				</form>
			</div>

			{/* AI Loading Screen Overlay */}
			{loading && <LoadingScreen loadingText={loadingText} title={"Logging You In"} />}
		</>
	);
}