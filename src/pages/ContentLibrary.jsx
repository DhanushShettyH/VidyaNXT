// src/pages/ContentLibrary.jsx
import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import ContentDetailView from "../components/ContentDetailView";
import DifferentiatedMaterialsLibrary from "../components/DifferentiatedMaterialsLibrary";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const ContentLibrary = () => {
	const [activeTab, setActiveTab] = useState("Vidya");
	const [content, setContent] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [filters, setFilters] = useState({
		subject: "",
		grades: [],
		language: "",
	});
	const [teacherData, setTeacherData] = useState(null);
	const navigate = useNavigate();

	const tabs = [
		{ id: "Vidya", label: "Content Creation", icon: "📝" },
		{ id: "worksheets", label: "Material Generator", icon: "📄" },
	];

	useEffect(() => {
		const storedTeacherData = JSON.parse(sessionStorage.getItem("teacherData"));
		console.log(storedTeacherData);
		setTeacherData(storedTeacherData);
	}, []);

	useEffect(() => {
		if (activeTab === "Vidya") {
			const searchContent = async () => {
				if (!teacherData?.id) return;

				setIsLoading(true);
				try {
					const searchContentLibrary = httpsCallable(
						functions,
						"searchContentLibrary"
					);
					console.log(teacherData);
					const result = await searchContentLibrary({
						teacherId: teacherData?.id,
						...filters,
					});

					if (result.data.success) {
						setContent(result.data.data);
					}
				} catch (error) {
					console.error("Error searching content:", error);
				} finally {
					setIsLoading(false);
				}
			};
			searchContent();
		}
	}, [teacherData, filters, activeTab]);

	const handleFilterChange = (filterType, value) => {
		setFilters((prev) => ({
			...prev,
			[filterType]: value,
		}));
	};

	const handleGradeToggle = (grade) => {
		setFilters((prev) => ({
			...prev,
			grades: prev.grades.includes(grade)
				? prev.grades.filter((g) => g !== grade)
				: [...prev.grades, grade],
		}));
	};

	// Navigate to content detail page instead of showing inline
	const handleSelectContent = (contentItem) => {
		navigate(`/content/${contentItem.id}`);
	};

	return (
		<>
			<Header Heading={"AI Contnet Library"} />

			<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 py-6 lg:py-10">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					{/* Tab Navigation matching the image */}
					<div className="flex space-x-2 bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-slate-200/50 shadow-lg mb-8 w-full">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`${activeTab === tab.id
									? activeTab === "Vidya"
										? "bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shadow-lg"
										: "bg-gradient-to-r from-emerald-600 to-emerald-800 text-white shadow-lg"
									: "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
									} px-4 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 flex-1 text-center`}
							>
								{tab.label}
							</button>
						))}
					</div>

					{/* Tab Content */}
					<div>
						{activeTab === "Vidya" && (
							<VidyaContentTab
								content={content}
								isLoading={isLoading}
								filters={filters}
								onFilterChange={handleFilterChange}
								onGradeToggle={handleGradeToggle}
								onSelectContent={handleSelectContent}
							/>
						)}

						{activeTab === "worksheets" && <DifferentiatedMaterialsLibrary />}
					</div>
				</div>
			</div>
		</>
	);
};

// Rest of your VidyaContentTab component remains the same...
const VidyaContentTab = ({
	content,
	isLoading,
	filters,
	onFilterChange,
	onGradeToggle,
	onSelectContent,
}) => {
	return (
		<div className="space-y-8">
			{/* Mobile-Responsive Filters */}
			<div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-6 shadow-sm">
				<h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
					{/* <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">🔍</span>
          </div> */}
					Filters
				</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					<div>
						<label className="block text-sm font-semibold text-slate-900 mb-2">
							Subject
						</label>
						<select
							value={filters.subject}
							onChange={(e) => onFilterChange("subject", e.target.value)}
							className="w-full p-3 border border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-medium text-slate-700 transition-all duration-300"
						>
							<option value="">All Subjects</option>
							<option value="science">Science</option>
							<option value="mathematics">Mathematics</option>
							<option value="language">Language</option>
							<option value="social_studies">Social Studies</option>
							<option value="computer_science">Computer Science</option>
							<option value="general">General</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-semibold text-slate-900 mb-2">
							Language
						</label>
						<select
							value={filters.language}
							onChange={(e) => onFilterChange("language", e.target.value)}
							className="w-full p-3 border border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm font-medium text-slate-700 transition-all duration-300"
						>
							<option value="">All Languages</option>
							<option value="english">English</option>
							<option value="hindi">Hindi</option>
							<option value="kannada">Kannada</option>
							<option value="marathi">Marathi</option>
							<option value="tamil">Tamil</option>
							<option value="telugu">Telugu</option>
							<option value="bengali">Bengali</option>
							<option value="gujarati">Gujarati</option>
						</select>
					</div>

					<div className="sm:col-span-2 lg:col-span-1">
						<label className="block text-sm font-semibold text-slate-900 mb-2">
							Grades
						</label>
						<div className="flex flex-wrap gap-2">
							{["1", "2", "3", "4", "5"].map((grade) => (
								<button
									key={grade}
									onClick={() => onGradeToggle(grade)}
									className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 ${filters.grades.includes(grade)
										? "bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-lg"
										: "bg-white/80 text-slate-700 hover:bg-slate-100 border border-slate-200"
										}`}
								>
									{grade}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Mobile-Responsive Content Grid */}
			{isLoading ? (
				<div className="flex justify-center items-center py-20">
					<div className="relative">
						<div className="animate-pulse w-16 h-16 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
							<span className="text-2xl text-white">🤖</span>
						</div>
						<div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{content.map((item, index) => {
						const grades = Object.keys(item.gradeVersions || {});
						return (
							<ContentCard
								key={index}
								item={item}
								grades={grades}
								onClick={() => onSelectContent(item)}
							/>
						);
					})}
				</div>
			)}

			{content.length === 0 && !isLoading && (
				<div className="text-center py-20">
					<div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
						<span className="text-4xl text-white">🤖</span>
					</div>
					<h3 className="text-xl font-bold text-slate-900 mb-3">
						No Vidya content found matching your filters.
					</h3>
					<p className="leading-relaxed text-slate-600 max-w-md mx-auto">
						Try adjusting your search criteria or create some content using
						Vidya to see it here!
					</p>
				</div>
			)}
		</div>
	);
};

// Your existing ContentCard component remains the same...
const ContentCard = ({ item, onClick, grades }) => {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-gray-200 transition-all duration-500 hover:-translate-y-1">
			{/* Header Section */}
			<div className="flex justify-between items-start mb-4">
				<div className="flex-1 pr-4">
					<h3 className="text-lg font-semibold text-gray-900 leading-tight mb-3 group-hover:text-indigo-600 transition-colors duration-300">
						{item.content?.story?.substring(0, 55) + "..." ||
							"Untitled Content"}
					</h3>

					{/* Subject and Language Tags */}
					<div className="flex items-center gap-2 mb-3">
						<span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium border border-gray-100">
							{item.subject || "General"}
						</span>
						<span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
							{item.language || "English"}
						</span>
					</div>
				</div>

				{/* Reliability Score */}
				<div className="flex-shrink-0">
					<div
						className={`px-3 py-1.5 rounded-full text-xs font-semibold ${(item.reliabilityScore || 0) > 0.8
							? "bg-emerald-100 text-emerald-700"
							: "bg-yellow-100 text-yellow-700"
							}`}
					>
						{Math.round((item.reliabilityScore || 0) * 100)}%
					</div>
				</div>
			</div>

			{/* Grades Section */}
			{grades && grades.length > 0 && (
				<div className="flex flex-wrap gap-1.5 mb-4">
					{grades.slice(0, 3).map((grade) => (
						<span
							key={grade}
							className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium"
						>
							{grade}
						</span>
					))}
					{grades.length > 3 && (
						<span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-500 rounded-md text-xs font-medium">
							+{grades.length - 3}
						</span>
					)}
				</div>
			)}

			{/* Meta Information */}
			<div className="text-xs text-gray-500 mb-6 space-y-1">
				<div className="flex items-center gap-1.5">
					<span className="w-3 h-3 text-gray-400">📍</span>
					<span>{item.location || "Not specified"}</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="w-3 h-3 text-gray-400">📅</span>
					<span>
						{new Date(item.createdAt || Date.now()).toLocaleDateString()}
					</span>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex gap-2">
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all duration-200"
				>
					{isExpanded ? "Less" : "Preview"}
				</button>
				<button
					onClick={onClick}
					className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-sm hover:shadow-md"
				>
					View Details
				</button>
			</div>

			{/* Expanded Content */}
			{isExpanded && (
				<div className="mt-6 pt-6 border-t border-gray-100 space-y-4 animate-in slide-in-from-top duration-300">
					{/* Story Preview */}
					<div className="bg-gradient-to-r from-indigo-50/50 to-emerald-50/50 rounded-xl p-4">
						<div className="flex items-center gap-2 mb-2">
							<div className="w-5 h-5 bg-indigo-100 rounded-lg flex items-center justify-center">
								<span className="text-indigo-600 text-xs">📖</span>
							</div>
							<h4 className="font-semibold text-gray-900 text-sm">
								Story Preview
							</h4>
						</div>
						<p className="text-sm text-gray-600 leading-relaxed">
							{item.content?.story?.substring(0, 180) + "..." ||
								"No story content available"}
						</p>
					</div>

					{/* Cultural Context */}
					{item.content?.culturalContext?.localReferences?.length > 0 && (
						<div className="bg-emerald-50/70 rounded-xl p-4">
							<div className="flex items-center gap-2 mb-2">
								<div className="w-5 h-5 bg-emerald-100 rounded-lg flex items-center justify-center">
									<span className="text-emerald-600 text-xs">🌍</span>
								</div>
								<h4 className="font-semibold text-gray-900 text-sm">
									Cultural Context
								</h4>
							</div>
							<p className="text-sm text-gray-600 leading-relaxed">
								{item.content.culturalContext.localReferences
									.slice(0, 3)
									.join(", ")}
								{item.content.culturalContext.localReferences.length > 3 &&
									"..."}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default ContentLibrary;
