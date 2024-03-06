"""
This module provides a logging function for debugging and tracking execution.
The function prints a message along with the current time, file, function, and line number.
"""

import inspect
import time


def log(message: str):
    """
    Logs a message with the current time, file name, function name, and line number.
    """
    # Get the current time
    current_time = time.strftime("%H:%M:%S", time.localtime())

    # Get the previous frame in the stack, otherwise it would be this function
    func = inspect.currentframe().f_back.f_code

    # Dump the message in the format you want
    print(
        f"{current_time}, "
        f"File: {func.co_filename}, "
        f"Function: {func.co_name}, "
        f"Line: {func.co_firstlineno}, "
        f"Message: {message}"
    )
