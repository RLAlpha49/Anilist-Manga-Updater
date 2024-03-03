#!/bin/sh

# Check if the activate script exists
if [ -f venv/bin/activate ]
then
    # Activate the virtual environment
    . venv/bin/activate

    # Run the Python program
    python main.py

    # Deactivate the virtual environment
    deactivate
else
    echo "Failed to activate virtual environment"
    exit 1
fi