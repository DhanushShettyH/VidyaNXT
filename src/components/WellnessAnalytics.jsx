import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export default function WellnessAnalytics({ teacherId }) {
	const [analyticsData, setAnalyticsData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [timeframe, setTimeframe] = useState('30d');

	useEffect(() => {
		if (teacherId) {
			fetchAnalyticsData();
		}
	}, [teacherId, timeframe]);

	const fetchAnalyticsData = async () => {
		try {
			setLoading(true);
			const getWellnessAnalytics = httpsCallable(functions, 'getWellnessAnalytics');
			const result = await getWellnessAnalytics({
				teacher_id: teacherId,
				timeframe: timeframe
			});
			setAnalyticsData(result.data);
		} catch (error) {
			console.error('Error fetching analytics data:', error);
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="h-64 bg-gray-200 rounded"></div>
						<div className="h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-8">
				<div className="text-red-600 mb-4">⚠️ Error loading analytics</div>
				<p className="text-gray-600">{error}</p>
				<button
					onClick={fetchAnalyticsData}
					className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header with Timeframe Selection */}
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold text-gray-900">Wellness Analytics</h2>
				<div className="flex space-x-2">
					{['7d', '30d', '90d'].map((period) => (
						<button
							key={period}
							onClick={() => setTimeframe(period)}
							className={`px-4 py-2 rounded-md text-sm font-medium ${timeframe === period
									? 'bg-indigo-600 text-white'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
								}`}
						>
							{period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
						</button>
					))}
				</div>
			</div>

			{/* Analytics Overview */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white p-6 rounded-lg shadow">
					<div className="text-2xl font-bold text-blue-600">
						{analyticsData?.totalAnalyses || 0}
					</div>
					<div className="text-sm text-gray-600">Total Analyses</div>
				</div>
				<div className="bg-white p-6 rounded-lg shadow">
					<div className="text-2xl font-bold text-green-600">
						{Math.round(analyticsData?.avgWellnessScore || 0)}%
					</div>
					<div className="text-sm text-gray-600">Average Wellness</div>
				</div>
				<div className="bg-white p-6 rounded-lg shadow">
					<div className="text-2xl font-bold text-red-600">
						{analyticsData?.criticalAlerts || 0}
					</div>
					<div className="text-sm text-gray-600">Critical Alerts</div>
				</div>
				<div className="bg-white p-6 rounded-lg shadow">
					<div className="text-2xl font-bold text-purple-600 capitalize">
						{analyticsData?.overallTrend || 'Stable'}
					</div>
					<div className="text-sm text-gray-600">Overall Trend</div>
				</div>
			</div>

			{/* Wellness Score Trends */}
			<div className="bg-white p-6 rounded-lg shadow">
				<h3 className="text-lg font-semibold mb-4">Wellness Score Trends</h3>
				{analyticsData?.trends?.length > 0 ? (
					<div className="space-y-3">
						{analyticsData.trends.map((trend, index) => (
							<div key={index} className="flex items-center justify-between border-b pb-2">
								<div className="flex items-center">
									<div className="w-4 h-4 rounded-full bg-blue-500 mr-3"></div>
									<span className="text-sm font-medium">{trend.date}</span>
								</div>
								<div className="flex items-center space-x-4">
									<span className="text-sm text-gray-600">
										{Math.round(trend.wellness_score)}%
									</span>
									<div className={`text-xs px-2 py-1 rounded ${trend.change > 0 ? 'bg-green-100 text-green-800' :
											trend.change < 0 ? 'bg-red-100 text-red-800' :
												'bg-gray-100 text-gray-800'
										}`}>
										{trend.change > 0 ? '+' : ''}{trend.change}%
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-gray-500">No trend data available</p>
				)}
			</div>

			{/* Category Breakdown */}
			<div className="bg-white p-6 rounded-lg shadow">
				<h3 className="text-lg font-semibold mb-4">Wellness Categories</h3>
				{analyticsData?.categories ? (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{Object.entries(analyticsData.categories).map(([category, score]) => (
							<div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
								<span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
								<div className="flex items-center space-x-2">
									<div className="w-16 bg-gray-200 rounded-full h-2">
										<div
											className="bg-blue-600 h-2 rounded-full"
											style={{ width: `${score}%` }}
										></div>
									</div>
									<span className="text-sm text-gray-600">{Math.round(score)}%</span>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-gray-500">No category data available</p>
				)}
			</div>

			{/* Critical Patterns */}
			{analyticsData?.criticalPatterns?.length > 0 && (
				<div className="bg-white p-6 rounded-lg shadow">
					<h3 className="text-lg font-semibold mb-4">Critical Patterns</h3>
					<div className="space-y-3">
						{analyticsData.criticalPatterns.map((pattern, index) => (
							<div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded">
								<div className="text-red-600 mt-1">⚠️</div>
								<div className="flex-1">
									<div className="font-medium text-red-800">{pattern.title}</div>
									<div className="text-sm text-red-600">{pattern.description}</div>
									<div className="text-xs text-red-500 mt-1">
										Detected {pattern.frequency} times in {timeframe}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Recommendations */}
			{analyticsData?.recommendations?.length > 0 && (
				<div className="bg-white p-6 rounded-lg shadow">
					<h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
					<div className="space-y-3">
						{analyticsData.recommendations.map((rec, index) => (
							<div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded">
								<div className="text-blue-600 mt-1">💡</div>
								<div className="flex-1">
									<div className="font-medium text-blue-800">{rec.title}</div>
									<div className="text-sm text-blue-600">{rec.description}</div>
									<div className="text-xs text-blue-500 mt-1">
										Priority: {rec.priority} | Impact: {rec.impact}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}