import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import WellnessMetrics from '../components/WellnessMetrics';
import WellnessAlerts from '../components/WellnessAlert';
import WellnessAnalytics from '../components/WellnessAnalytics';

export default function WellnessDashboard() {
	const [teacherData, setTeacherData] = useState(null);
	const [dashboardData, setDashboardData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState('overview');
	const navigate = useNavigate();

	useEffect(() => {
		const storedTeacherData = sessionStorage.getItem("teacherData");
		if (!storedTeacherData) {
			navigate("/login");
			return;
		}

		try {
			const parsedTeacherData = JSON.parse(storedTeacherData);
			setTeacherData(parsedTeacherData);
			fetchDashboardData(parsedTeacherData.id);
		} catch (error) {
			console.error("Error parsing teacher data:", error);
			navigate("/login");
		}
	}, [navigate]);

	const fetchDashboardData = async (teacherId) => {
		try {
			setLoading(true);
			const getEnhancedTeacherDashboard = httpsCallable(functions, 'getEnhancedTeacherDashboard');
			const result = await getEnhancedTeacherDashboard({ teacher_id: teacherId });
			setDashboardData(result.data);
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	const handleAcknowledgeAlert = async (alertId) => {
		try {
			const acknowledgeWellnessAlert = httpsCallable(functions, 'acknowledgeWellnessAlert');
			await acknowledgeWellnessAlert({
				teacher_id: teacherData.id,
				alert_id: alertId
			});

			// Refresh dashboard data
			await fetchDashboardData(teacherData.id);
		} catch (error) {
			console.error('Error acknowledging alert:', error);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
						<p className="mt-4 text-gray-600">Loading wellness dashboard...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="text-center">
						<div className="text-red-600 mb-4">⚠️ Error loading dashboard</div>
						<p className="text-gray-600">{error}</p>
						<button
							onClick={() => fetchDashboardData(teacherData.id)}
							className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
						>
							Retry
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Wellness Dashboard</h1>
							<p className="text-sm text-gray-600">Monitor and improve your wellbeing</p>
						</div>
						<button
							onClick={() => navigate('/home')}
							className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
						>
							Back to Home
						</button>
					</div>
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="border-b border-gray-200">
					<nav className="flex space-x-8">
						{[
							{ id: 'overview', label: 'Overview', icon: '📊' },
							{ id: 'metrics', label: 'Metrics', icon: '📈' },
							{ id: 'alerts', label: 'Alerts', icon: '🚨' },
							{ id: 'analytics', label: 'Analytics', icon: '🔍' }
						].map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
									? 'border-indigo-500 text-indigo-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
									}`}
							>
								<span className="mr-2">{tab.icon}</span>
								{tab.label}
							</button>
						))}
					</nav>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{activeTab === 'overview' && (
					<div className="space-y-6">
						{/* Wellness Summary */}
						<div className="bg-white overflow-hidden shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
									Wellness Summary
								</h3>

								{dashboardData?.wellness?.summary ? (
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div className="bg-green-50 p-4 rounded-lg">
											<div className="text-2xl font-bold text-green-600">
												{Math.round(dashboardData.wellness.summary.avg_wellness_score || 0)}%
											</div>
											<div className="text-sm text-green-700">Average Wellness Score</div>
										</div>
										<div className="bg-blue-50 p-4 rounded-lg">
											<div className="text-2xl font-bold text-blue-600">
												{dashboardData.wellness.summary.total_analyses || 0}
											</div>
											<div className="text-sm text-blue-700">Total Analyses</div>
										</div>
										<div className="bg-purple-50 p-4 rounded-lg">
											<div className="text-2xl font-bold text-purple-600 capitalize">
												{dashboardData.wellness.summary.wellness_trend || 'Stable'}
											</div>
											<div className="text-sm text-purple-700">Wellness Trend</div>
										</div>
									</div>
								) : (
									<p className="text-gray-500">No wellness data available yet. Start using the app to generate insights!</p>
								)}
							</div>
						</div>

						{/* Recent Activity */}
						<div className="bg-white overflow-hidden shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
									Recent Activity
								</h3>

								<div className="space-y-3">
									{dashboardData?.wellness?.recent_reports?.slice(0, 5).map((report, index) => (
										<div key={index} className="flex items-center justify-between border-b pb-2">
											<div className="flex items-center">
												<span className="text-lg mr-3">
													{report.analysis_type === 'chat' ? '💬' : '🎯'}
												</span>
												<div>
													<div className="font-medium text-gray-900 capitalize">
														{report.analysis_type} Analysis
													</div>
													<div className="text-sm text-gray-500">
														{report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Recent'}
													</div>
												</div>
											</div>
											{report.wellness_scores && (
												<div className="text-right">
													<div className="text-sm font-medium text-gray-900">
														{Math.round(report.wellness_scores.overall_wellness || 0)}% Wellness
													</div>
													{report.critical_alert && (
														<div className="text-xs text-red-600">Critical Alert</div>
													)}
												</div>
											)}
										</div>
									))}

									{(!dashboardData?.wellness?.recent_reports || dashboardData.wellness.recent_reports.length === 0) && (
										<p className="text-gray-500 text-center py-4">No recent activity</p>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === 'metrics' && (
					<WellnessMetrics teacherId={teacherData?.id} />
				)}

				{activeTab === 'alerts' && (
					<WellnessAlerts
						alerts={dashboardData?.wellness?.unacknowledged_alerts || []}
						onAcknowledge={handleAcknowledgeAlert}
					/>
				)}

				{activeTab === 'analytics' && (
					<WellnessAnalytics teacherId={teacherData?.id} />
				)}
			</div>
		</div>
	);
}