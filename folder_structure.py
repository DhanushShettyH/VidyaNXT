#!/usr/bin/env python3
import os
import sys
from pathlib import Path

def should_ignore(name, ignore_patterns):
    """Check if file/folder should be ignored based on patterns"""
    for pattern in ignore_patterns:
        # Exact match
        if name == pattern:
            return True
        # Pattern matching (for extensions and wildcards)
        if pattern.startswith('*') and name.endswith(pattern[1:]):
            return True
        # Prefix matching for hidden files/folders
        if pattern.startswith('.') and name.startswith(pattern):
            return True
        # Contains matching
        if not pattern.startswith('.') and not pattern.startswith('*') and pattern in name:
            return True
    return False

def get_project_structure(root_path, ignore_patterns=None, max_depth=None):
    """Generate project structure as a tree"""
    if ignore_patterns is None:
        ignore_patterns = [
            'node_modules', '.git', '__pycache__', '.pytest_cache',
            'venv', 'env', '.venv', 'build', 'dist', '.next',
            '.nuxt', 'coverage', '.nyc_output', 'logs', '.DS_Store',
            'Thumbs.db', '.idea', '.vscode', '.vs', '*.pyc', '*.pyo',
            '*.pyd', '.egg-info', '.tox', '.coverage', '.cache',
            'target', 'vendor', 'bin', 'obj', '.sass-cache',
            'tmp', 'temp', '.angular', '.svelte-kit', '.turbo'
        ]
    
    def _build_tree(path, prefix="", depth=0):
        """Recursively build the tree structure"""
        if max_depth is not None and depth > max_depth:
            return ""
        
        items = []
        try:
            items = sorted(os.listdir(path))
        except PermissionError:
            return f"{prefix}[Permission Denied]\n"
        
        # Filter out ignored items
        items = [item for item in items if not should_ignore(item, ignore_patterns)]
        
        tree_str = ""
        for i, item in enumerate(items):
            item_path = os.path.join(path, item)
            is_last = i == len(items) - 1
            
            # Choose the appropriate prefix
            current_prefix = "└── " if is_last else "├── "
            next_prefix = "    " if is_last else "│   "
            
            # Add file/folder icon
            if os.path.isdir(item_path):
                icon = "📁 "
                tree_str += f"{prefix}{current_prefix}{icon}{item}/\n"
                # Recursively process subdirectories
                tree_str += _build_tree(item_path, prefix + next_prefix, depth + 1)
            else:
                # Add file icon based on extension
                ext = os.path.splitext(item)[1].lower()
                icon = get_file_icon(ext)
                tree_str += f"{prefix}{current_prefix}{icon}{item}\n"
        
        return tree_str
    
    return _build_tree(root_path)

def get_file_icon(extension):
    """Get appropriate icon for file extension"""
    icons = {
        '.py': '🐍 ', '.js': '📜 ', '.ts': '📘 ', '.jsx': '⚛️ ', '.tsx': '⚛️ ',
        '.html': '🌐 ', '.css': '🎨 ', '.scss': '🎨 ', '.sass': '🎨 ',
        '.json': '📋 ', '.xml': '📄 ', '.yaml': '⚙️ ', '.yml': '⚙️ ',
        '.md': '📝 ', '.txt': '📄 ', '.pdf': '📕 ', '.doc': '📄 ', '.docx': '📄 ',
        '.jpg': '🖼️ ', '.jpeg': '🖼️ ', '.png': '🖼️ ', '.gif': '🖼️ ', '.svg': '🖼️ ',
        '.mp4': '🎬 ', '.mp3': '🎵 ', '.wav': '🎵 ', '.avi': '🎬 ',
        '.zip': '📦 ', '.tar': '📦 ', '.gz': '📦 ', '.rar': '📦 ',
        '.exe': '⚙️ ', '.dll': '⚙️ ', '.so': '⚙️ ',
        '.sql': '🗄️ ', '.db': '🗄️ ', '.sqlite': '🗄️ ',
        '.env': '🔐 ', '.gitignore': '🚫 ', '.dockerignore': '🐳 ',
        '.dockerfile': '🐳 ', '.docker': '🐳 '
    }
    return icons.get(extension, '📄 ')

def save_structure_to_file(structure, filename="project_structure.txt"):
    """Save the project structure to a file"""
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(structure)
    print(f"Project structure saved to {filename}")

def main():
    # Get current directory or use provided path
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    # Configuration options
    max_depth = None  # Set to a number to limit depth (e.g., 3)
    save_to_file = True  # Set to False to only print to console
    
    # Additional ignore patterns (add your own)
    custom_ignore = [
        # Build/dependency directories
        'node_modules', '.git', '__pycache__', '.pytest_cache',
        'venv', 'env', '.venv', 'build', 'dist', '.next',
        '.nuxt', 'coverage', '.nyc_output', 'logs', '.DS_Store',
        'Thumbs.db', '.idea', '.vscode', '.vs', '.egg-info',
        '.tox', '.coverage', '.cache', 'target', 'vendor',
        'bin', 'obj', '.sass-cache', 'tmp', 'temp',
        '.angular', '.svelte-kit', '.turbo', '.parcel-cache',
        # File patterns
        '*.pyc', '*.pyo', '*.pyd', '*.class', '*.o', '*.so',
        # Add more patterns as needed
    ]
    
    print(f"📊 Generating project structure for: {os.path.abspath(project_path)}")
    print("=" * 60)
    
    # Generate structure
    structure = get_project_structure(project_path, ignore_patterns=custom_ignore, max_depth=max_depth)
    
    # Add header
    header = f"Project Structure: {os.path.basename(os.path.abspath(project_path))}\n"
    header += f"Path: {os.path.abspath(project_path)}\n"
    header += "=" * 60 + "\n\n"
    
    full_structure = header + structure
    
    # Print to console
    print(full_structure)
    
    # Save to file if requested
    if save_to_file:
        save_structure_to_file(full_structure)

if __name__ == "__main__":
    main()