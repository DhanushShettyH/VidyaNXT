// src/pages/ContentLibrary.jsx (Updated version)
import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import ContentDetailView from "../components/ContentDetailView";
import DifferentiatedMaterialsLibrary from "../components/DifferentiatedMaterialsLibrary";


const ContentLibrary = () => {
	const [activeTab, setActiveTab] = useState('Vidya');
	const [content, setContent] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedContent, setSelectedContent] = useState(null);
	const [filters, setFilters] = useState({
		subject: "",
		grades: [],
		language: "",
	});
	const [teacherData, setTeacherData] = useState(null);


	const tabs = [
		{ id: 'Vidya', label: '📝 Vidya Content', icon: '🤖' },
		{ id: 'worksheets', label: '📄 Worksheets', icon: '📚' }
	];


	useEffect(() => {
		const storedTeacherData = JSON.parse(sessionStorage.getItem("teacherData"));
		console.log(storedTeacherData);
		setTeacherData(storedTeacherData);
	}, []);


	useEffect(() => {
		if (activeTab === 'Vidya') {
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


	// Show detailed content view for Vidya content
	if (selectedContent && activeTab === 'Vidya') {
		return (
			<ContentDetailView
				content={selectedContent}
				onBack={() => setSelectedContent(null)}
			/>
		);
	}


	return (
		<div className="max-w-6xl mx-auto p-4 sm:p-6">
			<div className="bg-white rounded-lg shadow-lg">
				{/* Header */}
				<div className="p-4 sm:p-6 border-b border-gray-200">
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
						📚 Content Library
					</h1>
					<p className="text-sm sm:text-base text-gray-600">
						Browse and reuse your previously generated content and worksheets
					</p>
				</div>


				{/* Tab Navigation */}
				<div className="border-b border-gray-200">
					<nav className="-mb-px flex space-x-8 px-4 sm:px-6" aria-label="Tabs">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`${activeTab === tab.id
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
									} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
							>
								{/* <span className="text-lg">{tab.icon}</span> */}
								{tab.label}
							</button>
						))}
					</nav>
				</div>


				{/* Tab Content */}
				<div className="p-4 sm:p-6">
					{activeTab === 'Vidya' && (
						<VidyaContentTab
							content={content}
							isLoading={isLoading}
							filters={filters}
							onFilterChange={handleFilterChange}
							onGradeToggle={handleGradeToggle}
							onSelectContent={setSelectedContent}
						/>
					)}


					{activeTab === 'worksheets' && (
						<DifferentiatedMaterialsLibrary />
					)}
				</div>
			</div>
		</div>
	);
};


// Vidya Content Tab Component
const VidyaContentTab = ({
	content,
	isLoading,
	filters,
	onFilterChange,
	onGradeToggle,
	onSelectContent
}) => {
	return (
		<div>
			{/* Mobile-Responsive Filters */}
			<div className="mb-6 p-4 bg-gray-50 rounded-md">
				<h3 className="font-medium text-gray-700 mb-3">Filters</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Subject
						</label>
						<select
							value={filters.subject}
							onChange={(e) => onFilterChange("subject", e.target.value)}
							className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Language
						</label>
						<select
							value={filters.language}
							onChange={(e) => onFilterChange("language", e.target.value)}
							className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Grades
						</label>
						<div className="flex flex-wrap gap-2">
							{["1", "2", "3", "4", "5"].map((grade) => (
								<button
									key={grade}
									onClick={() => onGradeToggle(grade)}
									className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.grades.includes(grade)
										? "bg-blue-500 text-white"
										: "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
				<div className="flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
				<div className="text-center py-12">
					<div className="text-gray-500 mb-4">
						<span className="text-6xl mb-4 block">🤖</span>
						<p>No Vidya content found matching your filters.</p>
						<p className="text-sm mt-2">Create some content using Vidya to see it here!</p>
					</div>
				</div>
			)}
		</div>
	);
};


// Keep your existing ContentCard component unchanged
const ContentCard = ({ item, onClick, grades }) => {
	const [isExpanded, setIsExpanded] = useState(false);


	return (
		<div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
				<div className="flex-1 min-w-0">
					<h3 className="font-medium text-gray-800 text-sm sm:text-base break-words">
						{item.content?.story?.substring(0, 60) + "..." || "Untitled Content"}
					</h3>
					<p className="text-xs sm:text-sm text-gray-500 mt-1">
						{item.subject || "General"} • {item.language || "English"}
					</p>
				</div>
				<div className="flex items-center gap-2 flex-shrink-0">
					<div
						className={`px-2 py-1 rounded-full text-xs font-medium ${(item.reliabilityScore || 0) > 0.8
							? "bg-green-100 text-green-800"
							: "bg-yellow-100 text-yellow-800"
							}`}
					>
						{Math.round((item.reliabilityScore || 0) * 100)}%
					</div>
				</div>
			</div>


			<div className="flex flex-wrap gap-1 mb-3">
				{(grades || []).map((grade, index) => {
					return (
						<span
							key={grade}
							className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
						>
							{grade}
						</span>
					);
				})}
			</div>


			<div className="text-xs sm:text-sm text-gray-600 mb-3 space-y-1">
				<p className="break-words">📍 {item.location || "Not specified"}</p>
				<p>📅 {new Date(item.createdAt || Date.now()).toLocaleDateString()}</p>
			</div>


			<div className="flex gap-2">
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="text-blue-500 hover:text-blue-600 text-sm font-medium"
				>
					{isExpanded ? "Show Less" : "Preview"}
				</button>
				<button
					onClick={onClick}
					className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
				>
					View Full
				</button>
			</div>


			{isExpanded && (
				<div className="mt-4 pt-4 border-t border-gray-200">
					<div className="space-y-3">
						<div>
							<h4 className="font-medium text-gray-700 mb-1">Story Preview</h4>
							<p className="text-sm text-gray-600 break-words">
								{item.content?.story?.substring(0, 200) + "..." || "No story content"}
							</p>
						</div>


						{item.content?.culturalContext?.localReferences?.length > 0 && (
							<div>
								<h4 className="font-medium text-gray-700 mb-1">
									Cultural Context
								</h4>
								<p className="text-sm text-gray-600 break-words">
									{item.content.culturalContext.localReferences.join(", ")}
								</p>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};


export default ContentLibrary;

