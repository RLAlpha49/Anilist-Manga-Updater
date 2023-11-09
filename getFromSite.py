from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import webbrowser

edge_path = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
edge_config_path = 'msedgeconfig.json'

# Create Microsoft Edge WebDriver with specified options
edge_options = webdriver.EdgeOptions()
edge_options.use_chromium = True
edge_options.binary_location = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
edge_options.add_argument(f'--msedge --msedge-path="{edge_config_path}"')

edge_driver = webdriver.Edge(options=edge_options)
webbrowser.register('edge', None, webbrowser.BackgroundBrowser(edge_path))