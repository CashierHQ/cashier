#!/bin/bash

# Function to prompt for test file path
ask_for_test_file() {
  read -p "Enter the path to the test file: " TEST_FILE
  if [ -z "$TEST_FILE" ]; then
    echo "Error: No test file provided."
    exit 1
  fi
  
  # Check if the file exists
  if [ ! -f "$TEST_FILE" ]; then
    echo "Warning: File '$TEST_FILE' does not exist. Do you want to continue anyway? (y/n)"
    read -r response
    if [[ "$response" != "y" && "$response" != "Y" ]]; then
      exit 1
    fi
  fi
  
  return 0
}

# Check if a file path is provided as argument
if [ -z "$1" ]; then
  echo "No test file specified as argument."
  ask_for_test_file
else
  TEST_FILE="$1"
  
  echo "Using test file: $TEST_FILE"
  
  # Check if provided file exists
  if [ ! -f "$TEST_FILE" ]; then
    echo "Warning: File '$TEST_FILE' does not exist."
    echo "Do you want to continue anyway? (y/n)"
    read -r response
    if [[ "$response" != "y" && "$response" != "Y" ]]; then
      exit 1
    fi
  fi
fi

# Extract just the filename without extension for log file
LOG_FILENAME=$(basename "$TEST_FILE" | sed 's/\.[^.]*$//')

# Create logs directory if it doesn't exist
LOGS_DIR="logs"
mkdir -p "$LOGS_DIR"

# Print information before running the test
echo "Running test: $TEST_FILE"
echo "Log will be saved to: ${LOGS_DIR}/${LOG_FILENAME}_logs.txt"

# Run the test and redirect output to a log file with the same name as the test file in the logs directory
npx jest -- "$TEST_FILE" > "${LOGS_DIR}/${LOG_FILENAME}_logs.txt" 2>&1
TEST_RESULT=$?

echo "Test execution completed with exit code: $TEST_RESULT"
echo "Test logs saved to ${LOGS_DIR}/${LOG_FILENAME}_logs.txt"

# Show brief summary of test results
if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ Test passed successfully!"
else
  echo "❌ Test failed. Please check the logs for details."
fi

# Optionally show the last few lines of the log file
echo "Last few lines of test output:"
tail -n 10 "${LOGS_DIR}/${LOG_FILENAME}_logs.txt"