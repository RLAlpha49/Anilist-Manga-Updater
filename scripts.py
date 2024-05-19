"""
This script contains the functions that are used to build and clean the project.
"""

import argparse
import subprocess
import sys


def run_command(command, capture_output=True, text=True, check=False):
    """
    This function runs a command and returns the result.
    :param command:
    :param capture_output:
    :param text:
    :param check:
    :return result:
    """
    result = subprocess.run(
        command,
        capture_output=capture_output,
        text=text,
        check=check,
    )
    if result.returncode != 0:
        print(f"{command[2]} exited with status {result.returncode}.")
        if result.stderr:
            print(f"{result.stderr}")
        return result
    return result


def run_and_handle_command(command, auto_fix):
    """
    This function runs a command and handles the result.
    :param command:
    :param auto_fix:
    :return result:
    """
    if not auto_fix:
        command.append("--check")
    result = run_command(command)
    if result and result.stdout:
        print(result.stdout)
    if result and result.returncode != 0:
        return result
    return None


def clean(auto_fix=True):
    """
    :param auto_fix:
    This function cleans the project using isort, black, flake8, pylint, and mypy.
    If auto_fix is True, isort and black will automatically fix problems.
    """
    parser = argparse.ArgumentParser(description="Clean a Python project.")
    parser.add_argument(
        "path", help="The path of the project to clean.", default=".", nargs="?"
    )
    parser.add_argument(
        "--no-fix", help="Do not automatically fix problems.", action="store_true"
    )
    args = parser.parse_args()

    path = args.path
    auto_fix = not args.no_fix

    errors = []

    print("Running isort...")
    error = run_and_handle_command(["poetry", "run", "isort", path], auto_fix)
    if error:
        errors.append(error)

    print("\nRunning black...")
    error = run_and_handle_command(["poetry", "run", "black", path], auto_fix)
    if error:
        errors.append(error)

    print("\nRunning flake8...")
    error = run_and_handle_command(["poetry", "run", "flake8", path], auto_fix)
    if error:
        errors.append(error)

    print("\nRunning pylint...")
    error = run_and_handle_command(["poetry", "run", "pylint", path], auto_fix)
    if error:
        errors.append(error)

    print("\nRunning mypy...")
    error = run_and_handle_command(
        [
            "poetry",
            "run",
            "mypy",
            "--install-types",
            "--non-interactive",
            "--check-untyped-defs",
            path,
        ],
        auto_fix,
    )
    if error:
        errors.append(error)

    if errors:
        print("\nErrors occurred during the cleaning process:")
        for error in errors:
            print(
                f"Command '{' '.join(error.args)}' returned non-zero exit status {error.returncode}."
            )
        sys.exit(errors[0].returncode)


if __name__ == "__main__":
    clean()
