#!/bin/bash

# Check if a file path is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_test_file>"
  echo "Example: $0 src/test/link/duplicate_link.spec.ts"
  exit 1
fi

# Get the test file path
TEST_FILE=$1

# Extract just the filename without extension for log file
LOG_FILENAME=$(basename "$TEST_FILE" | sed 's/\.[^.]*$//')

# Create logs directory if it doesn't exist
LOGS_DIR="logs"
mkdir -p "$LOGS_DIR"

# Run the test and redirect output to a log file with the same name as the test file in the logs directory
npx jest -- "$TEST_FILE" > "${LOGS_DIR}/${LOG_FILENAME}_logs.txt" 2>&1

echo "Test logs saved to ${LOGS_DIR}/${LOG_FILENAME}_logs.txt"