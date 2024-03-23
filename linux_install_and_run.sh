#!/bin/sh

# Check if pip is installed
if ! command -v pip >/dev/null 2>&1
then
    echo "pip could not be found, trying to install..."
    # Install pip for Python 3
    sudo apt-get install python3-pip
fi

# Check if virtualenv is installed
if ! command -v virtualenv >/dev/null 2>&1
then
    echo "virtualenv could not be found, trying to install..."
    # Install virtualenv
    pip install virtualenv
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]
then
    virtualenv venv
fi

# Check if the activate script exists
if [ -f venv/bin/activate ]
then
    # Activate the virtual environment
    # shellcheck disable=SC1091
    . venv/bin/activate
else
    echo "Failed to create virtual environment"
    exit 1
fi

# Check if tkinter is installed
if ! python -c "import tkinter" >/dev/null 2>&1
then
    echo "tkinter could not be found, trying to install..."
    # Install tkinter for Python 3
    sudo apt-get install python3-tk
fi

# List of packages to install
packages="customtkinter CTkToolTip Pillow requests pandas pymoe"

# Loop through the list of packages
for package in $packages
do
    # Check if the package is installed
    if ! python -c "import $package" >/dev/null 2>&1
    then
        echo "$package could not be found, trying to install..."
        # Install the package
        pip install "$package"
    fi
done

# Run the Python program
python main.py

# Deactivate the virtual environment
deactivate