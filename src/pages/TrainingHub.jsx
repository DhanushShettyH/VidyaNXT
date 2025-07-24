// src/pages/TrainingHub.jsx
import React, { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "../firebase";
import {
	collection,
	doc,
	query,
	where,
	getDocs,
	updateDoc,
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";
import {
	BookOpen,
	Clock,
	Users,
	Award,
	TrendingUp,
	Target,
	Play,
	CheckCircle,
	Star,
	Lock,
	ChevronRight,
	RotateCcw,
} from "lucide-react";
import Header from "../components/Header";

const TrainingHub = () => {
	const [teacherData, setTeacherData] = useState(null);
	const [recommendations, setRecommendations] = useState(null);
	const [modules, setModules] = useState([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("dashboard");
	const [selectedModule, setSelectedModule] = useState(null);
	const navigate = useNavigate();

	const functions = getFunctions();
	const getPersonalizedTraining = httpsCallable(
		functions,
		"getPersonalizedTraining"
	);
	const getTrainingModules = httpsCallable(functions, "getTrainingModules");
	const initializeCoreModules = httpsCallable(
		functions,
		"initializeCoreModules"
	);

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged(async (user) => {
			if (!user) {
				navigate("/login");
				return;
			}

			try {
				const stored = sessionStorage.getItem("teacherData");
				if (!stored) {
					throw new Error("Teacher data not found");
				}

				const data = JSON.parse(stored);
				setTeacherData(data);
				await loadTrainingData(data.ownerUid || data.id);
			} catch (error) {
				console.error("Error loading teacher data:", error);
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, [navigate]);

	// Add this to your TrainingHub component
	useEffect(() => {
		const checkForNewModules = async () => {
			if (!teacherData) return;

			try {
				const notificationsRef = collection(
					db,
					"teachers",
					teacherData.ownerUid || teacherData.id,
					"notifications"
				);

				const q = query(
					notificationsRef,
					where("read", "==", false),
					where("type", "==", "new_module_available")
				);

				const unreadNotifications = await getDocs(q);

				if (!unreadNotifications.empty) {
					const notification = unreadNotifications.docs[0].data();

					alert(`${notification.title}\n\n${notification.message}`);

					await updateDoc(unreadNotifications.docs[0].ref, {
						read: true,
					});

					loadTrainingData(teacherData.ownerUid || teacherData.id);
				}
			} catch (error) {
				console.error("Error checking notifications:", error);
			}
		};

		checkForNewModules();
	}, [teacherData]);

	const loadTrainingData = async (teacherId) => {
		try {
			setLoading(true);

			// Initialize core modules if needed
			await initializeCoreModules();

			// Get personalized recommendations
			const recommendationsResult = await getPersonalizedTraining({
				teacherId,
			});
			setRecommendations(recommendationsResult.data.recommendations);

			// Get all available modules
			const modulesResult = await getTrainingModules({ teacherId });
			setModules(modulesResult.data.modules);
		} catch (error) {
			console.error("Error loading training data:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleModuleClick = (module) => {
		if (
			!module.canStart &&
			module.userProgress?.status !== "in-progress" &&
			module.userProgress?.status !== "completed"
		) {
			alert("Please complete the prerequisite modules first.");
			return;
		}
		setSelectedModule(module);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-gray-600">Loading your training journey...</p>
				</div>
			</div>
		);
	}

	if (selectedModule) {
		return (
			<ModuleViewer
				module={selectedModule}
				teacherId={teacherData?.ownerUid || teacherData?.id}
				onBack={() => setSelectedModule(null)}
			/>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
			<Header Heading={"Training Hub"} />

			<div className="container max-w-7xl mx-auto px-6 lg:px-8 py-4">
				{/* Navigation Tabs */}
				<div className="mb-8">
					<div className="border-b border-gray-200">
						<nav className="-mb-px flex space-x-8">
							{[
								{ id: "dashboard", label: "Dashboard", icon: TrendingUp },
								{ id: "modules", label: "Training Modules", icon: BookOpen },
								{ id: "progress", label: "My Progress", icon: Award },
							].map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
											? "border-blue-500 text-blue-600"
											: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
										}`}
								>
									<tab.icon size={16} />
									{tab.label}
								</button>
							))}
						</nav>
					</div>
				</div>

				{/* Content */}
				{activeTab === "dashboard" && (
					<TrainingDashboard
						teacherData={teacherData}
						recommendations={recommendations}
						modules={modules}
						onModuleClick={handleModuleClick}
					/>
				)}

				{activeTab === "modules" && (
					<ModuleLibrary
						modules={modules}
						teacherData={teacherData}
						onModuleClick={handleModuleClick}
					/>
				)}

				{activeTab === "progress" && (
					<ProgressTracker teacherData={teacherData} modules={modules} />
				)}
			</div>
		</div>
	);
};

// Dashboard Component
const TrainingDashboard = ({
	teacherData,
	recommendations,
	modules,
	onModuleClick,
}) => {
	// Safety check for modules
	const safeModules = modules || [];

	const availableModules = safeModules
		.filter((m) => m.canStart && m.userProgress?.status !== "completed")
		.slice(0, 3);
	const inProgressModules = safeModules.filter(
		(m) => m.userProgress?.status === "in-progress"
	);
	return (
		<div className="space-y-6">
			{/* Welcome Section */}
			<div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
				<h2 className="text-2xl font-bold mb-2">
					Welcome back, {teacherData?.displayName}! 👋
				</h2>
				<p className="opacity-90 mb-4">
					Continue your journey to becoming a multi-grade teaching expert
				</p>
				<div className="flex items-center gap-4 text-sm">
					<div className="flex items-center gap-1">
						<Award size={16} />
						<span>Level: {getTeacherLevel(safeModules)}</span>
					</div>
					<div className="flex items-center gap-1">
						<Clock size={16} />
						<span>{getTotalHours(safeModules)} hours completed</span>
					</div>
				</div>
			</div>

			{/* Continue Learning */}
			{inProgressModules.length > 0 && (
				<div className="bg-white rounded-lg shadow-sm p-6">
					<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
						<RotateCcw className="text-green-500" size={20} />
						Continue Learning
					</h3>
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
						{inProgressModules.map((module) => (
							<ModuleCard
								key={module.id}
								module={module}
								onModuleClick={onModuleClick}
								compact
							/>
						))}
					</div>
				</div>
			)}

			{/* Immediate Needs */}
			{recommendations?.immediateNeeds && (
				<div className="bg-white rounded-lg shadow-sm p-6">
					<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
						<Target className="text-red-500" size={20} />
						Recommended Next Steps
					</h3>
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
						{recommendations.immediateNeeds.map((need, index) => (
							<div
								key={index}
								className={`p-4 rounded-lg border-l-4 ${need.urgency === "high"
										? "border-red-500 bg-red-50"
										: need.urgency === "medium"
											? "border-yellow-500 bg-yellow-50"
											: "border-blue-500 bg-blue-50"
									}`}
							>
								<h4 className="font-medium text-gray-800 mb-2">{need.skill}</h4>
								<p className="text-sm text-gray-600 mb-3">{need.reason}</p>
								<div
									className={`px-2 py-1 rounded text-xs inline-block ${need.urgency === "high"
											? "bg-red-100 text-red-700"
											: need.urgency === "medium"
												? "bg-yellow-100 text-yellow-700"
												: "bg-blue-100 text-blue-700"
										}`}
								>
									{need.urgency} priority
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Available Modules */}
			{availableModules.length > 0 && (
				<div className="bg-white rounded-lg shadow-sm p-6">
					<h3 className="text-lg font-semibold mb-4">Available Training</h3>
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
						{availableModules.map((module) => (
							<ModuleCard
								key={module.id}
								module={module}
								onModuleClick={onModuleClick}
								compact
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

// Module Card Component
const ModuleCard = ({ module, compact = false, onModuleClick }) => {
	const getStatusColor = (status) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-700";
			case "in-progress":
				return "bg-blue-100 text-blue-700";
			default:
				return "bg-gray-100 text-gray-700";
		}
	};

	const getButtonText = (module) => {
		if (module.userProgress?.status === "completed") return "Review";
		if (module.userProgress?.status === "in-progress") return "Continue";
		if (!module.canStart) return "Locked";
		return "Start";
	};

	const isLocked =
		!module.canStart &&
		module.userProgress?.status !== "in-progress" &&
		module.userProgress?.status !== "completed";

	return (
		<div
			className={`bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow ${isLocked ? "opacity-60" : "cursor-pointer"
				}`}
			onClick={() => !isLocked && onModuleClick && onModuleClick(module)}
		>
			<div className="flex items-start justify-between mb-3">
				<h4
					className={`font-medium text-gray-800 ${compact ? "text-sm" : "text-base"
						}`}
				>
					{module.title}
				</h4>
				{isLocked && <Lock size={16} className="text-gray-400" />}
			</div>

			<p className={`text-gray-600 mb-3 ${compact ? "text-xs" : "text-sm"}`}>
				{module.description}
			</p>

			{/* Progress bar for in-progress modules */}
			{module.userProgress?.status === "in-progress" &&
				module.completionPercentage !== undefined && (
					<div className="mb-3">
						<div className="flex justify-between text-xs text-gray-500 mb-1">
							<span>Progress</span>
							<span>{module.completionPercentage}%</span>
						</div>
						<div className="w-full bg-gray-200 rounded-full h-2">
							<div
								className="bg-blue-500 h-2 rounded-full"
								style={{ width: `${module.completionPercentage}%` }}
							></div>
						</div>
					</div>
				)}

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-gray-500">
					<Clock size={12} />
					<span>{module.estimatedTime}</span>
				</div>

				<div className="flex items-center gap-2">
					<span
						className={`px-2 py-1 rounded text-xs ${getStatusColor(
							module.userProgress?.status
						)}`}
					>
						{module.userProgress?.status === "completed" && (
							<CheckCircle size={12} className="inline mr-1" />
						)}
						{module.userProgress?.status || "Available"}
					</span>

					<button
						className={`text-sm px-3 py-1 rounded transition-colors ${isLocked
								? "bg-gray-200 text-gray-400 cursor-not-allowed"
								: "bg-blue-500 text-white hover:bg-blue-600"
							}`}
						disabled={isLocked}
					>
						{getButtonText(module)}
					</button>
				</div>
			</div>
		</div>
	);
};

// Module Library Component
const ModuleLibrary = ({ modules, teacherData, onModuleClick }) => {
	const [filter, setFilter] = useState("all");
	const [searchTerm, setSearchTerm] = useState("");

	const filteredModules = modules.filter((module) => {
		const matchesFilter = filter === "all" || module.type === filter;
		const matchesSearch =
			module?.title?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
			module?.description?.toLowerCase().includes(searchTerm.toLowerCase());
		return matchesFilter && matchesSearch;
	});

	// Group modules by status
	const groupedModules = {
		available: filteredModules.filter(
			(m) =>
				m.canStart &&
				m.userProgress?.status !== "completed" &&
				m.userProgress?.status !== "in-progress"
		),
		inProgress: filteredModules.filter(
			(m) => m.userProgress?.status === "in-progress"
		),
		completed: filteredModules.filter(
			(m) => m.userProgress?.status === "completed"
		),
		locked: filteredModules.filter(
			(m) =>
				!m.canStart &&
				m.userProgress?.status !== "in-progress" &&
				m.userProgress?.status !== "completed"
		),
	};

	return (
		<div className="space-y-6">
			{/* Filters */}
			<div className="bg-white rounded-lg shadow-sm p-4">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="flex-1">
						<input
							type="text"
							placeholder="Search modules..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					<div className="flex gap-2">
						{["all", "core", "personalized"].map((filterType) => (
							<button
								key={filterType}
								onClick={() => setFilter(filterType)}
								className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === filterType
										? "bg-blue-500 text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
							>
								{filterType === "all"
									? "All Modules"
									: filterType.replace("-", " ")}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Module Groups */}
			{groupedModules.inProgress.length > 0 && (
				<ModuleGroup
					title="Continue Learning"
					modules={groupedModules.inProgress}
					onModuleClick={onModuleClick}
					icon={<RotateCcw className="text-green-500" size={20} />}
				/>
			)}

			{groupedModules.available.length > 0 && (
				<ModuleGroup
					title="Available Modules"
					modules={groupedModules.available}
					onModuleClick={onModuleClick}
					icon={<Play className="text-blue-500" size={20} />}
				/>
			)}

			{groupedModules.completed.length > 0 && (
				<ModuleGroup
					title="Completed Modules"
					modules={groupedModules.completed}
					onModuleClick={onModuleClick}
					icon={<CheckCircle className="text-green-500" size={20} />}
				/>
			)}

			{groupedModules.locked.length > 0 && (
				<ModuleGroup
					title="Locked Modules"
					modules={groupedModules.locked}
					onModuleClick={onModuleClick}
					icon={<Lock className="text-gray-400" size={20} />}
				/>
			)}

			{filteredModules.length === 0 && (
				<div className="text-center py-8">
					<BookOpen size={48} className="text-gray-400 mx-auto mb-4" />
					<p className="text-gray-600">
						No modules found matching your criteria
					</p>
				</div>
			)}
		</div>
	);
};

// Module Group Component
const ModuleGroup = ({ title, modules, onModuleClick, icon }) => (
	<div className="bg-white rounded-lg shadow-sm p-6">
		<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
			{icon}
			{title}
		</h3>
		<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
			{modules.map((module) => (
				<ModuleCard
					key={module.id}
					module={module}
					onModuleClick={onModuleClick}
				/>
			))}
		</div>
	</div>
);

// Progress Tracker Component
// Updated ProgressTracker Component
const ProgressTracker = ({ teacherData, modules }) => {
	const [progressData, setProgressData] = useState(null);
	const [loading, setLoading] = useState(true);

	const functions = getFunctions();
	const getTeacherProgress = httpsCallable(functions, "getTeacherProgress");

	useEffect(() => {
		loadProgressData();
	}, []);

	const loadProgressData = async () => {
		try {
			const result = await getTeacherProgress({
				teacherId: teacherData?.ownerUid || teacherData?.id,
			});
			setProgressData(result.data.progress);
		} catch (error) {
			console.error("Error loading progress:", error);
			// Set default values for new users
			setProgressData({
				skillLevels: {
					multiGradeManagement: 0,
					timeManagement: 0,
					studentEngagement: 0,
					classroomSetup: 0,
					parentCommunication: 0,
				},
				completedCoreModules: 0,
				totalTrainingHours: 0,
			});
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <div>Loading progress...</div>;
	}

	const completedModules = modules.filter(
		(m) => m.userProgress?.status === "completed"
	);
	const totalHours = progressData?.totalTrainingHours || 0;
	const skillLevels = progressData?.skillLevels || {};

	// Convert skill levels object to array for display
	const skillLevelsArray = [
		{
			skill: "Multi-grade Management",
			level: skillLevels.multiGradeManagement || 0,
		},
		{ skill: "Time Management", level: skillLevels.timeManagement || 0 },
		{ skill: "Student Engagement", level: skillLevels.studentEngagement || 0 },
		{ skill: "Classroom Setup", level: skillLevels.classroomSetup || 0 },
		{
			skill: "Parent Communication",
			level: skillLevels.parentCommunication || 0,
		},
	];

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-lg shadow-sm p-6">
				<h3 className="text-lg font-semibold mb-4">Your Learning Journey</h3>

				{/* Stats Row */}
				<div className="grid md:grid-cols-4 gap-4 mb-6">
					<div className="text-center p-4 bg-blue-50 rounded-lg">
						<div className="text-2xl font-bold text-blue-600">
							{completedModules.length}
						</div>
						<div className="text-sm text-gray-600">Modules Completed</div>
					</div>
					<div className="text-center p-4 bg-green-50 rounded-lg">
						<div className="text-2xl font-bold text-green-600">
							{Math.round(totalHours)}h
						</div>
						<div className="text-sm text-gray-600">Learning Time</div>
					</div>
					<div className="text-center p-4 bg-purple-50 rounded-lg">
						<div className="text-2xl font-bold text-purple-600">
							{getTeacherLevel(completedModules.length)}
						</div>
						<div className="text-sm text-gray-600">Current Level</div>
					</div>
					<div className="text-center p-4 bg-yellow-50 rounded-lg">
						<div className="text-2xl font-bold text-yellow-600">
							{
								modules.filter((m) => m.userProgress?.status === "in-progress")
									.length
							}
						</div>
						<div className="text-sm text-gray-600">In Progress</div>
					</div>
				</div>

				<div className="grid md:grid-cols-2 gap-6">
					<div>
						<h4 className="font-medium mb-4">Skill Levels</h4>
						<div className="space-y-3">
							{skillLevelsArray.map((item) => (
								<div key={item.skill}>
									<div className="flex justify-between text-sm mb-1">
										<span>{item.skill}</span>
										<span>{item.level}/10</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className="bg-blue-500 h-2 rounded-full"
											style={{ width: `${item.level * 10}%` }}
										></div>
									</div>
								</div>
							))}
						</div>
					</div>

					<div>
						<h4 className="font-medium mb-4">Recent Achievements</h4>
						<div className="space-y-2">
							{completedModules.length === 0 ? (
								<div className="text-gray-500 text-sm">
									No achievements yet. Start your first module to begin earning
									badges!
								</div>
							) : (
								<>
									{completedModules.slice(-3).map((module, index) => (
										<div
											key={index}
											className="flex items-center gap-2 text-sm"
										>
											<CheckCircle className="text-green-500" size={16} />
											<span>Completed "{module.title}"</span>
										</div>
									))}
									<div className="flex items-center gap-2 text-sm">
										<Award className="text-purple-500" size={16} />
										<span>
											{Math.round(totalHours)} hours of training completed
										</span>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

// Helper functions
// Updated helper functions with safety checks
function getTeacherLevel(modules) {
	// Safety check: ensure modules is an array
	if (!modules || !Array.isArray(modules)) {
		return "Beginner";
	}

	const completedCount = modules.filter(
		(m) => m.userProgress?.status === "completed"
	).length;

	if (completedCount === 0) return "Beginner";
	if (completedCount <= 2) return "Developing";
	if (completedCount <= 5) return "Proficient";
	return "Expert";
}

function getTotalHours(modules) {
	// Safety check: ensure modules is an array
	if (!modules || !Array.isArray(modules)) {
		return 0;
	}

	const totalSeconds = modules.reduce((sum, module) => {
		return sum + (module.userProgress?.timeSpent || 0);
	}, 0);

	return Math.round(totalSeconds / 3600);
}

// Also add this helper for the level calculation that takes completedCount directly
function getTeacherLevelByCount(completedCount) {
	if (!completedCount || completedCount === 0) return "Beginner";
	if (completedCount <= 2) return "Developing";
	if (completedCount <= 5) return "Proficient";
	return "Expert";
}

// Module Viewer Component
const ModuleViewer = ({ module, teacherId, onBack }) => {
	const [currentSection, setCurrentSection] = useState(0);
	const [completedSections, setCompletedSections] = useState(
		module.userProgress?.completedSections || []
	);

	const functions = getFunctions();
	const startTrainingModule = httpsCallable(functions, "startTrainingModule");
	const completeSectionProgress = httpsCallable(
		functions,
		"completeSectionProgress"
	);

	useEffect(() => {
		// Start module if not already started
		if (
			module.userProgress?.status !== "in-progress" &&
			module.userProgress?.status !== "completed"
		) {
			handleStartModule();
		}
	}, []);

	const handleStartModule = async () => {
		try {
			await startTrainingModule({
				teacherId,
				moduleId: module.id,
			});
		} catch (error) {
			console.error("Error starting module:", error);
		}
	};

	const handleCompleteSection = async (sectionId, timeSpent = 300) => {
		try {
			const result = await completeSectionProgress({
				teacherId,
				moduleId: module.id,
				sectionId,
				timeSpent,
			});

			if (result.data.success) {
				setCompletedSections([...completedSections, sectionId]);

				// If all sections completed, show completion message
				if (result.data.moduleProgress.status === "completed") {
					alert("Congratulations! You've completed this module! 🎉");
					onBack();
				}
			}
		} catch (error) {
			console.error("Error completing section:", error);
		}
	};

	const sections = module.content?.sections || [];
	const currentSectionData = sections[currentSection];
	const isCurrentSectionCompleted = completedSections.includes(
		currentSectionData?.id
	);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="mb-8">
					<button
						onClick={onBack}
						className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
					>
						<ChevronRight size={16} className="transform rotate-180" />
						Back to Training Hub
					</button>

					<h1 className="text-3xl font-bold text-gray-800 mb-2">
						{module.title}
					</h1>
					<p className="text-gray-600">{module.description}</p>

					{/* Progress bar */}
					<div className="mt-4">
						<div className="flex justify-between text-sm text-gray-600 mb-2">
							<span>
								Progress: {completedSections.length} of {sections.length}{" "}
								sections
							</span>
							<span>
								{Math.round((completedSections.length / sections.length) * 100)}
								% complete
							</span>
						</div>
						<div className="w-full bg-gray-200 rounded-full h-2">
							<div
								className="bg-blue-500 h-2 rounded-full"
								style={{
									width: `${(completedSections.length / sections.length) * 100
										}%`,
								}}
							></div>
						</div>
					</div>
				</div>

				<div className="grid lg:grid-cols-4 gap-8">
					{/* Sidebar - Section Navigation */}
					<div className="lg:col-span-1">
						<div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
							<h3 className="font-medium mb-4">Module Sections</h3>
							<div className="space-y-2">
								{sections.map((section, index) => {
									const isCompleted = completedSections.includes(section.id);
									const isCurrent = index === currentSection;

									return (
										<button
											key={section.id}
											onClick={() => setCurrentSection(index)}
											className={`w-full text-left p-3 rounded-lg transition-colors ${isCurrent
												? "bg-blue-50 border-l-4 border-blue-500"
												: "hover:bg-gray-50"
												}`}
										>
											<div className="flex items-center gap-2">
												{isCompleted ? (
													<CheckCircle size={16} className="text-green-500" />
												) : (
													<div
														className={`w-4 h-4 rounded-full border-2 ${isCurrent ? "border-blue-500" : "border-gray-300"
															}`}
													/>
												)}
												<span
													className={`text-sm ${isCurrent ? "font-medium" : ""
														}`}
												>
													{section.title}
												</span>
											</div>
											<div className="text-xs text-gray-500 ml-6">
												{section.duration} min
											</div>
										</button>
									);
								})}
							</div>
						</div>
					</div>

					{/* Main Content */}
					<div className="lg:col-span-3">
						<div className="bg-white rounded-lg shadow-sm p-8">
							{currentSectionData ? (
								<>
									<h2 className="text-2xl font-bold text-gray-800 mb-4">
										{currentSectionData.title}
									</h2>

									<div className="prose max-w-none mb-8">
										<div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
											{currentSectionData.content}
										</div>
									</div>

									{/* Activities */}
									{currentSectionData.activities &&
										currentSectionData.activities.length > 0 && (
											<div className="mb-8 p-4 bg-blue-50 rounded-lg">
												<h4 className="font-medium text-blue-800 mb-3">
													Activities
												</h4>
												<ul className="space-y-2">
													{currentSectionData.activities.map(
														(activity, index) => (
															<li
																key={index}
																className="flex items-start gap-2 text-blue-700"
															>
																<span className="text-blue-500">•</span>
																<span>{activity}</span>
															</li>
														)
													)}
												</ul>
											</div>
										)}

									{/* Section Actions */}
									<div className="flex items-center justify-between pt-8 border-t">
										<div className="flex gap-3">
											<button
												onClick={() =>
													setCurrentSection(Math.max(0, currentSection - 1))
												}
												disabled={currentSection === 0}
												className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												Previous
											</button>

											<button
												onClick={() =>
													setCurrentSection(
														Math.min(sections.length - 1, currentSection + 1)
													)
												}
												disabled={currentSection === sections.length - 1}
												className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												Next
											</button>
										</div>

										<button
											onClick={() =>
												handleCompleteSection(currentSectionData.id)
											}
											disabled={isCurrentSectionCompleted}
											className={`px-6 py-2 rounded-lg transition-colors ${isCurrentSectionCompleted
												? "bg-green-100 text-green-700 cursor-default"
												: "bg-blue-600 text-white hover:bg-blue-700"
												}`}
										>
											{isCurrentSectionCompleted ? (
												<>
													<CheckCircle size={16} className="inline mr-2" />
													Section Completed
												</>
											) : (
												"Mark as Complete"
											)}
										</button>
									</div>
								</>
							) : (
								<div className="text-center py-8">
									<p className="text-gray-600">
										No content available for this section.
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TrainingHub;
