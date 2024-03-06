"""
This module runs the main GUI of the application using the subprocess module.
"""

# pylint: disable=W0212

import os
import subprocess
import sys

from Program.Utils.log import log # pylint: disable=E0401, E0611

# Check if we're running in a PyInstaller bundle
if getattr(sys, "frozen", False):
    application_path = sys._MEIPASS  # type: ignore
    log("Running in a PyInstaller bundle.")
else:
    application_path = os.path.dirname(os.path.abspath(__file__))
    log("Running in a normal Python environment.")

log(f"Application path: {application_path}")

gui_script_path = os.path.join(application_path, "Program", "Main", "GUI.py")
log(f"GUI script path: {gui_script_path}")

try:
    log("Starting GUI script...")
    subprocess.run(["python", gui_script_path], check=True)
    log("GUI script finished successfully.")
except subprocess.CalledProcessError as e:
    log(f"An error occurred while running the GUI script: {e.output}")
    input("Press enter to exit.")
