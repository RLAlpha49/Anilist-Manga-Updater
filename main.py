"""
This module runs the main GUI of the application using the subprocess module.
"""

import os
import sys
import subprocess

# Check if we're running in a PyInstaller bundle
if getattr(sys, "frozen", False):
    application_path = sys._MEIPASS  # pylint: disable=W0212
else:
    application_path = os.path.dirname(os.path.abspath(__file__))

gui_script_path = os.path.join(application_path, "Program", "Main", "GUI.py")

try:
    subprocess.run(["python", gui_script_path], check=True)
except subprocess.CalledProcessError as e:
    print(f"An error occurred: {e.output}")
    input("Press enter to exit.")
