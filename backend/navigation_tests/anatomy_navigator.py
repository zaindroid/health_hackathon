"""
Anatomy Navigator - Tool Call System for 3D Anatomy Viewer
This module provides tool calls for navigating the 3D anatomy viewer
by looking up camera coordinates from the database and panning the camera.
"""

import json
from typing import Dict, Optional, Any
from dataclasses import dataclass


@dataclass
class CameraPosition:
    """Represents a 3D camera position and target"""
    position: Dict[str, float]
    target: Dict[str, float]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API calls"""
        return {
            "position": self.position,
            "target": self.target
        }


class AnatomyNavigator:
    """
    Navigation system for 3D anatomy viewer.
    Provides tool calls for camera movement based on anatomical viewpoints.
    """

    def __init__(self, database_path: str = "anatomy-data.json"):
        """
        Initialize the navigator with anatomy database.

        Args:
            database_path: Path to the anatomy-data.json file
        """
        self.database_path = database_path
        self.data = self._load_database()
        self.current_model_id = "neck_shoulders_upper_back"  # Default model

    def _load_database(self) -> Dict:
        """Load the anatomy database from JSON file"""
        with open(self.database_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def get_model_by_id(self, model_id: str) -> Optional[Dict]:
        """
        Look up a model in the database by its ID.

        Args:
            model_id: The unique identifier of the model

        Returns:
            Model data dictionary or None if not found
        """
        for model in self.data.get("models", []):
            if model.get("id") == model_id:
                return model
        return None

    def get_viewpoint_camera(self, model_id: str, viewpoint_id: str) -> Optional[CameraPosition]:
        """
        Look up camera coordinates for a specific viewpoint.

        Args:
            model_id: The model identifier (e.g., "neck_shoulders_upper_back")
            viewpoint_id: The viewpoint identifier (e.g., "front", "back")

        Returns:
            CameraPosition object or None if not found
        """
        model = self.get_model_by_id(model_id)
        if not model:
            print(f"[-] Model not found: {model_id}")
            return None

        for viewpoint in model.get("viewpoints", []):
            if viewpoint.get("id") == viewpoint_id:
                camera_data = viewpoint.get("camera", {})
                return CameraPosition(
                    position=camera_data.get("position", {}),
                    target=camera_data.get("target", {})
                )

        print(f"[-] Viewpoint not found: {viewpoint_id} in model {model_id}")
        return None

    def camera_pan_to(self, position: CameraPosition, animate: bool = True, duration: int = 1000) -> Dict[str, Any]:
        """
        Generate camera pan command for the viewer API.

        Args:
            position: CameraPosition object with target coordinates
            animate: Whether to animate the camera movement
            duration: Animation duration in milliseconds

        Returns:
            Dictionary containing the camera command
        """
        command = {
            "action": "camera.set",
            "params": {
                "position": position.position,
                "target": position.target,
                "animate": animate,
                "duration": duration
            }
        }
        return command

    # ==================== TOOL CALLS ====================
    # These are the main navigation tool calls

    def show_front_view(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """
        TOOL CALL: Navigate to front view

        Steps:
        1. Look up the model in database
        2. Find coordinates for "front" viewpoint
        3. Pan camera to front view

        Args:
            model_id: Optional model ID (defaults to current model)

        Returns:
            Camera command dictionary
        """
        model_id = model_id or self.current_model_id

        print(f"[*] Step 1: Looking up model '{model_id}' in database...")
        model = self.get_model_by_id(model_id)
        if not model:
            return {"error": f"Model '{model_id}' not found"}

        print(f"[+] Found model: {model['name']}")

        print(f"[*] Step 2: Finding coordinates for 'front' viewpoint...")
        camera_pos = self.get_viewpoint_camera(model_id, "front")
        if not camera_pos:
            return {"error": "Front viewpoint not found"}

        print(f"[+] Found coordinates: position={camera_pos.position}, target={camera_pos.target}")

        print(f"[>] Step 3: Panning camera to front view...")
        command = self.camera_pan_to(camera_pos)
        print(f"[+] Camera command generated")

        return command

    def show_back_view(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """
        TOOL CALL: Navigate to back view

        Steps:
        1. Look up the model in database
        2. Find coordinates for "back" viewpoint
        3. Pan camera to back view

        Args:
            model_id: Optional model ID (defaults to current model)

        Returns:
            Camera command dictionary
        """
        model_id = model_id or self.current_model_id

        print(f"[*] Step 1: Looking up model '{model_id}' in database...")
        model = self.get_model_by_id(model_id)
        if not model:
            return {"error": f"Model '{model_id}' not found"}

        print(f"[+] Found model: {model['name']}")

        print(f"[*] Step 2: Finding coordinates for 'back' viewpoint...")
        camera_pos = self.get_viewpoint_camera(model_id, "back")
        if not camera_pos:
            return {"error": "Back viewpoint not found"}

        print(f"[+] Found coordinates: position={camera_pos.position}, target={camera_pos.target}")

        print(f"[>] Step 3: Panning camera to back view...")
        command = self.camera_pan_to(camera_pos)
        print(f"[+] Camera command generated")

        return command

    def show_right_shoulder(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """
        TOOL CALL: Navigate to right shoulder view

        Steps:
        1. Look up the model in database
        2. Find coordinates for "right_shoulder" viewpoint
        3. Pan camera to right shoulder

        Args:
            model_id: Optional model ID (defaults to current model)

        Returns:
            Camera command dictionary
        """
        model_id = model_id or self.current_model_id

        print(f"[*] Step 1: Looking up model '{model_id}' in database...")
        model = self.get_model_by_id(model_id)
        if not model:
            return {"error": f"Model '{model_id}' not found"}

        print(f"[+] Found model: {model['name']}")

        print(f"[*] Step 2: Finding coordinates for 'right_shoulder' viewpoint...")
        camera_pos = self.get_viewpoint_camera(model_id, "right_shoulder")
        if not camera_pos:
            return {"error": "Right shoulder viewpoint not found"}

        print(f"[+] Found coordinates: position={camera_pos.position}, target={camera_pos.target}")

        print(f"[>] Step 3: Panning camera to right shoulder...")
        command = self.camera_pan_to(camera_pos)
        print(f"[+] Camera command generated")

        return command

    def show_left_shoulder(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """
        TOOL CALL: Navigate to left shoulder view

        Steps:
        1. Look up the model in database
        2. Find coordinates for "left_shoulder" viewpoint
        3. Pan camera to left shoulder

        Args:
            model_id: Optional model ID (defaults to current model)

        Returns:
            Camera command dictionary
        """
        model_id = model_id or self.current_model_id

        print(f"[*] Step 1: Looking up model '{model_id}' in database...")
        model = self.get_model_by_id(model_id)
        if not model:
            return {"error": f"Model '{model_id}' not found"}

        print(f"[+] Found model: {model['name']}")

        print(f"[*] Step 2: Finding coordinates for 'left_shoulder' viewpoint...")
        camera_pos = self.get_viewpoint_camera(model_id, "left_shoulder")
        if not camera_pos:
            return {"error": "Left shoulder viewpoint not found"}

        print(f"[+] Found coordinates: position={camera_pos.position}, target={camera_pos.target}")

        print(f"[>] Step 3: Panning camera to left shoulder...")
        command = self.camera_pan_to(camera_pos)
        print(f"[+] Camera command generated")

        return command

    def navigate_to_viewpoint(self, viewpoint_id: str, model_id: Optional[str] = None) -> Dict[str, Any]:
        """
        TOOL CALL: Generic navigation to any viewpoint

        Steps:
        1. Look up the model in database
        2. Find coordinates for the specified viewpoint
        3. Pan camera to that viewpoint

        Args:
            viewpoint_id: ID of the viewpoint to navigate to
            model_id: Optional model ID (defaults to current model)

        Returns:
            Camera command dictionary
        """
        model_id = model_id or self.current_model_id

        print(f"[*] Step 1: Looking up model '{model_id}' in database...")
        model = self.get_model_by_id(model_id)
        if not model:
            return {"error": f"Model '{model_id}' not found"}

        print(f"[+] Found model: {model['name']}")

        print(f"[*] Step 2: Finding coordinates for '{viewpoint_id}' viewpoint...")
        camera_pos = self.get_viewpoint_camera(model_id, viewpoint_id)
        if not camera_pos:
            return {"error": f"Viewpoint '{viewpoint_id}' not found"}

        print(f"[+] Found coordinates: position={camera_pos.position}, target={camera_pos.target}")

        print(f"[>] Step 3: Panning camera to {viewpoint_id}...")
        command = self.camera_pan_to(camera_pos)
        print(f"[+] Camera command generated")

        return command

    def list_available_viewpoints(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """
        TOOL CALL: List all available viewpoints for a model

        Args:
            model_id: Optional model ID (defaults to current model)

        Returns:
            Dictionary with viewpoint information
        """
        model_id = model_id or self.current_model_id

        print(f"[*] Looking up model '{model_id}' in database...")
        model = self.get_model_by_id(model_id)
        if not model:
            return {"error": f"Model '{model_id}' not found"}

        viewpoints = []
        for vp in model.get("viewpoints", []):
            viewpoints.append({
                "id": vp.get("id"),
                "name": vp.get("name"),
                "buttonLabel": vp.get("buttonLabel"),
                "description": vp.get("description")
            })

        print(f"[+] Found {len(viewpoints)} viewpoints")
        return {
            "model": model.get("name"),
            "viewpoints": viewpoints
        }

    def search_anatomy_objects(self, search_term: str, scene_objects: Dict[str, Any]) -> Dict[str, Any]:
        """
        TOOL CALL: Search for anatomy objects by name

        This tool searches through the scene objects to find muscles or anatomy parts
        that match the search term. For example, searching for "trapezius" will find
        both left and right trapezius muscles.

        Steps:
        1. Normalize the search term (lowercase, remove extra spaces)
        2. Search through all scene objects for matching names
        3. Return list of matching object IDs and names

        Args:
            search_term: The muscle or anatomy name to search for (e.g., "trapezius")
            scene_objects: Dictionary of scene objects from BioDigital API (scene.info)

        Returns:
            Dictionary containing matched objects with IDs and names
        """
        print(f"[*] Step 1: Searching for '{search_term}' in scene objects...")

        # Normalize search term
        search_term_lower = search_term.lower().strip()

        # Search for matches
        matched_objects = []
        for object_id, obj_data in scene_objects.items():
            object_name = obj_data.get("name", "").lower()

            # Check if search term is in the object name
            if search_term_lower in object_name:
                matched_objects.append({
                    "objectId": object_id,
                    "name": obj_data.get("name"),
                    "displayName": obj_data.get("name")
                })
                print(f"[+] Found match: {obj_data.get('name')} (ID: {object_id})")

        print(f"[+] Found {len(matched_objects)} matching objects")

        return {
            "searchTerm": search_term,
            "matchCount": len(matched_objects),
            "matches": matched_objects,
            "action": "anatomy.select" if matched_objects else None
        }

    def focus_on_anatomy(self, object_id: str, object_name: str) -> Dict[str, Any]:
        """
        TOOL CALL: Focus on a specific anatomy object

        This tool generates the camera focus command to highlight and zoom to
        a specific anatomy object in the 3D viewer. Uses the formatData: 'focus'
        pattern from Human Components.

        Steps:
        1. Validate the object ID
        2. Generate camera.flyTo command to focus on the object
        3. Return the focus command

        Args:
            object_id: The BioDigital object ID (e.g., "human_20_male_muscular_system-right_trapezius_ID")
            object_name: The display name of the object (e.g., "Right trapezius")

        Returns:
            Dictionary containing the focus command
        """
        print(f"[*] Step 1: Preparing focus command for '{object_name}' (ID: {object_id})...")

        if not object_id:
            return {"error": "Object ID is required"}

        print(f"[*] Step 2: Generating camera.flyTo command...")

        focus_command = {
            "action": "camera.flyTo",
            "params": {
                "objectId": object_id
            },
            "objectName": object_name
        }

        print(f"[+] Focus command generated for {object_name}")

        return focus_command


# ==================== USAGE EXAMPLE ====================

if __name__ == "__main__":
    # Initialize the navigator
    print("=" * 60)
    print("ANATOMY NAVIGATOR - Tool Call System")
    print("=" * 60)
    print()

    navigator = AnatomyNavigator()

    # Example 1: Show front view
    print("\n" + "=" * 60)
    print("TOOL CALL: show_front_view()")
    print("=" * 60)
    result = navigator.show_front_view()
    print("\n[OUTPUT] Result:")
    print(json.dumps(result, indent=2))

    # Example 2: Show right shoulder
    print("\n" + "=" * 60)
    print("TOOL CALL: show_right_shoulder()")
    print("=" * 60)
    result = navigator.show_right_shoulder()
    print("\n[OUTPUT] Result:")
    print(json.dumps(result, indent=2))

    # Example 3: Show back view
    print("\n" + "=" * 60)
    print("TOOL CALL: show_back_view()")
    print("=" * 60)
    result = navigator.show_back_view()
    print("\n[OUTPUT] Result:")
    print(json.dumps(result, indent=2))

    # Example 4: Show left shoulder
    print("\n" + "=" * 60)
    print("TOOL CALL: show_left_shoulder()")
    print("=" * 60)
    result = navigator.show_left_shoulder()
    print("\n[OUTPUT] Result:")
    print(json.dumps(result, indent=2))

    # Example 5: List all available viewpoints
    print("\n" + "=" * 60)
    print("TOOL CALL: list_available_viewpoints()")
    print("=" * 60)
    result = navigator.list_available_viewpoints()
    print("\n[OUTPUT] Result:")
    print(json.dumps(result, indent=2))

    # Example 6: Generic navigation
    print("\n" + "=" * 60)
    print("TOOL CALL: navigate_to_viewpoint('front')")
    print("=" * 60)
    result = navigator.navigate_to_viewpoint("front")
    print("\n[OUTPUT] Result:")
    print(json.dumps(result, indent=2))
