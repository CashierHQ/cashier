#!/bin/bash

# Copyright (c) 2025 Cashier Protocol Labs
# Licensed under the MIT License (see LICENSE file in the project root)

# Script to run Clippy on all crates in the Cashier Protocol workspace
# This script ensures consistent code quality across all Rust components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Crates to lint
CRATES=(
    
    "src/cashier_backend"
    "src/token_storage"
    "src/lib/cashier-types"
)

# Function to run clippy on a specific crate
run_clippy_on_crate() {
    local crate_path=$1
    local crate_name=$(basename "$crate_path")
    
    print_status "Running Clippy on $crate_name..."
    
    if [ ! -d "$crate_path" ]; then
        print_warning "Directory not found: $crate_path"
        return 0
    fi
    
    if [ ! -f "$crate_path/Cargo.toml" ]; then
        print_warning "No Cargo.toml found in: $crate_path"
        return 0
    fi
    
    # Change to crate directory and run clippy
    (
        cd "$crate_path" || exit 1
        
        # Run clippy with comprehensive flags
        if cargo clippy \
            --all-targets \
            --all-features \
            -- \
            -D clippy::all \
            print_success "✅ $crate_name passed Clippy checks"
            return 0
        else
            print_error "❌ $crate_name failed Clippy checks"
            return 1
        fi
    )
}

# Function to run clippy fix on a specific crate
run_clippy_fix_on_crate() {
    local crate_path=$1
    local crate_name=$(basename "$crate_path")
    
    print_status "Running Clippy --fix on $crate_name..."
    
    if [ ! -d "$crate_path" ]; then
        print_warning "Directory not found: $crate_path"
        return 0
    fi
    
    (
        cd "$crate_path" || exit 1
        
        if cargo clippy; then
            print_success "✅ Applied automatic fixes to $crate_name"
            return 0
        else
            print_error "❌ Failed to apply fixes to $crate_name"
            return 1
        fi
    )
}

# Main execution
main() {
    print_status "🚀 Running Clippy on Cashier Protocol Workspace"
    echo "=========================================="
    
    # Check if we're in the right directory
    if [ ! -f "Cargo.toml" ]; then
        print_error "This script must be run from the project root directory"
        print_error "Current directory: $(pwd)"
        exit 1
    fi
    
    # Check if cargo is available
    if ! command -v cargo &> /dev/null; then
        print_error "cargo is not installed or not in PATH"
        exit 1
    fi
    
    local total_failed=0
    local failed_crates=()
    
    # Run clippy for each crate
    for crate_path in "${CRATES[@]}"; do
        if run_clippy_on_crate "$crate_path"; then
            print_success "✅ $crate_path passed"
        else
            total_failed=$((total_failed + 1))
            failed_crates+=("$crate_path")
            print_error "❌ $crate_path failed"
        fi
        echo # Add spacing
    done
    
    # Final summary
    echo "=========================================="
    print_status "🏁 Clippy Check Complete"
    
    if [ $total_failed -eq 0 ]; then
        print_success "🎉 All crates passed Clippy checks!"
        echo -e "${GREEN}✅ Total crates checked: ${#CRATES[@]}${NC}"
        echo -e "${GREEN}✅ Code quality looks good!${NC}"
    else
        print_error "❌ $total_failed crate(s) failed Clippy checks"
        echo -e "${RED}Failed crates:${NC}"
        for failed_crate in "${failed_crates[@]}"; do
            echo -e "  - $failed_crate"
        done
        echo
        print_status "💡 Try running: $0 --fix to apply automatic fixes"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options] [crate_name]"
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --fix         Apply automatic fixes where possible"
        echo "  --list        List all crates that will be checked"
        echo ""
        echo "Crate names (for single crate checking):"
        echo "  backend       - src/cashier_backend"
        echo "  token         - src/token_storage"
        echo "  types         - src/lib/cashier-types"
        echo "  macros        - src/lib/cashier-macros"
        echo ""
        echo "Examples:"
        echo "  $0                    # Check all crates"
        echo "  $0 backend            # Check only cashier_backend"
        echo "  $0 --fix backend      # Fix only cashier_backend"
        echo ""
        echo "All crates:"
        for crate in "${CRATES[@]}"; do
            echo "  - $crate"
        done
        exit 0
        ;;
    --fix)
        if [ -n "$2" ]; then
            # Fix specific crate
            case "$2" in
                backend)
                    run_clippy_fix_on_crate "src/cashier_backend"
                    ;;
                token)
                    run_clippy_fix_on_crate "src/token_storage"
                    ;;
                types)
                    run_clippy_fix_on_crate "src/lib/cashier-types"
                    ;;
                macros)
                    run_clippy_fix_on_crate "src/lib/cashier-macros"
                    ;;
                *)
                    print_error "Unknown crate: $2"
                    print_error "Use --help to see available crates"
                    exit 1
                    ;;
            esac
        else
            # Fix all crates
            print_status "🔧 Running Clippy with automatic fixes"
            echo "=========================================="
            
            for crate_path in "${CRATES[@]}"; do
                run_clippy_fix_on_crate "$crate_path"
                echo
            done
            
            print_status "🔧 Automatic fixes complete. Run without --fix to check results."
        fi
        exit 0
        ;;
    --list)
        echo "Crates that will be checked:"
        for crate in "${CRATES[@]}"; do
            echo "📦 $crate"
            if [ -f "$crate/Cargo.toml" ]; then
                echo "  ✅ Cargo.toml found"
            else
                echo "  ⚠️  Cargo.toml not found"
            fi
            echo
        done
        exit 0
        ;;
    backend)
        print_status "🚀 Running Clippy on cashier_backend only"
        echo "=========================================="
        if run_clippy_on_crate "src/cashier_backend"; then
            print_success "🎉 cashier_backend passed Clippy checks!"
        else
            print_error "❌ cashier_backend failed Clippy checks"
            exit 1
        fi
        exit 0
        ;;
    token)
        print_status "🚀 Running Clippy on token_storage only"
        echo "=========================================="
        if run_clippy_on_crate "src/token_storage"; then
            print_success "🎉 token_storage passed Clippy checks!"
        else
            print_error "❌ token_storage failed Clippy checks"
            exit 1
        fi
        exit 0
        ;;
    types)
        print_status "🚀 Running Clippy on cashier-types only"
        echo "=========================================="
        if run_clippy_on_crate "src/lib/cashier-types"; then
            print_success "🎉 cashier-types passed Clippy checks!"
        else
            print_error "❌ cashier-types failed Clippy checks"
            exit 1
        fi
        exit 0
        ;;
    macros)
        print_status "🚀 Running Clippy on cashier-macros only"
        echo "=========================================="
        if run_clippy_on_crate "src/lib/cashier-macros"; then
            print_success "🎉 cashier-macros passed Clippy checks!"
        else
            print_error "❌ cashier-macros failed Clippy checks"
            exit 1
        fi
        exit 0
        ;;
    "")
        # No arguments, run main function
        main
        ;;
    *)
        print_error "Unknown argument: $1"
        print_error "Use --help for usage information"
        exit 1
        ;;
esac 