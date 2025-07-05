import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function WellnessMetrics({ teacherId }) {
	const [metricsData, setMetricsData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [timeframe, setTimeframe] = useState('30d');

	useEffect(() => {
		if (teacherId) {
			fetchMetricsData();
		}
	}, [teacherId, timeframe]);

	const fetchMetricsData = async () => {
		try {
			setLoading(true);
			const getWellnessAnalytics = httpsCallable(functions, 'getWellnessAnalytics');
			const result = await getWellnessAnalytics({
				teacher_id: teacherId,
				timeframe: timeframe
			});
			setMetricsData(result.data.analytics);
		} catch (error) {
			console.error('Error fetching wellness metrics:', error);
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	const formatChartData = (reports) => {
		return reports.map(report => ({
			date: new Date(report.created_at).toLocaleDateString(),
			overall_wellness: report.wellness_scores?.overall_wellness || 0,
			stress_level: report.wellness_scores?.stress_level || 0,
			emotional_state: report.wellness_scores?.emotional_state || 0,
			support_needs: report.wellness_scores?.support_needs || 0,
			timestamp: report.created_at
		})).reverse();
	};

	const getWellnessDistribution = (reports) => {
		const ranges = { 'Low (0-40)': 0, 'Moderate (41-70)': 0, 'High (71-100)': 0 };

		reports.forEach(report => {
			const score = report.wellness_scores?.overall_wellness || 0;
			if (score <= 40) ranges['Low (0-40)']++;
			else if (score <= 70) ranges['Moderate (41-70)']++;
			else ranges['High (71-100)']++;
		});

		return Object.entries(ranges).map(([name, value]) => ({ name, value }));
	};

	const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

	if (loading) {
		return (
			<div className="text-center py-8">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
				<p className="mt-4 text-gray-600">Loading wellness metrics...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-8">
				<div className="text-red-600 mb-4">⚠️ Error loading metrics</div>
				<p className="text-gray-600">{error}</p>
				<button
					onClick={fetchMetricsData}
					className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
				>
					Retry
				</button>
			</div>
		);
	}

	if (!metricsData || metricsData.total_analyses === 0) {
		return (
			<div className="text-center py-8">
				<div className="text-gray-500 mb-4">📊 No wellness data available</div>
				<p className="text-gray-600">Start using the app to generate wellness insights!</p>
			</div>
		);
	}

	const chartData = formatChartData(metricsData.reports);
	const distributionData = getWellnessDistribution(metricsData.reports);

	return (
		<div className="space-y-6">
			{/* Header with Timeframe Selector */}
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold text-gray-900">Wellness Metrics</h2>
				<select
					value={timeframe}
					onChange={(e) => setTimeframe(e.target.value)}
					className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="7d">Last 7 days</option>
					<option value="30d">Last 30 days</option>
					<option value="90d">Last 90 days</option>
				</select>
			</div>

			{/* Key Metrics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white p-4 rounded-lg shadow border">
					<div className="text-2xl font-bold text-blue-600">
						{metricsData.total_analyses}
					</div>
					<div className="text-sm text-gray-600">Total Analyses</div>
				</div>
				<div className="bg-white p-4 rounded-lg shadow border">
					<div className="text-2xl font-bold text-green-600">
						{Math.round(metricsData.average_wellness)}%
					</div>
					<div className="text-sm text-gray-600">Average Wellness</div>
				</div>
				<div className="bg-white p-4 rounded-lg shadow border">
					<div className="text-2xl font-bold text-red-600">
						{metricsData.critical_alerts}
					</div>
					<div className="text-sm text-gray-600">Critical Alerts</div>
				</div>
				<div className="bg-white p-4 rounded-lg shadow border">
					<div className={`text-2xl font-bold ${metricsData.wellness_trend > 0 ? 'text-green-600' : metricsData.wellness_trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
						{metricsData.wellness_trend > 0 ? '+' : ''}{Math.round(metricsData.wellness_trend)}%
					</div>
					<div className="text-sm text-gray-600">Wellness Trend</div>
				</div>
			</div>

			{/* Wellness Trend Chart */}
			<div className="bg-white p-6 rounded-lg shadow">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">Wellness Trend Over Time</h3>
				<ResponsiveContainer width="100%" height={300}>
					<LineChart data={chartData}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="date" />
						<YAxis domain={[0, 100]} />
						<Tooltip />
						<Legend />
						<Line
							type="monotone"
							dataKey="overall_wellness"
							stroke="#10b981"
							strokeWidth={2}
							name="Overall Wellness"
						/>
						<Line
							type="monotone"
							dataKey="stress_level"
							stroke="#ef4444"
							strokeWidth={2}
							name="Stress Level"
						/>
						<Line
							type="monotone"
							dataKey="emotional_state"
							stroke="#3b82f6"
							strokeWidth={2}
							name="Emotional State"
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* Wellness Distribution */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-white p-6 rounded-lg shadow">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Wellness Score Distribution</h3>
					<ResponsiveContainer width="100%" height={250}>
						<PieChart>
							<Pie
								data={distributionData}
								cx="50%"
								cy="50%"
								labelLine={false}
								label={({ name, value }) => `${name}: ${value}`}
								outerRadius={80}
								fill="#8884d8"
								dataKey="value"
							>
								{distributionData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
							<Tooltip />
						</PieChart>
					</ResponsiveContainer>
				</div>

				<div className="bg-white p-6 rounded-lg shadow">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Wellness Metrics Comparison</h3>
					<ResponsiveContainer width="100%" height={250}>
						<BarChart data={chartData.slice(-10)}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="date" />
							<YAxis domain={[0, 100]} />
							<Tooltip />
							<Legend />
							<Bar dataKey="overall_wellness" fill="#10b981" name="Overall Wellness" />
							<Bar dataKey="stress_level" fill="#ef4444" name="Stress Level" />
							<Bar dataKey="emotional_state" fill="#3b82f6" name="Emotional State" />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Recent Analysis Summary */}
			<div className="bg-white p-6 rounded-lg shadow">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Analysis Summary</h3>
				<div className="space-y-3">
					{metricsData.reports.slice(0, 5).map((report, index) => (
						<div key={index} className="flex items-center justify-between border-b pb-3">
							<div className="flex items-center">
								<span className="text-lg mr-3">
									{report.analysis_type === 'chat' ? '💬' : '🎯'}
								</span>
								<div>
									<div className="font-medium text-gray-900 capitalize">
										{report.analysis_type} Analysis
									</div>
									<div className="text-sm text-gray-500">
										{new Date(report.created_at).toLocaleDateString()}
									</div>
								</div>
							</div>
							<div className="text-right">
								<div className="text-lg font-semibold text-gray-900">
									{Math.round(report.wellness_scores?.overall_wellness || 0)}%
								</div>
								{report.critical_alert && (
									<div className="text-xs text-red-600 font-medium">Critical Alert</div>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}