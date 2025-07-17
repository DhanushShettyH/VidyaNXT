// src/pages/ContentHub.jsx
import React, { useState } from 'react';
import { ArrowLeft, Sparkles, BookOpen, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ContentGenerator from '../components/ContentGenerator';
import ContentLibrary from '../components/ContentLibrary';

const ContentHub = () => {
	const [activeTab, setActiveTab] = useState('generate');
	const navigate = useNavigate();

	const tabs = [
		{
			id: 'generate',
			name: 'Generate Content',
			icon: Sparkles,
			description: 'Create new educational content with AI'
		},
		{
			id: 'library',
			name: 'My Library',
			icon: BookOpen,
			description: 'Access your saved content'
		}
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">

			{/* Navigation Header */}
			<div className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-6xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<button
								onClick={() => navigate('/home')}
								className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
							>
								<ArrowLeft className="w-5 h-5" />
								<span>Back to Home</span>
							</button>
							<div className="h-6 border-l border-gray-300"></div>
							<h1 className="text-xl font-semibold text-gray-800">Content Hub</h1>
						</div>

						<div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${activeTab === tab.id
												? 'bg-white text-blue-600 shadow-sm'
												: 'text-gray-600 hover:text-gray-800'
											}`}
									>
										<Icon className="w-4 h-4" />
										<span className="font-medium">{tab.name}</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Tab Content */}
			<div className="flex-1">
				{activeTab === 'generate' && <ContentGenerator />}
				{activeTab === 'library' && <ContentLibrary />}
			</div>
		</div>
	);
};

export default ContentHub;