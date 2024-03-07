"""
This module provides a logging function for debugging and tracking execution.
The function prints a message along with the current time, file, function, and line number.
"""

import logging
import os
from datetime import datetime
import inspect

# Create logs directory if it doesn't exist
if not os.path.exists("logs"):
    os.makedirs("logs")

# Close the log handlers
for handler in logging.root.handlers[:]:
    handler.close()
    logging.root.removeHandler(handler)

# Rename the existing latest.log file to a timestamped filename
if os.path.exists("logs/latest.log"):
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    try:
        os.rename("logs/latest.log", f"logs/{timestamp}.log")
    except PermissionError:
        print(
            "Warning: Could not rename the log file because it is being used by another process."
        )

# Reconfigure the logging module to write to a file named latest.log
logging.basicConfig(
    filename="logs/latest.log",
    level=logging.INFO,
    format="%(asctime)s, %(message)s",
)


def log(message: str):
    """
    Logs a message with the current time, file name, function name, and line number.
    """
    # Get the previous frame in the stack, otherwise it would be this function
    frame = inspect.currentframe().f_back
    if frame is not None:
        func = frame.f_code

        # Dump the message in the format you want
        logging.info(
            "File: %s, Function: %s, Line: %d, Message: %s",
            os.path.normpath(func.co_filename),
            func.co_name,
            frame.f_lineno,
            message,
        )
    else:
        logging.error("Error: Could not get the current frame.")
