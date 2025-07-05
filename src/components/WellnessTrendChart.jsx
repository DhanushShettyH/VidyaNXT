import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function WellnessTrendChart({ data, type = 'line', title, color = '#3B82F6' }) {

	if (!data || data.length === 0) {
		return (
			<div className="bg-white p-6 rounded-lg shadow">
				<h3 className="text-lg font-semibold mb-4">{title}</h3>
				<div className="text-center py-8">
					<div className="text-gray-400 text-4xl mb-2">📊</div>
					<p className="text-gray-500">No data available for chart</p>
				</div>
			</div>
		);
	}

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	};

	const CustomTooltip = ({ active, payload, label }) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
					<p className="font-medium">{`Date: ${formatDate(label)}`}</p>
					{payload.map((entry, index) => (
						<p key={index} style={{ color: entry.color }}>
							{`${entry.name}: ${Math.round(entry.value)}${entry.name.includes('Score') ? '%' : ''}`}
						</p>
					))}
				</div>
			);
		}
		return null;
	};

	return (
		<div className="bg-white p-6 rounded-lg shadow">
			<h3 className="text-lg font-semibold mb-4">{title}</h3>
			<div className="h-64">
				<ResponsiveContainer width="100%" height="100%">
					{type === 'line' ? (
						<LineChart data={data}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis
								dataKey="date"
								tickFormatter={formatDate}
								tick={{ fontSize: 12 }}
							/>
							<YAxis
								domain={[0, 100]}
								tick={{ fontSize: 12 }}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Line
								type="monotone"
								dataKey="wellness_score"
								stroke={color}
								strokeWidth={2}
								dot={{ fill: color, strokeWidth: 2, r: 4 }}
								activeDot={{ r: 6 }}
								name="Wellness Score"
							/>
						</LineChart>
					) : (
						<BarChart data={data}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis
								dataKey="date"
								tickFormatter={formatDate}
								tick={{ fontSize: 12 }}
							/>
							<YAxis
								domain={[0, 100]}
								tick={{ fontSize: 12 }}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Bar
								dataKey="wellness_score"
								fill={color}
								name="Wellness Score"
							/>
						</BarChart>
					)}
				</ResponsiveContainer>
			</div>
		</div>
	);
}