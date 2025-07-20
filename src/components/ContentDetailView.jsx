import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

const ContentDetailView = ({ content, onBack }) => {
	const [activeTab, setActiveTab] = useState("story");

	return (
		<div className="max-w-6xl mx-auto p-4 sm:p-6">
			<div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
				{/* Header with Back Button */}
				<div className="flex items-center gap-3 mb-4">
					<button
						onClick={onBack}
						className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
					>
						← Back to Library
					</button>
				</div>

				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
					<div>
						<h1 className="text-xl sm:text-2xl font-bold text-gray-800">
							{content.content?.story?.substring(0, 80) + "..." || "Content Details"}
						</h1>
						<div className="flex flex-wrap gap-2 mt-2">
							<span className="text-sm text-gray-600">
								{content.subject || "General"} • {content.language || "English"}
							</span>
							<span className="text-sm text-gray-600">
								📍 {content.location || "Not specified"}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<div
							className={`px-3 py-1 rounded-full text-sm font-medium ${(content.reliabilityScore || 0) > 0.8
									? "bg-green-100 text-green-800"
									: "bg-yellow-100 text-yellow-800"
								}`}
						>
							{Math.round((content.reliabilityScore || 0) * 100)}% Reliable
						</div>
					</div>
				</div>

				{/* Grades */}
				<div className="flex flex-wrap gap-2 mb-6">
					{(content.grades || []).map((grade) => (
						<span
							key={grade}
							className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
						>
							Grade {grade}
						</span>
					))}
				</div>

				{/* Mobile-Responsive Tabs */}
				<div className="overflow-x-auto mb-6">
					<div className="flex border-b border-gray-200 min-w-max sm:min-w-0">
						{[
							{ id: "story", label: "Story", icon: "📚" },
							{ id: "grades", label: "Grade Versions", icon: "📊" },
							{ id: "visual", label: "Visual Aids", icon: "🎨" },
							{ id: "activities", label: "Activities", icon: "🎯" },
							{ id: "tips", label: "Teaching Tips", icon: "💡" },
						].map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
										? "border-blue-500 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
									}`}
							>
								<span>{tab.icon}</span>
								<span className="hidden sm:inline">{tab.label}</span>
								<span className="sm:hidden">{tab.label.split(' ')[0]}</span>
							</button>
						))}
					</div>
				</div>

				{/* Tab Content */}
				<div className="tab-content">
					{activeTab === "story" && (
						<div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
							<h3 className="text-lg font-semibold mb-4">Main Story</h3>
							<div className="prose max-w-none">
								<p className="text-gray-800 leading-relaxed text-sm sm:text-base whitespace-pre-wrap break-words">
									{content.content?.story || "No story content available"}
								</p>
							</div>

							{content.content?.culturalContext?.localReferences?.length > 0 && (
								<div className="mt-6 p-4 bg-blue-50 rounded-lg">
									<h4 className="font-medium text-blue-900 mb-2">Cultural Context</h4>
									<p className="text-blue-800 text-sm">
										<strong>Local References:</strong>{" "}
										{content.content.culturalContext.localReferences.join(", ")}
									</p>
								</div>
							)}
						</div>
					)}

					{activeTab === "grades" && (
						<div>
							<h3 className="text-lg font-semibold mb-4">Grade-Specific Versions</h3>
							{content.content?.gradeVersions && Object.keys(content.content.gradeVersions).length > 0 ? (
								<div className="space-y-4">
									{Object.entries(content.content.gradeVersions).map(([grade, version]) => (
										<div key={grade} className="bg-gray-50 p-4 rounded-lg">
											<h4 className="font-medium text-gray-700 mb-3 capitalize">
												{grade.replace("grade", "Grade ")}
											</h4>
											<p className="text-gray-800 mb-3 text-sm sm:text-base break-words">
												{version.content}
											</p>

											<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
												{version.objectives && (
													<div>
														<h5 className="font-medium text-gray-600 mb-2">Learning Objectives</h5>
														<ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
															{version.objectives.map((obj, index) => (
																<li key={index} className="break-words">{obj}</li>
															))}
														</ul>
													</div>
												)}

												{version.vocabulary && (
													<div>
														<h5 className="font-medium text-gray-600 mb-2">Key Vocabulary</h5>
														<div className="flex flex-wrap gap-2">
															{version.vocabulary.map((word, index) => (
																<span
																	key={index}
																	className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm break-words"
																>
																	{word}
																</span>
															))}
														</div>
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-500">No grade-specific versions available</p>
							)}
						</div>
					)}

					{activeTab === "visual" && (
						<div>
							<h3 className="text-lg font-semibold mb-4">Visual Aids</h3>
							{content.content?.visualAids?.aids?.length > 0 ? (
								<div className="space-y-6">
									{content.content.visualAids.aids.map((aid, index) => (
										<div key={index} className="bg-gray-50 p-4 rounded-lg">
											<h4 className="font-medium text-gray-700 mb-2">
												{aid.title || `Visual Aid ${index + 1}`}
											</h4>
											<p className="text-gray-600 text-sm mb-4 break-words">
												{aid.description || "No description available"}
											</p>

											{aid.imageUrl && (
												<div className="mb-4">
													<img
														src={aid.imageUrl}
														alt={aid.title}
														className="w-full h-auto max-h-64 object-contain border rounded"
													/>
												</div>
											)}

											{aid.svgCode && (
												<div className="mb-4 border rounded p-2 bg-white overflow-x-auto">
													<div dangerouslySetInnerHTML={{ __html: aid.svgCode }} />
												</div>
											)}

											{aid.teachingPoints?.length > 0 && (
												<div>
													<h5 className="font-medium text-gray-600 mb-2">Teaching Points</h5>
													<ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
														{aid.teachingPoints.map((point, i) => (
															<li key={i} className="break-words">{point}</li>
														))}
													</ul>
												</div>
											)}
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-500">No visual aids available</p>
							)}
						</div>
					)}

					{activeTab === "activities" && (
						<div>
							<h3 className="text-lg font-semibold mb-4">Hands-on Activities</h3>
							{content.content?.handsonActivities?.length > 0 ? (
								<div className="space-y-6">
									{content.content.handsonActivities.map((activity, index) => (
										<div key={index} className="bg-gray-50 p-4 rounded-lg">
											<h4 className="font-medium text-gray-700 mb-2">
												{activity.name || `Activity ${index + 1}`}
											</h4>

											{activity.materials?.length > 0 && (
												<div className="mb-4">
													<h5 className="font-medium text-gray-600 mb-2">Materials Needed</h5>
													<ul className="text-sm text-gray-700 list-disc list-inside">
														{activity.materials.map((material, i) => (
															<li key={i} className="break-words">{material}</li>
														))}
													</ul>
												</div>
											)}

											{activity.steps?.length > 0 && (
												<div className="mb-4">
													<h5 className="font-medium text-gray-600 mb-2">Steps</h5>
													<ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
														{activity.steps.map((step, i) => (
															<li key={i} className="break-words">{step}</li>
														))}
													</ol>
												</div>
											)}

											{activity.learningOutcome && (
												<div className="p-3 bg-blue-50 rounded">
													<h5 className="font-medium text-blue-900 mb-1">Learning Outcome</h5>
													<p className="text-blue-800 text-sm break-words">{activity.learningOutcome}</p>
												</div>
											)}
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-500">No hands-on activities available</p>
							)}
						</div>
					)}

					{activeTab === "tips" && (
						<div>
							<h3 className="text-lg font-semibold mb-4">Teaching Tips</h3>
							{content.content?.teachingTips?.length > 0 ? (
								<div className="bg-gray-50 p-4 rounded-lg">
									<ul className="space-y-3">
										{content.content.teachingTips.map((tip, index) => (
											<li key={index} className="flex items-start gap-3">
												<span className="text-blue-500 mt-1 flex-shrink-0">💡</span>
												<span className="text-gray-800 text-sm sm:text-base break-words">{tip}</span>
											</li>
										))}
									</ul>
								</div>
							) : (
								<p className="text-gray-500">No teaching tips available</p>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ContentDetailView;
