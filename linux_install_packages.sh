#!/bin/sh

# Check if pip is installed
if ! command -v pip &> /dev/null
then
    echo "pip could not be found, trying to install..."
    # Install pip for Python 3
    sudo apt-get install python3-pip
fi

# Check if virtualenv is installed
if ! command -v virtualenv &> /dev/null
then
    echo "virtualenv could not be found, trying to install..."
    # Install virtualenv
    pip install virtualenv
fi

# Create a virtual environment
virtualenv venv

# Activate the virtual environment
. venv/bin/activate

# List of packages to install
packages="tkinter customtkinter CTkToolTip PIL requests pandas pymoe"

# Loop through the list of packages
for package in $packages
do
    # Install the package
    pip install "$package"
done

# Deactivate the virtual environment
deactivate