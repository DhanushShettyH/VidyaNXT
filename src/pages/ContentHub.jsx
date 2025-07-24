import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import MaterialGenerator from "./MaterialGenerator";
import Header from "../components/Header";

const ContentHub = () => {
	// Add activeMainTab state for switching between content creation and material generator
	const [activeMainTab, setActiveMainTab] = useState("content");
	const [request, setRequest] = useState("");
	const [selectedGrades, setSelectedGrades] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [content, setContent] = useState(null);
	const [error, setError] = useState(null);
	const [teacherData, setTeacherData] = useState(null);
	const [loadingText, setLoadingText] = useState("");
	const [modalImageUrl, setModalImageUrl] = useState(null);
	const [modalImageTitle, setModalImageTitle] = useState("");

	// ADD MISSING STATE FOR CONTENT TABS
	const [activeTab, setActiveTab] = useState("story");

	const navigate = useNavigate();

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
			"Finalizing educational content?...",
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
				setContent(result.data.data); // Access content directly
				console.log("Content set:", result.data.data.content);
			} else {
				setError("Failed to create content");
			}
		} catch (error) {
			// Clear interval on error too
			clearInterval(messageInterval);
			console.error("Error creating content:", error);
			if (error.code === "deadline-exceeded") {
				setError(
					"Content generation is taking longer than expected. Please try again."
				);
			} else if (error.code === "unavailable") {
				setError(
					"Service temporarily unavailable. Please try again in a moment."
				);
			} else {
				setError("Failed to create content?. Please try again.");
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

	// !Function to open image modal
	const openImageModal = (imageUrl, title) => {
		setModalImageUrl(imageUrl);
		setModalImageTitle(title || "Visual Aid");
	};

	// Function to close modal
	const closeImageModal = () => {
		setModalImageUrl(null);
		setModalImageTitle("");
	};

	// Handle escape key to close modal
	useEffect(() => {
		const handleEscape = (event) => {
			if (event.key === "Escape") {
				closeImageModal();
			}
		};

		if (modalImageUrl) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden"; // Prevent background scroll
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [modalImageUrl]);

	return (
		<>
			{/* Loading Screen Overlay */}
			{isLoading && <LoadingScreen title={loadingText || "Loading"} />}

			<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
				{/* Header */}
				<Header Heading={"AI Contnet Studio"} />

				{/* Main Content */}
				<main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
					{/* Teacher Info Card */}

					{/* Main Tab Navigation */}
					<div className="flex space-x-2 mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-slate-200/50 shadow-lg">
						<button
							onClick={() => setActiveMainTab("content")}
							className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${activeMainTab === "content"
								? "bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shadow-lg"
								: "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
								}`}
						>
							Content Creation
						</button>
						<button
							onClick={() => setActiveMainTab("material")}
							className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${activeMainTab === "material"
								? "bg-gradient-to-r from-emerald-600 to-emerald-800 text-white shadow-lg"
								: "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
								}`}
						>
							Material Generator
						</button>
					</div>

					{/* Content Creation Tab */}
					{activeMainTab === "content" && (
						<div className="space-y-8">
							{/* Input Section */}
							<div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-lg">
								<h3 className="text-xl font-bold text-slate-900 mb-6">
									Create Educational Content
								</h3>

								{/* Content Request Input */}
								<div className="mb-6">
									<label className="block text-sm font-medium text-slate-900 mb-2">
										What content would you like to create?
									</label>
									<textarea
										value={request}
										onChange={(e) => setRequest(e.target.value)}
										placeholder="Example: Create a story about soil types for farming, or Explain the water cycle with local examples"
										className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all duration-300 bg-white/90 backdrop-blur-sm text-slate-900 placeholder-slate-500 min-h-[120px] resize-y"
									/>
								</div>

								{/* Grade Selection */}
								<div className="mb-6">
									<label className="block text-sm font-medium text-slate-900 mb-3">
										Select Grades
									</label>
									<div className="flex flex-wrap gap-2">
										{["1", "2", "3", "4", "5"].map((grade) => {
											return (
												<button
													key={grade}
													onClick={() => handleGradeToggle(grade)}
													className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${selectedGrades.includes(grade)
														? "bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shadow-lg"
														: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
														}`}
												>
													Grade {grade}
												</button>
											);
										})}
									</div>
								</div>

								{/* Error Message */}
								{error && (
									<div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
										<p className="text-sm text-red-600">{error}</p>
									</div>
								)}

								{/* Generate Button */}
								<button
									onClick={handleCreateContent}
									disabled={isLoading}
									className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
								>
									{isLoading ? "Generating content?..." : "Generate Content"}
								</button>
							</div>

							{teacherData && (
								<div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-lg mb-8">
									<div className="flex items-center justify-between">
										<div>
											{/* <h2 className="text-xl font-bold text-slate-900">
												Welcome, {teacherData.displayName}
											</h2> */}
											<p className="text-slate-600 leading-relaxed">
												<strong>Location:</strong> {teacherData?.location}
											</p>
											<p className="text-sm text-slate-500 mt-2">
												Content will be localized for your region with cultural
												context and local language support.
											</p>
										</div>
										<div className="hidden lg:block">
											<div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
												<span className="text-white font-bold text-xl">AI</span>
											</div>
										</div>
									</div>
								</div>
							)}

							{/* Generated Content Display WITH FULL TAB SYSTEM */}
							{content && (
								<div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-lg">
									<h3 className="text-xl font-bold text-slate-900 mb-6">
										Generated Content
									</h3>

									{/* CONTENT TAB NAVIGATION - RESTORED */}
									<div className="flex space-x-2 mb-6 rounded-xl p-2 border overflow-auto">
										<button
											onClick={() => setActiveTab("story")}
											className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${activeTab === "story"
												? "bg-white text-indigo-700 shadow-lg"
												: "text-slate-600 hover:text-slate-900 hover:bg-white/50"
												}`}
										>
											Story
										</button>
										<button
											onClick={() => setActiveTab("grades")}
											className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${activeTab === "grades"
												? "bg-white text-indigo-700 shadow-lg"
												: "text-slate-600 hover:text-slate-900 hover:bg-white/50"
												}`}
										>
											Grades
										</button>
										<button
											onClick={() => setActiveTab("visual")}
											className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${activeTab === "visual"
												? "bg-white text-indigo-700 shadow-lg"
												: "text-slate-600 hover:text-slate-900 hover:bg-white/50"
												}`}
										>
											Visual
										</button>
										<button
											onClick={() => setActiveTab("tips")}
											className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${activeTab === "tips"
												? "bg-white text-indigo-700 shadow-lg"
												: "text-slate-600 hover:text-slate-900 hover:bg-white/50"
												}`}
										>
											Tips
										</button>
									</div>

									{/* STORY TAB CONTENT */}
									{activeTab === "story" && content?.content && (
										<div className="mb-8">
											<div className=" rounded-xl p-6 border ">
												<div className="prose max-w-none">
													<div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
														{content?.content?.story}
													</div>
												</div>
											</div>

											{/* Cultural Context */}
											{content?.content?.culturalContext && (
												<div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
													<p className="text-sm font-medium text-emerald-700">
														<strong>Local References:</strong>{" "}
														{content?.content?.culturalContext.localReferences?.join(
															", "
														)}
													</p>
												</div>
											)}
										</div>
									)}

									{/* GRADES TAB CONTENT */}
									{activeTab === "grades" &&
										content?.content?.gradeVersions && (
											<div className="space-y-6">
												<h4 className="text-lg font-bold text-slate-900">
													Grade-wise Adaptations
												</h4>
												{Object.entries(content?.content?.gradeVersions).map(
													([grade, versionData], index) => (
														<div
															key={index}
															className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
														>
															<h5 className="text-md font-semibold text-indigo-700 mb-3">
																Grade {grade.replace("grade", "")}
															</h5>
															<div className="text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">
																{versionData.content}
															</div>

															{/* Learning Objectives */}
															{versionData.objectives && (
																<div className="mb-4">
																	<h6 className="text-sm font-semibold text-slate-800 mb-2">
																		Learning Objectives:
																	</h6>
																	<ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
																		{versionData.objectives.map(
																			(objective, idx) => (
																				<li key={idx}>{objective}</li>
																			)
																		)}
																	</ul>
																</div>
															)}

															{/* Activities */}
															{versionData.activities && (
																<div className="mb-4">
																	<h6 className="text-sm font-semibold text-slate-800 mb-2">
																		Suggested Activities:
																	</h6>
																	<ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
																		{versionData.activities.map(
																			(activity, idx) => (
																				<li key={idx}>{activity}</li>
																			)
																		)}
																	</ul>
																</div>
															)}

															{/* Vocabulary */}
															{versionData.vocabulary && (
																<div>
																	<h6 className="text-sm font-semibold text-slate-800 mb-2">
																		Key Vocabulary:
																	</h6>
																	<div className="flex flex-wrap gap-2">
																		{versionData.vocabulary.map((word, idx) => (
																			<span
																				key={idx}
																				className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs"
																			>
																				{word}
																			</span>
																		))}
																	</div>
																</div>
															)}
														</div>
													)
												)}
											</div>
										)}

									{/* VISUAL TAB CONTENT */}
									{activeTab === "visual" && (
										<div>
											{/* {process.env.NODE_ENV === 'development' && (
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h5>Debug Info:</h5>
        <pre className="text-xs">
          {JSON.stringify({
            hasContent: !!content?.content,
            hasVisualAids: !!content?.content?.visualAids?.aids?.,
            hasAids: !!content?.content?.visualAids?.aids?.,
            aidsLength: content?.content?.visualAids?.aids?.length || 0,
            aids: content?.content?.visualAids?.aids?.
          }, null, 2)}
        </pre>
      </div>
    )} */}

											{content?.content?.visualAids?.aids &&
												content?.content?.visualAids?.aids?.length > 0 ? (
												<div>
													<h4 className="text-lg font-bold text-slate-900 mb-4">
														Visual Aids
													</h4>
													<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
														{content?.content?.visualAids?.aids?.map(
															(aid, index) => (
																<div
																	key={index}
																	className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
																>
																	{/* Check for imageUrl first */}
																	{aid.imageUrl ? (
																		<div className="relative group">
																			<img
																				src={aid.imageUrl}
																				alt={aid.title || aid.description}
																				className="w-full h-48 object-cover rounded-lg mb-3 cursor-pointer hover:opacity-90 transition-all duration-300 hover:scale-105"
																				onClick={() =>
																					openImageModal(
																						aid.imageUrl,
																						aid.title
																					)
																				}
																				onError={(e) => {
																					console.log(
																						"Image failed to load:",
																						aid.imageUrl
																					);
																					e.target.style.display = "none";
																					const fallback =
																						e.target.parentElement
																							.nextElementSibling;
																					if (fallback)
																						fallback.style.display = "flex";
																				}}
																			/>
																			{/* Fullscreen icon overlay */}
																			<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg">
																				<svg
																					className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
																					fill="none"
																					stroke="currentColor"
																					viewBox="0 0 24 24"
																				>
																					<path
																						strokeLinecap="round"
																						strokeLinejoin="round"
																						strokeWidth="2"
																						d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v4m0 0h-4m4 0l-5-5"
																					/>
																				</svg>
																			</div>
																		</div>
																	) : aid.svgCode ? (
																		/* Display SVG if svgCode exists and no imageUrl */
																		<div
																			className="w-full h-48 flex items-center justify-center bg-slate-50 rounded-lg mb-3 overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors duration-300"
																			onClick={() => {
																				// For SVG, we'll create a data URL
																				const svgBlob = new Blob(
																					[aid.svgCode],
																					{
																						type: "image/svg+xml",
																					}
																				);
																				const svgUrl =
																					URL.createObjectURL(svgBlob);
																				openImageModal(svgUrl, aid.title);
																			}}
																			dangerouslySetInnerHTML={{
																				__html: aid.svgCode,
																			}}
																		/>
																	) : (
																		/* Show placeholder if neither exists */
																		<div className="w-full h-48 flex items-center justify-center bg-slate-50 rounded-lg mb-3 border-2 border-dashed border-slate-300">
																			<p className="text-sm text-slate-500 text-center">
																				Visual not available
																			</p>
																		</div>
																	)}

																	{/* Fallback div for image errors - hidden by default */}
																	<div className="w-full h-48 items-center justify-center bg-slate-50 rounded-lg mb-3 border-2 border-dashed border-slate-300 hidden">
																		<p className="text-sm text-slate-500 text-center">
																			Image failed to load
																		</p>
																	</div>

																	{/* Title */}
																	{aid.title && (
																		<h5 className="text-sm font-semibold text-slate-800 mb-2">
																			{aid.title}
																		</h5>
																	)}

																	{/* Description */}
																	<p className="text-sm text-slate-600 leading-relaxed mb-3">
																		{aid.description}
																	</p>

																	{/* Teaching Points */}
																	{aid.teachingPoints &&
																		aid.teachingPoints.length > 0 && (
																			<div className="mt-2">
																				<p className="text-xs font-medium text-slate-700 mb-1">
																					Teaching Points:
																				</p>
																				<ul className="text-xs text-slate-600 list-disc list-inside">
																					{aid.teachingPoints.map(
																						(point, idx) => (
																							<li key={idx}>{point}</li>
																						)
																					)}
																				</ul>
																			</div>
																		)}
																</div>
															)
														)}
													</div>

													{/* Hands-on Activities if available */}
													{content?.content?.visualAids?.aids
														?.handsonActivities &&
														content?.content?.visualAids?.aids
															?.handsonActivities.length > 0 && (
															<div className="mt-8">
																<h4 className="text-lg font-bold text-slate-900 mb-4">
																	Hands-on Activities
																</h4>
																<div className="space-y-6">
																	{content?.content?.visualAids?.aids?.handsonActivities.map(
																		(activity, index) => (
																			<div
																				key={index}
																				className=" rounded-xl p-6 border "
																			>
																				<h5 className="text-md font-semibold  mb-3">
																					{activity.name}
																				</h5>

																				{/* Materials */}
																				{activity.materials &&
																					activity.materials.length > 0 && (
																						<div className="mb-4">
																							<p className="text-sm font-medium text-slate-800 mb-2">
																								Materials needed:
																							</p>
																							<ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
																								{activity.materials.map(
																									(material, idx) => (
																										<li key={idx}>
																											{material}
																										</li>
																									)
																								)}
																							</ul>
																						</div>
																					)}

																				{/* Steps */}
																				{activity.steps &&
																					activity.steps.length > 0 && (
																						<div className="mb-4">
																							<p className="text-sm font-medium text-slate-800 mb-2">
																								Steps:
																							</p>
																							<ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
																								{activity.steps.map(
																									(step, idx) => (
																										<li key={idx}>{step}</li>
																									)
																								)}
																							</ol>
																						</div>
																					)}

																				{/* Learning Outcome */}
																				{activity.learningOutcome && (
																					<div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
																						<p className="text-xs font-medium text-emerald-800 mb-1">
																							Learning Outcome:
																						</p>
																						<p className="text-sm text-slate-700">
																							{activity.learningOutcome}
																						</p>
																					</div>
																				)}
																			</div>
																		)
																	)}
																</div>
															</div>
														)}
												</div>
											) : (
												<div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
													<p className="text-sm text-slate-500 text-center">
														No visual aids generated. Please try again.
													</p>
												</div>
											)}
										</div>
									)}

									{/* TIPS TAB CONTENT */}
									{activeTab === "tips" && (
										<div className="space-y-4">
											<h4 className="text-lg font-bold text-slate-900">
												Teaching Tips
											</h4>

											{content?.content?.teachingTips ? (
												<div className="bg-white rounded-lg border border-gray-200 p-6 ">
													{content.content.teachingTips.map(
														(section, sectionIndex) => {
															// Split each section by lines for better parsing
															const lines = section
																.split("\n")
																.filter((line) => line.trim());

															return (
																<div
																	key={sectionIndex}
																	className="mb-8 last:mb-0"
																>
																	{lines.map((line, lineIndex) => {
																		const trimmedLine = line.trim();

																		// Main headings (like "**For Younger Grades (K-2):**")
																		if (
																			trimmedLine.startsWith("**") &&
																			trimmedLine.endsWith(":**")
																		) {
																			const heading = trimmedLine
																				.replace(/^\*\*/, "")
																				.replace(/:\*\*$/, "");
																			return (
																				<h3
																					key={lineIndex}
																					className="text-xl font-bold text-indigo-700 mb-4 mt-6 first:mt-0 border-l-4 border-indigo-500 pl-4"
																				>
																					{heading}
																				</h3>
																			);
																		}

																		// Sub-activities (like "**Activity:**", "**Discussion:**") - NOW WITH BOLD REPLACEMENT
																		else if (
																			trimmedLine.startsWith("**") &&
																			trimmedLine.includes(":")
																		) {
																			// Replace **Text:** with <strong>Text:</strong>
																			const cleanText = trimmedLine.replace(
																				/^\*\*(.+?):\*\*/,
																				"<strong>$1:</strong>"
																			);

																			return (
																				<h4
																					key={lineIndex}
																					className="text-lg font-semibold text-slate-700 mb-2 mt-4"
																					dangerouslySetInnerHTML={{
																						__html: cleanText,
																					}}
																				/>
																			);
																		}

																		// Bullet points (lines starting with *)
																		else if (
																			trimmedLine.startsWith("*") &&
																			!trimmedLine.startsWith("**")
																		) {
																			const bulletContent = trimmedLine.replace(
																				/^\s*\*\s*/,
																				""
																			);
																			return (
																				<div
																					key={lineIndex}
																					className="mb-2 ml-4"
																				>
																					<div className="flex items-start gap-3">
																						<span className="text-blue-500 mt-1.5 text-lg leading-none">
																							•
																						</span>
																						<p className="text-gray-700 leading-relaxed text-base flex-1">
																							{bulletContent}
																						</p>
																					</div>
																				</div>
																			);
																		}

																		// Regular paragraph text
																		else if (trimmedLine.length > 0) {
																			return (
																				<p
																					key={lineIndex}
																					className="text-gray-600 leading-relaxed mb-3 text-base ml-4"
																				>
																					{trimmedLine}
																				</p>
																			);
																		}

																		return null;
																	})}
																</div>
															);
														}
													)}
												</div>
											) : (
												// Your fallback content remains the same
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
														<h5 className="text-md font-semibold text-emerald-700 mb-2">
															Engagement Tips
														</h5>
														<ul className="text-sm text-slate-600 space-y-1">
															<li>
																• Use local examples and cultural references
															</li>
															<li>• Encourage hands-on activities</li>
															<li>• Connect to students' daily experiences</li>
														</ul>
													</div>
													<div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
														<h5 className="text-md font-semibold text-indigo-700 mb-2">
															Assessment Ideas
														</h5>
														<ul className="text-sm text-slate-600 space-y-1">
															<li>• Ask students to retell the story</li>
															<li>• Create drawings of key concepts</li>
															<li>• Role-play different scenarios</li>
														</ul>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Material Generator Tab */}
					{activeMainTab === "material" && <MaterialGenerator />}
				</main>

				{/* Fullscreen Image Modal */}
				{modalImageUrl && (
					<div
						className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
						onClick={closeImageModal}
					>
						<div className="relative max-w-full max-h-full">
							{/* Close button */}
							<button
								onClick={closeImageModal}
								className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors duration-200 z-10"
								aria-label="Close fullscreen view"
							>
								<svg
									className="w-8 h-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>

							{/* Image title */}
							{modalImageTitle && (
								<div className="absolute -top-12 left-0 text-white text-lg font-medium">
									{modalImageTitle}
								</div>
							)}

							{/* Fullscreen image */}
							<img
								src={modalImageUrl}
								alt={modalImageTitle}
								className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
								onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
								onLoad={() => {
									// Clean up blob URLs for SVGs
									if (modalImageUrl.startsWith("blob:")) {
										setTimeout(() => URL.revokeObjectURL(modalImageUrl), 1000);
									}
								}}
							/>

							{/* Download button (optional) */}
							<button
								onClick={(e) => {
									e.stopPropagation();
									const link = document.createElement("a");
									link.href = modalImageUrl;
									link.download = `visual-aid-${modalImageTitle
										.replace(/[^a-z0-9]/gi, "-")
										.toLowerCase()}.png`;
									link.click();
								}}
								className="absolute -bottom-12 right-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								Download
							</button>
						</div>
					</div>
				)}
			</div>
		</>
	);
};


export default ContentHub;
