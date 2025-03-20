#!/bin/bash

# Check if package name is provided
if [ -z "$1" ]; then
  echo "Error: Package name not provided"
  echo "Usage: ./build_package.sh <package_name>"
  exit 1
fi

PACKAGE_NAME=$1

# Build the package
cargo build --release --target wasm32-unknown-unknown --package "$PACKAGE_NAME"

# Extract candid interface
candid-extractor "target/wasm32-unknown-unknown/release/${PACKAGE_NAME}.wasm" > "src/${PACKAGE_NAME}/${PACKAGE_NAME}.did"

echo "Build completed for $PACKAGE_NAME"