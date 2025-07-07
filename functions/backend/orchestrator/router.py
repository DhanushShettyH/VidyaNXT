class Router:
    def __init__(self):
        self.routes = {}
    
    def register(self, action, handler):
        """Register a route handler"""
        self.routes[action] = handler
    
    def route(self, action, data):
        """Route request to appropriate handler"""
        if action not in self.routes:
            raise ValueError(f"Unknown action: {action}")
        
        handler = self.routes[action]
        return handler(data)