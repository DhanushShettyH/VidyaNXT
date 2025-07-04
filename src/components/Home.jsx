import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase'; // ✅ Make sure this import exists

export default function Home() {
	const [teacherData, setTeacherData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [unreadTotal, setUnreadTotal] = useState(0);

	const navigate = useNavigate();

	// ✅ Always run hooks at top-level, not conditionally
	useEffect(() => {
		const storedTeacherData = sessionStorage.getItem("teacherData");
		const displayName = sessionStorage.getItem("displayName");

		if (!auth.currentUser || !storedTeacherData || !displayName) {
			navigate("/login");
			return;
		}

		try {
			const parsedTeacherData = JSON.parse(storedTeacherData);
			setTeacherData(parsedTeacherData);
		} catch (error) {
			console.error("Error parsing teacher data:", error);
			navigate("/login");
		} finally {
			setLoading(false);
		}
	}, [navigate]);

	useEffect(() => {
		if (!teacherData) return;

		const q = query(
			collection(db, "conversations"),
			where("members", "array-contains", teacherData.id)
		);

		const unsub = onSnapshot(q, (snap) => {
			let total = 0;
			snap.forEach((doc) => {
				const data = doc.data();
				const count = data.unreadCounts?.[teacherData.id] || 0;
				total += count;
			});
			setUnreadTotal(total);
		});

		return () => unsub();
	}, [teacherData]);

	const handleLogout = async () => {
		try {
			await signOut(auth);
			sessionStorage.removeItem("teacherData");
			sessionStorage.removeItem("displayName");
			navigate("/login");
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	if (!teacherData) {
		return null;
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">VidyaNXT</h1>
							<p className="text-sm text-gray-600">Teacher Dashboard</p>
						</div>
						<button
							onClick={handleLogout}
							className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
						>
							Logout
						</button>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="px-4 py-6 sm:px-0">
					{/* Welcome Section */}
					<div className="bg-white overflow-hidden shadow rounded-lg mb-6">
						<div className="px-4 py-5 sm:p-6">
							<h2 className="text-2xl font-bold text-gray-900 mb-2">
								Welcome back, {teacherData.displayName}! 👋
							</h2>
							<p className="text-gray-600">
								Ready to inspire and educate your students today?
							</p>
						</div>
					</div>

					{/* Teacher Info Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						{[
							{
								title: "Grades Teaching",
								value: teacherData.grades?.join(", ") || "Not specified",
								icon: "📚",
								color: "bg-indigo-500"
							},
							{
								title: "Location",
								value: teacherData.location || "Not specified",
								icon: "📍",
								color: "bg-green-500"
							},
							{
								title: "Experience",
								value: `${teacherData.experienceYears} years`,
								icon: "⭐",
								color: "bg-yellow-500"
							},
							{
								title: "Member Since",
								value: teacherData.createdAt
									? new Date(teacherData.createdAt).toLocaleDateString()
									: "Recently",
								icon: "🎯",
								color: "bg-purple-500"
							}
						].map((card, idx) => (
							<div key={idx} className="bg-white overflow-hidden shadow rounded-lg">
								<div className="p-5">
									<div className="flex items-center">
										<div className="flex-shrink-0">
											<div className={`w-8 h-8 ${card.color} rounded-full flex items-center justify-center`}>
												<span className="text-white text-sm font-medium">{card.icon}</span>
											</div>
										</div>
										<div className="ml-5 w-0 flex-1">
											<dl>
												<dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
												<dd className="text-lg font-medium text-gray-900">{card.value}</dd>
											</dl>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Quick Actions */}
					<div className="bg-white shadow rounded-lg">
						<div className="px-4 py-5 sm:p-6">
							<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
								Quick Actions
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
								<Link
									to="/peer-advice"
									className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<div className="flex items-center">
										<span className="text-2xl mr-3">🤝</span>
										<div className="text-left">
											<div className="font-medium text-gray-900">Get Peer Advice</div>
											<div className="text-sm text-gray-500">Connect with other teachers</div>
										</div>
									</div>
								</Link>

								<Link
									to="/peers"
									className="relative flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
								>
									<span className="text-2xl mr-3">💬</span>
									<div>
										<div className="font-medium text-gray-900">Chat with Peers</div>
										<div className="text-sm text-gray-500">Your conversations</div>
									</div>

									{unreadTotal > 0 && (
										<span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
											{unreadTotal}
										</span>
									)}
								</Link>

								<button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
									<span className="text-2xl mr-3">📊</span>
									<div className="text-left">
										<div className="font-medium text-gray-900">View Reports</div>
										<div className="text-sm text-gray-500">Check student progress</div>
									</div>
								</button>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
