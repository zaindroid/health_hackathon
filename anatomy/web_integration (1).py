"""
Web Integration Example for Anatomy Navigator
This module provides a REST API to connect the Python navigation tool calls
to the HTML/JavaScript frontend.

Requirements:
    pip install flask flask-cors
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from anatomy_navigator import AnatomyNavigator
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Initialize the navigator
navigator = AnatomyNavigator()


@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_file('index_with_api.html')


@app.route('/api/navigate/front', methods=['POST'])
def navigate_front():
    """
    API Endpoint: Navigate to front view

    Request Body (optional):
        {
            "model_id": "neck_shoulders_upper_back"
        }

    Returns:
        Camera command with coordinates
    """
    data = request.get_json() or {}
    model_id = data.get('model_id')

    result = navigator.show_front_view(model_id)
    return jsonify(result)


@app.route('/api/navigate/back', methods=['POST'])
def navigate_back():
    """
    API Endpoint: Navigate to back view

    Request Body (optional):
        {
            "model_id": "neck_shoulders_upper_back"
        }

    Returns:
        Camera command with coordinates
    """
    data = request.get_json() or {}
    model_id = data.get('model_id')

    result = navigator.show_back_view(model_id)
    return jsonify(result)


@app.route('/api/navigate/right-shoulder', methods=['POST'])
def navigate_right_shoulder():
    """
    API Endpoint: Navigate to right shoulder view

    Request Body (optional):
        {
            "model_id": "neck_shoulders_upper_back"
        }

    Returns:
        Camera command with coordinates
    """
    data = request.get_json() or {}
    model_id = data.get('model_id')

    result = navigator.show_right_shoulder(model_id)
    return jsonify(result)


@app.route('/api/navigate/left-shoulder', methods=['POST'])
def navigate_left_shoulder():
    """
    API Endpoint: Navigate to left shoulder view

    Request Body (optional):
        {
            "model_id": "neck_shoulders_upper_back"
        }

    Returns:
        Camera command with coordinates
    """
    data = request.get_json() or {}
    model_id = data.get('model_id')

    result = navigator.show_left_shoulder(model_id)
    return jsonify(result)


@app.route('/api/navigate/<viewpoint_id>', methods=['POST'])
def navigate_to_viewpoint(viewpoint_id):
    """
    API Endpoint: Navigate to any viewpoint by ID

    URL Parameters:
        viewpoint_id: The ID of the viewpoint (e.g., 'front', 'back')

    Request Body (optional):
        {
            "model_id": "neck_shoulders_upper_back"
        }

    Returns:
        Camera command with coordinates
    """
    data = request.get_json() or {}
    model_id = data.get('model_id')

    result = navigator.navigate_to_viewpoint(viewpoint_id, model_id)
    return jsonify(result)


@app.route('/api/viewpoints', methods=['GET'])
def list_viewpoints():
    """
    API Endpoint: List all available viewpoints

    Query Parameters:
        model_id (optional): The model ID to query

    Returns:
        List of available viewpoints
    """
    model_id = request.args.get('model_id')
    result = navigator.list_available_viewpoints(model_id)
    return jsonify(result)


@app.route('/api/models', methods=['GET'])
def list_models():
    """
    API Endpoint: List all available models

    Returns:
        List of available anatomical models
    """
    models = []
    for model in navigator.data.get("models", []):
        models.append({
            "id": model.get("id"),
            "name": model.get("name"),
            "description": model.get("description")
        })

    return jsonify({
        "models": models,
        "count": len(models)
    })


@app.route('/api/search/anatomy', methods=['POST'])
def search_anatomy():
    """
    API Endpoint: Search for anatomy objects by name

    Request Body:
        {
            "searchTerm": "trapezius",
            "sceneObjects": { ... } // Object data from scene.info
        }

    Returns:
        List of matching object IDs and names
    """
    data = request.get_json() or {}
    search_term = data.get('searchTerm', '')
    scene_objects = data.get('sceneObjects', {})

    if not search_term:
        return jsonify({"error": "searchTerm is required"}), 400

    if not scene_objects:
        return jsonify({"error": "sceneObjects is required"}), 400

    result = navigator.search_anatomy_objects(search_term, scene_objects)
    return jsonify(result)


@app.route('/api/focus/anatomy', methods=['POST'])
def focus_anatomy():
    """
    API Endpoint: Focus on a specific anatomy object

    Request Body:
        {
            "objectId": "human_20_male_muscular_system-right_trapezius_ID",
            "objectName": "Right trapezius"
        }

    Returns:
        Camera focus command
    """
    data = request.get_json() or {}
    object_id = data.get('objectId', '')
    object_name = data.get('objectName', '')

    if not object_id:
        return jsonify({"error": "objectId is required"}), 400

    result = navigator.focus_on_anatomy(object_id, object_name)
    return jsonify(result)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Anatomy Navigator API",
        "version": "1.0"
    })


if __name__ == '__main__':
    print("=" * 60)
    print("ANATOMY NAVIGATOR - Web API Server")
    print("=" * 60)
    print("\n>>> Open your browser and go to: http://localhost:5000")
    print("\nAvailable Endpoints:")
    print("  GET  /                            - Main web interface")
    print("  POST /api/navigate/front          - Navigate to front view")
    print("  POST /api/navigate/back           - Navigate to back view")
    print("  POST /api/navigate/right-shoulder - Navigate to right shoulder")
    print("  POST /api/navigate/left-shoulder  - Navigate to left shoulder")
    print("  POST /api/navigate/<viewpoint_id> - Navigate to any viewpoint")
    print("  POST /api/search/anatomy          - Search and highlight muscles")
    print("  POST /api/focus/anatomy           - Focus on specific muscle")
    print("  GET  /api/viewpoints              - List available viewpoints")
    print("  GET  /api/models                  - List available models")
    print("  GET  /api/health                  - Health check")
    print("\nStarting server on http://localhost:5000")
    print("=" * 60)

    app.run(debug=True, port=5000)
