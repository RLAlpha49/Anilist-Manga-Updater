"""
This file contains Python dictionaries used to store:
- Alternative titles
- Format cache
- Title cache
"""

# pylint: disable=C0301, C0302
# flake8: noqa: E501

import json
import os
import sys

# Define the base path
base_path = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
base_path = os.path.dirname(os.path.dirname(base_path))

# Define the path to the Resources folder
resources_path: str = os.path.join(base_path, "Resources")

# Define the names of the JSON files
alternative_titles_file: str = os.path.join(resources_path, "alternative_titles.json")
format_cache_file: str = os.path.join(resources_path, "format_cache.json")
title_cache_file: str = os.path.join(resources_path, "title_cache.json")

# Load the JSON files into Python dictionaries
with open(alternative_titles_file, "r", encoding="utf-8") as file:
    alternative_titles_dict = json.load(file)

with open(format_cache_file, "r", encoding="utf-8") as file:
    cache_format_dict = json.load(file)

with open(title_cache_file, "r", encoding="utf-8") as file:
    cache_title_dict = json.load(file)
