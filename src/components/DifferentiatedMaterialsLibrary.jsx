// src/components/DifferentiatedMaterialsLibrary.jsx
import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

const DifferentiatedMaterialsLibrary = () => {
	const [materials, setMaterials] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedMaterial, setSelectedMaterial] = useState(null);
	const [filters, setFilters] = useState({
		subject: "",
		grades: [],
		language: "",
	});
	const [teacherData, setTeacherData] = useState(null);

	useEffect(() => {
		const storedTeacherData = JSON.parse(sessionStorage.getItem("teacherData"));
		setTeacherData(storedTeacherData);
	}, []);

	useEffect(() => {
		const fetchMaterials = async () => {
			if (!teacherData?.id) return;

			setIsLoading(true);
			try {
				const getDifferentiatedMaterials = httpsCallable(
					functions,
					"getDifferentiatedMaterials"
				);

				const result = await getDifferentiatedMaterials({
					teacherId: teacherData.id,
					...filters,
				});

				if (result.data.success) {
					setMaterials(result.data.materials);
				}
			} catch (error) {
				console.error("Error fetching materials:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchMaterials();
	}, [teacherData, filters]);

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

	const downloadWorksheet = (materialId, grade, content) => {
		const element = document.createElement('a');
		const worksheetContent = `
GRADE ${grade.replace('grade', '')} WORKSHEET
Generated on: ${new Date().toLocaleDateString()}
Material ID: ${materialId}

==========================================

${content.content || 'No content available'}

${content.objectives?.length ? `
LEARNING OBJECTIVES:
${content.objectives.map((obj, idx) => `${idx + 1}. ${obj}`).join('\n')}
` : ''}

${content.activities?.length ? `
ACTIVITIES:
${content.activities.map((activity, idx) => `${idx + 1}. ${activity}`).join('\n')}
` : ''}

${content.vocabulary?.length ? `
KEY VOCABULARY:
${content.vocabulary.map((word, idx) => `${idx + 1}. ${word}`).join('\n')}
` : ''}

${content.assessmentQuestions?.length ? `
ASSESSMENT QUESTIONS:
${content.assessmentQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}
` : ''}
        `;

		const file = new Blob([worksheetContent], { type: 'text/plain' });
		element.href = URL.createObjectURL(file);
		element.download = `Grade_${grade.replace('grade', '')}_Worksheet_${materialId}.txt`;
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	};

	const downloadAllGrades = (material) => {
		Object.entries(material.versions || {}).forEach(([grade, content]) => {
			setTimeout(() => {
				downloadWorksheet(material.materialId, grade, content);
			}, 500 * Object.keys(material.versions).indexOf(grade));
		});
	};

	if (selectedMaterial) {
		return (
			<MaterialDetailView
				material={selectedMaterial}
				onBack={() => setSelectedMaterial(null)}
				onDownload={downloadWorksheet}
				onDownloadAll={downloadAllGrades}
			/>
		);
	}

	return (
		<div>
			{/* Filters Section */}
			<div className="mb-6 p-4 bg-gray-50 rounded-md">
				<h3 className="font-medium text-gray-700 mb-3">Filters</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Subject
						</label>
						<select
							value={filters.subject}
							onChange={(e) => handleFilterChange("subject", e.target.value)}
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
							onChange={(e) => handleFilterChange("language", e.target.value)}
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
									onClick={() => handleGradeToggle(grade)}
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

			{/* Materials Grid */}
			{isLoading ? (
				<div className="flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
					{materials.map((material) => (
						<MaterialCard
							key={material.materialId}
							material={material}
							onClick={() => setSelectedMaterial(material)}
							onDownload={downloadWorksheet}
							onDownloadAll={downloadAllGrades}
						/>
					))}
				</div>
			)}

			{materials.length === 0 && !isLoading && (
				<div className="text-center py-12">
					<div className="text-gray-500 mb-4">
						<svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<p>No differentiated materials found.</p>
						<p className="text-sm mt-2">Start creating some worksheets to see them here!</p>
					</div>
				</div>
			)}
		</div>
	);
};

// Material Card Component
const MaterialCard = ({ material, onClick, onDownload, onDownloadAll }) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const gradeCount = Object.keys(material.versions || {}).length;

	return (
		<div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
			<div className="flex justify-between items-start mb-3">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<span className="text-2xl">📚</span>
						<h3 className="font-medium text-gray-800 text-sm sm:text-base">
							{material.analysis?.subject || "General"} - {material.analysis?.topic || "Worksheet"}
						</h3>
					</div>
					<p className="text-xs sm:text-sm text-gray-500">
						{gradeCount} grade{gradeCount !== 1 ? 's' : ''} • {material.language || "English"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{material.hasImage && (
						<span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
							📷 Image
						</span>
					)}
					{material.hasContext && (
						<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
							📝 Context
						</span>
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-1 mb-3">
				{Object.keys(material.versions || {}).map((grade) => (
					<span
						key={grade}
						className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
					>
						{grade}
					</span>
				))}
			</div>

			<div className="text-xs sm:text-sm text-gray-600 mb-3 space-y-1">
				<p>📍 {material.location || "Not specified"}</p>
				<p>📅 {new Date(material.createdAt || Date.now()).toLocaleDateString()}</p>
				<p>🎯 Difficulty: Grade {material.analysis?.difficulty || "2"}</p>
			</div>

			<div className="flex gap-2 mb-3">
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

			<div className="flex gap-1">
				<button
					onClick={(e) => {
						e.stopPropagation();
						onDownloadAll(material);
					}}
					className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-xs hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					All Grades
				</button>
			</div>

			{isExpanded && (
				<div className="mt-4 pt-4 border-t border-gray-200">
					<div className="space-y-3">
						<div>
							<h4 className="font-medium text-gray-700 mb-1">Analysis</h4>
							<p className="text-sm text-gray-600">
								<span className="font-medium">Subject:</span> {material.analysis?.subject || "General"}<br />
								<span className="font-medium">Topic:</span> {material.analysis?.topic || "Not specified"}<br />
								<span className="font-medium">Key Terms:</span> {material.analysis?.keyTerms?.join(", ") || "None"}
							</p>
						</div>

						{material.commonObjectives?.length > 0 && (
							<div>
								<h4 className="font-medium text-gray-700 mb-1">Common Objectives</h4>
								<ul className="text-sm text-gray-600 list-disc list-inside">
									{material.commonObjectives.slice(0, 2).map((objective, idx) => (
										<li key={idx}>{objective}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

// Material Detail View Component
const MaterialDetailView = ({ material, onBack, onDownload, onDownloadAll }) => {
	return (
		<div className="max-w-6xl mx-auto">
			<div className="mb-6 flex items-center justify-between">
				<button
					onClick={onBack}
					className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
				>
					<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Back to Materials
				</button>
				<button
					onClick={() => onDownloadAll(material)}
					className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					Download All Worksheets
				</button>
			</div>

			<div className="bg-white rounded-lg shadow-lg p-6">
				<div className="border-b border-gray-200 pb-4 mb-6">
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
						📚 {material.analysis?.subject || "General"} - {material.analysis?.topic || "Worksheet"}
					</h1>
					<div className="flex flex-wrap gap-4 text-sm text-gray-600">
						<span>📍 {material.location}</span>
						<span>🗣️ {material.language}</span>
						<span>📅 {new Date(material.createdAt).toLocaleDateString()}</span>
						<span>🎯 Grade {material.analysis?.difficulty} Level</span>
					</div>
				</div>

				{/* Analysis Section */}
				{material.analysis && (
					<div className="mb-6 p-4 bg-blue-50 rounded-lg">
						<h3 className="font-semibold text-blue-800 mb-2">Content Analysis</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<span className="font-medium">Subject:</span> {material.analysis.subject}<br />
								<span className="font-medium">Topic:</span> {material.analysis.topic}<br />
								<span className="font-medium">Language:</span> {material.analysis.language}
							</div>
							<div>
								<span className="font-medium">Difficulty:</span> Grade {material.analysis.difficulty}<br />
								<span className="font-medium">Key Terms:</span> {material.analysis.keyTerms?.join(", ") || "None"}
							</div>
						</div>
					</div>
				)}

				{/* Common Objectives */}
				{material.commonObjectives?.length > 0 && (
					<div className="mb-6 p-4 bg-green-50 rounded-lg">
						<h3 className="font-semibold text-green-800 mb-2">Common Learning Objectives</h3>
						<ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
							{material.commonObjectives.map((objective, idx) => (
								<li key={idx}>{objective}</li>
							))}
						</ul>
					</div>
				)}

				{/* Grade-wise Materials */}
				<div className="space-y-6">
					<h3 className="text-xl font-bold text-gray-800">Grade-wise Worksheets</h3>
					{Object.entries(material.versions || {}).map(([grade, content]) => (
						<div key={grade} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
							<div className="flex justify-between items-center mb-4">
								<h4 className="text-lg font-semibold text-purple-600">
									{grade.charAt(0).toUpperCase() + grade.slice(1)} Worksheet
								</h4>
								<button
									onClick={() => onDownload(material.materialId, grade, content)}
									className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors flex items-center gap-2"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									Download
								</button>
							</div>

							<div className="space-y-4">
								{content.content && (
									<div className="bg-white p-4 rounded border">
										<h5 className="font-medium text-gray-700 mb-2">Content:</h5>
										<div className="text-gray-600 whitespace-pre-wrap">{content.content}</div>
									</div>
								)}

								{content.objectives?.length > 0 && (
									<div className="bg-white p-4 rounded border">
										<h5 className="font-medium text-gray-700 mb-2">Learning Objectives:</h5>
										<ul className="list-disc list-inside text-gray-600 space-y-1">
											{content.objectives.map((objective, idx) => (
												<li key={idx}>{objective}</li>
											))}
										</ul>
									</div>
								)}

								{content.activities?.length > 0 && (
									<div className="bg-white p-4 rounded border">
										<h5 className="font-medium text-gray-700 mb-2">Activities:</h5>
										<ul className="list-disc list-inside text-gray-600 space-y-1">
											{content.activities.map((activity, idx) => (
												<li key={idx}>{activity}</li>
											))}
										</ul>
									</div>
								)}

								{content.vocabulary?.length > 0 && (
									<div className="bg-white p-4 rounded border">
										<h5 className="font-medium text-gray-700 mb-2">Key Vocabulary:</h5>
										<div className="flex flex-wrap gap-2">
											{content.vocabulary.map((word, idx) => (
												<span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
													{word}
												</span>
											))}
										</div>
									</div>
								)}

								{content.assessmentQuestions?.length > 0 && (
									<div className="bg-white p-4 rounded border">
										<h5 className="font-medium text-gray-700 mb-2">Assessment Questions:</h5>
										<ol className="list-decimal list-inside text-gray-600 space-y-1">
											{content.assessmentQuestions.map((question, idx) => (
												<li key={idx}>{question}</li>
											))}
										</ol>
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default DifferentiatedMaterialsLibrary;
