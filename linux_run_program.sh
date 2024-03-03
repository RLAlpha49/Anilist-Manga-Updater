#!/bin/sh

# Check if the activate script exists
if [ -f venv/bin/activate ]
then
    # Activate the virtual environment
    # shellcheck disable=SC1091
    . venv/bin/activate

    # Run the Python program
    python Program/main.py

    # Deactivate the virtual environment
    deactivate
else
    echo "Failed to activate virtual environment"
    exit 1
fi