from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import webbrowser

# Define the path to the Microsoft Edge executable
edge_path = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
# Define the path to the Microsoft Edge configuration file
edge_config_path = 'msedgeconfig.json'

# Create Microsoft Edge WebDriver options
edge_options = webdriver.EdgeOptions()
# Use Chromium
edge_options.use_chromium = True
# Specify the path to the Microsoft Edge executable
edge_options.binary_location = edge_path
# Add arguments to the WebDriver
edge_options.add_argument(f'--msedge --msedge-path="{edge_config_path}"')

# Create Microsoft Edge WebDriver with the specified options
edge_driver = webdriver.Edge(options=edge_options)
# Register Microsoft Edge as the browser to be used by the webbrowser module
webbrowser.register('edge', None, webbrowser.BackgroundBrowser(edge_path))