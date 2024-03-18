"""
This module contains the Cache class which provides a simple caching mechanism.
It stores key-value pairs in a JSON file located in the Manga_Data directory.
"""

import json
import os

from Utils.dictionaries import cache_title_dict, cache_format_dict  # pylint: disable=E0401
from Utils.log import Logger  # pylint: disable=E0401


class Cache:
    """
    A simple caching class that stores key-value pairs in a JSON file.

    Attributes:
    cache_file (str): The path to the file where the cache is stored.
    cache (dict): The cache data.
    """

    def __init__(self, cache_file):
        self.cache_file = cache_file
        Logger.INFO(f"Cache initialized with file: {self.cache_file}")
        self.load_cache()

    def load_cache(self):
        """
        Loads the cache from a file.
        """
        Logger.INFO("Loading cache from file.")
        try:
            os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
            with open(self.cache_file, "r", encoding="utf-8") as f:
                self.cache = json.load(f)
            Logger.INFO("Cache loaded successfully.")
        except FileNotFoundError:
            Logger.WARNING("Cache file not found. Initializing cache with default values.")
            if "format_cache.json" in self.cache_file:
                self.cache = cache_format_dict
            else:
                self.cache = cache_title_dict
            self.save_cache()

    def save_cache(self):
        """
        Saves the cache to a file.
        """
        Logger.INFO("Saving cache to file.")
        os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
        with open(self.cache_file, "w", encoding="utf-8") as f:
            json.dump(self.cache, f)
        Logger.INFO("Cache saved successfully.")

    def get(self, key):
        """
        Gets a value from the cache.

        Parameters:
        key (str): The key to get the value for.

        Returns:
        The value for the key, or None if the key is not in the cache.
        """
        Logger.INFO(f"Getting value for key: {key} from cache.")
        value = self.cache.get(key)
        if value is None:
            Logger.WARNING(f"No value found in cache for key: {key}.")
        else:
            Logger.INFO(f"Found value in cache for key: {key}.")
        return value

    def set(self, key, value):
        """
        Sets a value in the cache and saves the cache to a file.

        Parameters:
        key (str): The key to set the value for.
        value: The value to set.
        """
        Logger.INFO(f"Setting value for key: {key} in cache.")
        self.cache[key] = value
        self.save_cache()
