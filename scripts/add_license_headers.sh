#!/bin/bash

# Cashier — No-code blockchain transaction builder
# Copyright (c) 2025 Cashier Protocol Labs
# Licensed under the MIT License (see LICENSE file in the project root)

# This script adds the MIT license header to source files in the project.

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Root directory of the project
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# License header templates for different file types
RUST_HEADER="// Copyright (c) 2025 Cashier Protocol Labs\n// Licensed under the MIT License (see LICENSE file in the project root)\n"

JS_TS_HEADER="// Copyright (c) 2025 Cashier Protocol Labs\n// Licensed under the MIT License (see LICENSE file in the project root)\n"

DID_HEADER="// Copyright (c) 2025 Cashier Protocol Labs\n// Licensed under the MIT License (see LICENSE file in the project root)\n"

# Function to check if file already has a license header
has_license_header() {
    local file="$1"
    grep -q "Copyright (c)" "$file" || grep -q "Licensed under the MIT License" "$file"
    return $?
}

# Function to add license header to a file
add_header() {
    local file="$1"
    local header="$2"
    local temp_file="$(mktemp)"

    if has_license_header "$file"; then
        echo -e "${YELLOW}License header already exists in $file, skipping${NC}"
        return 0
    fi
    
    echo -e "$header" > "$temp_file"
    cat "$file" >> "$temp_file"
    mv "$temp_file" "$file"
    echo -e "${GREEN}Added license header to $file${NC}"
}

# Process Rust files
process_rust_files() {
    local count=0
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            add_header "$file" "$RUST_HEADER"
            ((count++))
        fi
    done < <(find "$PROJECT_ROOT/src" -name "*.rs" -type f)
    echo -e "${GREEN}Processed $count Rust files${NC}"
}

# Process TypeScript/JavaScript files
process_ts_js_files() {
    local count=0
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            add_header "$file" "$JS_TS_HEADER"
            ((count++))
        fi
    done < <(find "$PROJECT_ROOT/src" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -type f)
    echo -e "${GREEN}Processed $count TypeScript/JavaScript files${NC}"
}

# Process DID files
process_did_files() {
    local count=0
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            add_header "$file" "$DID_HEADER"
            ((count++))
        fi
    done < <(find "$PROJECT_ROOT/src" -name "*.did" -type f)
    echo -e "${GREEN}Processed $count DID files${NC}"
}

# Main execution
echo -e "${GREEN}Starting to add license headers to source files...${NC}"

process_rust_files
process_ts_js_files
process_did_files

echo -e "${GREEN}License headers have been added to all source files.${NC}"
echo -e "${YELLOW}Note: Please review the changes to ensure they are correct.${NC}"