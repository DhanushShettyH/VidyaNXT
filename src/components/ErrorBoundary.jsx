import React from 'react';

class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			showDetails: false
		};
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo) {
		// you could also log to an external service here
		this.setState({ errorInfo });
		console.error('[ErrorBoundary]', error, errorInfo);
	}

	toggleDetails = () =>
		this.setState((s) => ({ showDetails: !s.showDetails }));

	handleReload = () => window.location.reload();

	render() {
		const { hasError, error, errorInfo, showDetails } = this.state;
		if (!hasError) {
			return this.props.children;
		}

		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
				<div className="max-w-lg w-full bg-white border border-red-200 rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-semibold text-red-600 mb-2">
						Oops! An error occurred.
					</h1>
					<p className="text-gray-700 mb-4">
						<span className="font-medium">Message:</span> {error?.toString()}
					</p>

					<div className="flex space-x-2 mb-4">
						<button
							onClick={this.toggleDetails}
							className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
						>
							{showDetails ? 'Hide Details' : 'Show Details'}
						</button>
						<button
							onClick={this.handleReload}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
						>
							Reload Page
						</button>
					</div>

					{showDetails && errorInfo && (
						<pre className="bg-gray-100 text-xs text-gray-800 p-4 rounded overflow-auto">
							{errorInfo.componentStack}
						</pre>
					)}
				</div>
			</div>
		);
	}
}

export default ErrorBoundary;
