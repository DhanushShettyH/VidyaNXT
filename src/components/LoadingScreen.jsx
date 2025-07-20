// AI Loading Component
const LoadingScreen = ({ title, loadingText }) => {
	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
				{/* Animated AI Brain */}
				<div className="relative w-20 h-20 mx-auto mb-6">
					<div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-indigo-600 animate-pulse"></div>
					<div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
						<div className="w-8 h-8 relative">
							{/* Animated dots representing neural network */}
							<div
								className="absolute w-2 h-2 bg-purple-600 rounded-full animate-bounce"
								style={{ top: '0px', left: '12px' }}
							></div>
							<div
								className="absolute w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
								style={{ top: '12px', left: '0px', animationDelay: '0.1s' }}
							></div>
							<div
								className="absolute w-2 h-2 bg-purple-600 rounded-full animate-bounce"
								style={{ top: '12px', left: '24px', animationDelay: '0.2s' }}
							></div>
							<div
								className="absolute w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
								style={{ top: '24px', left: '12px', animationDelay: '0.3s' }}
							></div>
							{/* Connecting lines */}
							<div
								className="absolute w-0.5 h-3 bg-purple-300 rotate-45"
								style={{ top: '8px', left: '7px' }}
							></div>
							<div
								className="absolute w-0.5 h-3 bg-purple-300 -rotate-45"
								style={{ top: '8px', left: '20px' }}
							></div>
							<div
								className="absolute w-0.5 h-3 bg-purple-300 rotate-45"
								style={{ top: '13px', left: '7px' }}
							></div>
							<div
								className="absolute w-0.5 h-3 bg-purple-300 -rotate-45"
								style={{ top: '13px', left: '20px' }}
							></div>
						</div>
					</div>
				</div>

				{/* Loading Text */}
				<h3 className="text-xl font-semibold text-gray-800 mb-3">
					{title}
				</h3>
				<p className="text-gray-600 mb-4">
					{loadingText}
				</p>

				{/* Progress dots */}
				<div className="flex justify-center space-x-2">
					<div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
					<div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
					<div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
				</div>
			</div>
		</div>
	);
};


export default LoadingScreen;