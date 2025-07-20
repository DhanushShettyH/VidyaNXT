import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import LoadingScreen from "../components/LoadingScreen";


const ContentHub = () => {
	const [request, setRequest] = useState("");
	const [selectedGrades, setSelectedGrades] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [content, setContent] = useState(null);
	const [error, setError] = useState(null);
	const [teacherData, setTeacherData] = useState(null);
	const [loadingText, setLoadingText] = useState("");

	useEffect(() => {
		const storedTeacherData = JSON.parse(sessionStorage.getItem("teacherData"));
		console.log("Stored teacher data:", storedTeacherData);
		setTeacherData(storedTeacherData);

		if (storedTeacherData?.grades) {
			setSelectedGrades(storedTeacherData.grades);
		}
	}, []);

	const handleCreateContent = async () => {
		if (!request.trim()) {
			setError("Please enter a content request");
			return;
		}
		if (selectedGrades.length === 0) {
			setError("Please select at least one grade");
			return;
		}

		setIsLoading(true);
		setError(null);

		// Array of loading messages to cycle through
		const loadingMessages = [
			"Analyzing your content request...",
			"Processing grade-specific requirements...",
			"Localizing content for your region...",
			"Generating AI content and visual aids...",
			"Creating differentiated materials...",
			"Adding cultural context...",
			"Finalizing educational content..."
		];

		let messageIndex = 0;
		setLoadingText(loadingMessages[0]);

		// Cycle through loading messages every 2 seconds
		const messageInterval = setInterval(() => {
			messageIndex = (messageIndex + 1) % loadingMessages.length;
			setLoadingText(loadingMessages[messageIndex]);
		}, 20000);

		try {
			const createSahayakContent = httpsCallable(
				functions,
				"createSahayakContent",
				{
					timeout: 300000,
				}
			);

			const result = await createSahayakContent({
				teacherId: teacherData.id,
				contentRequest: request,
				grades: selectedGrades,
			});

			// Clear the interval immediately when response comes
			clearInterval(messageInterval);

			console.log("Result from backend:", result.data);

			if (result.data.success) {
				setContent(result.data.data);
				console.log("Content set:", result.data.data);
			} else {
				setError("Failed to create content");
			}
		} catch (error) {
			// Clear interval on error too
			clearInterval(messageInterval);

			console.error("Error creating content:", error);

			if (error.code === 'deadline-exceeded') {
				setError("Content generation is taking longer than expected. Please try again.");
			} else if (error.code === 'unavailable') {
				setError("Service temporarily unavailable. Please try again in a moment.");
			} else {
				setError("Failed to create content. Please try again.");
			}
		} finally {
			setIsLoading(false);
		}
	};


	const handleGradeToggle = (grade) => {
		setSelectedGrades((prev) =>
			prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
		);
	};

	return (
		<>
			{/* Loading Screen Overlay */}
			{isLoading && (
				<LoadingScreen
					title="Creating AI Content"
					loadingText={loadingText}
				/>
			)}

			<div className="max-w-4xl mx-auto p-4 sm:p-6">
				<div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
						🎓 VidyaNXT AI Assistant
					</h1>
					<p className="text-sm sm:text-base text-gray-600 mb-6">
						Create localized, differentiated content for your multi-grade classroom
					</p>

					{/* Content Request Input */}
					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Content Request
						</label>
						<textarea
							value={request}
							onChange={(e) => setRequest(e.target.value)}
							placeholder="Example: Create a story about soil types for farming, or Explain the water cycle with local examples"
							className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
							rows="4"
						/>
					</div>

					{/* Grade Selection */}
					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Select Grades
						</label>
						<div className="flex flex-wrap gap-2">
							{["1", "2", "3", "4", "5"].map((grade) => (
								<button
									key={grade}
									onClick={() => handleGradeToggle(grade)}
									className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${selectedGrades.includes(grade)
										? "bg-blue-500 text-white"
										: "bg-gray-200 text-gray-700 hover:bg-gray-300"
										}`}
								>
									Grade {grade}
								</button>
							))}
						</div>
					</div>

					{/* Teacher Location Info */}
					{teacherData && (
						<div className="mb-6 p-4 bg-blue-50 rounded-md">
							<p className="text-sm text-blue-800">
								<strong>Location:</strong> {teacherData?.location}
							</p>
							<p className="text-sm text-blue-600 mt-1">
								Content will be localized for your region with cultural context
								and local language support.
							</p>
						</div>
					)}

					{/* Error Message */}
					{error && (
						<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
							<p className="text-red-800 text-sm sm:text-base">{error}</p>
						</div>
					)}

					{/* Create Button */}
					<button
						onClick={handleCreateContent}
						disabled={isLoading}
						className="w-full bg-blue-500 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
					>
						Create Localized Content
					</button>

					{/* Content Display */}
					{content && (
						<ContentDisplay
							content={content}
							reliabilityScore={content.reliabilityScore}
							wasRevised={content.wasRevised}
						/>
					)}
				</div>
			</div>
		</>
	);
};

// Content Display Component with Mobile Responsiveness
const ContentDisplay = ({ content, reliabilityScore, wasRevised }) => {
	const [activeTab, setActiveTab] = useState("story");

	return (
		<div className="mt-6 sm:mt-8 bg-gray-50 rounded-lg p-4 sm:p-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
				<h2 className="text-xl sm:text-2xl font-bold text-gray-800">Generated Content</h2>
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
					<div className="flex items-center">
						<span className="text-xs sm:text-sm text-gray-600 mr-2">
							Reliability Score:
						</span>
						<div
							className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${reliabilityScore > 0.8
								? "bg-green-100 text-green-800"
								: "bg-yellow-100 text-yellow-800"
								}`}
						>
							{Math.round(reliabilityScore * 100)}%
						</div>
					</div>
					{wasRevised && (
						<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
							Revised
						</span>
					)}
				</div>
			</div>

			{/* Mobile-Responsive Tab Navigation */}
			<div className="overflow-x-auto">
				<div className="flex border-b border-gray-200 mb-4 min-w-max sm:min-w-0">
					{[
						{ id: "story", label: "Story", icon: "📚", shortLabel: "Story" },
						{ id: "grades", label: "Grade Versions", icon: "📊", shortLabel: "Grades" },
						{ id: "visual", label: "Visual Aids", icon: "🎨", shortLabel: "Visual" },
						{ id: "tips", label: "Teaching Tips", icon: "💡", shortLabel: "Tips" },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
								? "border-blue-500 text-blue-600"
								: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
						>
							<span>{tab.icon}</span>
							<span className="sm:hidden">{tab.shortLabel}</span>
							<span className="hidden sm:inline">{tab.label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			{activeTab === "story" && (
				<div>
					<h3 className="text-lg font-semibold mb-3">Main Story</h3>
					<div className="bg-white p-4 rounded-md border">
						<p className="text-gray-800 leading-relaxed text-sm sm:text-base">
							{content.content.story}
						</p>
					</div>

					{content.content.culturalContext && (
						<div className="mt-4">
							<h4 className="font-medium text-gray-700 mb-2">
								Cultural Context
							</h4>
							<div className="bg-blue-50 p-3 rounded-md">
								<p className="text-sm text-blue-800">
									<strong>Local References:</strong>{" "}
									{content.content.culturalContext.localReferences?.join(", ")}
								</p>
							</div>
						</div>
					)}
				</div>
			)}

			{activeTab === "grades" && (
				<div>
					<h3 className="text-lg font-semibold mb-3">
						Grade-Specific Versions
					</h3>
					<div className="space-y-4">
						{Object.entries(content.content.gradeVersions).map(
							([grade, version]) => (
								<div key={grade} className="bg-white p-4 rounded-md border">
									<h4 className="font-medium text-gray-700 mb-2 capitalize">
										{grade.replace("grade", "Grade ")}
									</h4>
									<p className="text-gray-800 mb-3 text-sm sm:text-base">{version.content}</p>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<h5 className="font-medium text-gray-600 mb-1">
												Learning Objectives
											</h5>
											<ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
												{version.objectives?.map((obj, index) => (
													<li key={index}>{obj}</li>
												))}
											</ul>
										</div>
										<div>
											<h5 className="font-medium text-gray-600 mb-1">
												Key Vocabulary
											</h5>
											<div className="flex flex-wrap gap-2">
												{version.vocabulary?.map((word, index) => (
													<span
														key={index}
														className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
													>
														{word}
													</span>
												))}
											</div>
										</div>
									</div>
								</div>
							)
						)}
					</div>
				</div>
			)}

			{activeTab === "visual" && (
				<div>
					<h3 className="text-lg font-semibold mb-3">Visual Aids</h3>
					<div className="space-y-6">
						{content.content.visualAids?.aids?.length > 0 ? (
							content.content.visualAids.aids?.map((aid, index) => (
								<VisualAidCard key={index} aid={aid} />
							))
						) : (
							<div className="bg-white p-6 rounded-md border">
								<p className="text-gray-500 text-center">
									No visual aids generated. Please try again.
								</p>
							</div>
						)}
					</div>
				</div>
			)}

			{activeTab === "tips" && (
				<div>
					<h3 className="text-lg font-semibold mb-3">Teaching Tips</h3>
					<div className="bg-white p-4 rounded-md border">
						<ul className="space-y-2">
							{content.content.teachingTips?.map((tip, index) => (
								<li key={index} className="flex items-start gap-2">
									<span className="text-blue-500 mt-1 flex-shrink-0">💡</span>
									<span className="text-gray-800 text-sm sm:text-base">{tip}</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			)}
		</div>
	);
};

// Enhanced Mobile-Responsive Visual Aid Card Component
const VisualAidCard = ({ aid }) => {
	const [showFullscreen, setShowFullscreen] = useState(false);
	const [imageError, setImageError] = useState(false);

	const cleanSvgCode = (svgString) => {
		if (!svgString || typeof svgString !== "string") {
			return "";
		}
		const cleanedSvg = svgString.replace(
			/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
			""
		);
		if (!cleanedSvg.includes("<svg")) {
			return "";
		}
		return cleanedSvg;
	};

	const svgCode = cleanSvgCode(aid.svgCode);
	const hasImage = aid.imageUrl && !imageError;
	const hasSvg = svgCode;

	return (
		<div className="bg-white p-4 sm:p-6 rounded-md border">
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2">
				<div className="flex-1">
					<h4 className="font-medium text-gray-700 text-base sm:text-lg">{aid.title}</h4>
					<p className="text-gray-600 mt-1 text-sm sm:text-base">{aid.description}</p>
					{aid.type === "image" && (
						<span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
							Generated with AI
						</span>
					)}
				</div>
				{(hasImage || hasSvg) && (
					<button
						onClick={() => setShowFullscreen(true)}
						className="text-blue-500 hover:text-blue-600 text-sm font-medium self-start sm:self-auto"
					>
						View Fullscreen
					</button>
				)}
			</div>

			{/* Image/SVG Display */}
			{hasImage ? (
				<div className="mb-4">
					<div className="border border-gray-200 rounded-md p-2 sm:p-4 bg-gray-50">
						<img
							src={aid.imageUrl}
							alt={aid.title}
							className="w-full h-auto max-h-64 sm:max-h-96 object-contain mx-auto"
							onError={() => setImageError(true)}
							style={{ minHeight: "200px" }}
						/>
					</div>
				</div>
			) : hasSvg ? (
				<div className="mb-4">
					<div
						className="border border-gray-200 rounded-md p-2 sm:p-4 bg-gray-50 svg-container overflow-x-auto"
						dangerouslySetInnerHTML={{ __html: svgCode }}
						style={{ minHeight: "200px" }}
					/>
				</div>
			) : (
				<div className="mb-4">
					<div className="border border-gray-200 rounded-md p-4 bg-gray-50">
						<div className="text-center py-8">
							<p className="text-gray-500 mb-2">Visual content not available</p>
							<p className="text-sm text-gray-400">
								Please try generating content again
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Teaching Points */}
			{aid.teachingPoints && aid.teachingPoints.length > 0 && (
				<div className="mb-4">
					<h5 className="font-medium text-gray-600 mb-2">Teaching Points</h5>
					<ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
						{aid.teachingPoints.map((point, i) => (
							<li key={i}>{point}</li>
						))}
					</ul>
				</div>
			)}

			{/* Mobile-Responsive Fullscreen Modal */}
			{showFullscreen && (hasImage || hasSvg) && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg max-w-5xl max-h-[90vh] w-full overflow-auto">
						<div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
							<h3 className="text-base sm:text-lg font-semibold truncate pr-4">{aid.title}</h3>
							<button
								onClick={() => setShowFullscreen(false)}
								className="text-gray-500 hover:text-gray-700 text-xl flex-shrink-0"
							>
								✕
							</button>
						</div>
						<div className="p-4 sm:p-6">
							{hasImage ? (
								<img
									src={aid.imageUrl}
									alt={aid.title}
									className="w-full h-auto max-h-[70vh] object-contain mx-auto"
								/>
							) : (
								<div
									className="w-full svg-container overflow-x-auto"
									dangerouslySetInnerHTML={{ __html: svgCode }}
									style={{ minHeight: "300px" }}
								/>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ContentHub;
