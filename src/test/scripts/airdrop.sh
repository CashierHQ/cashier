#!/bin/bash

# Copyright (c) 2025 Cashier Protocol Labs
# Licensed under the MIT License (see LICENSE file in the project root)

# Simple Airdrop Script
# Usage: ./airdrop.sh <principal_id> [amount_in_icp]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="local"
ICP_LEDGER_CANISTER_ID="ryjl3-tyaaa-aaaaa-aaaba-cai"

# Function to log with timestamp
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to show usage
show_usage() {
    echo -e "${BLUE}Airdrop Script${NC}"
    echo ""
    echo "Usage: $0 <principal_id> [amount_in_icp]"
    echo ""
    echo "Arguments:"
    echo "  principal_id    - The principal ID to airdrop tokens to"
    echo "  amount_in_icp   - Amount of ICP to airdrop (default: 1000)"
    echo ""
    echo "Examples:"
    echo "  $0 rdmx6-jaaaa-aaaah-qcaiq-cai"
    echo "  $0 rdmx6-jaaaa-aaaah-qcaiq-cai 5000"
    echo ""
    echo "Prerequisites:"
    echo "  - dfx replica must be running"
    echo "  - ICP ledger canister must be deployed"
    echo "  - Current dfx identity must have minting privileges"
}

# Function to validate principal ID format
validate_principal() {
    local principal="$1"
    
    # Basic validation - principal IDs are typically 27 characters with dashes
    if [[ ! "$principal" =~ ^[a-z0-9-]+$ ]]; then
        log "${RED}Invalid principal ID format: $principal${NC}"
        log "${YELLOW}Principal IDs should contain only lowercase letters, numbers, and dashes${NC}"
        exit 1
    fi
    
    if [[ ${#principal} -lt 20 ]]; then
        log "${RED}Principal ID seems too short: $principal${NC}"
        log "${YELLOW}Principal IDs are typically 27+ characters long${NC}"
        exit 1
    fi
}

# Function to check if dfx is running
check_dfx() {
    if ! dfx ping >/dev/null 2>&1; then
        log "${RED}dfx replica is not running${NC}"
        log "${YELLOW}Please start dfx first: dfx start --background${NC}"
        exit 1
    fi
    log "${GREEN}dfx replica is running${NC}"
}

# Function to check if canister exists
check_canister() {
    local canister_id="$1"
    
    if ! dfx canister status "$canister_id" --network "$NETWORK" >/dev/null 2>&1; then
        log "${RED}ICP Ledger canister ($canister_id) is not available${NC}"
        log "${YELLOW}Please deploy the ICP ledger canister first${NC}"
        exit 1
    fi
    log "${GREEN}ICP Ledger canister is available${NC}"
}

# Function to perform airdrop
perform_airdrop() {
    local target_principal="$1"
    local amount_icp="$2"
    local amount_e8s=$((amount_icp * 100000000))  # Convert ICP to e8s (1 ICP = 100,000,000 e8s)
    
    log "${GREEN}Starting airdrop...${NC}"
    log "${YELLOW}  Target: $target_principal${NC}"
    log "${YELLOW}  Amount: $amount_icp ICP ($amount_e8s e8s)${NC}"

    dfx identity use default
    
    # Perform the transfer
    local transfer_cmd="dfx canister call $ICP_LEDGER_CANISTER_ID icrc1_transfer \"(record { 
        to = record { 
            owner = principal \\\"$target_principal\\\";
            subaccount = null;
        };
        memo = null; 
        created_at_time = null;
        from_subaccount = null;
        amount = $amount_e8s;
        fee = null
    })\" --network $NETWORK"
    
    log "${BLUE}Executing: $transfer_cmd${NC}"
    
    local transfer_result
    if transfer_result=$(eval "$transfer_cmd" 2>&1); then
        log "${GREEN}✅ Airdrop successful!${NC}"
        log "${YELLOW}  Response: $transfer_result${NC}"
        log "${YELLOW}  Transferred: $amount_icp ICP to $target_principal${NC}"
    else
        log "${RED}❌ Airdrop failed: $transfer_result${NC}"
        exit 1
    fi
}

# Function to check balance after airdrop
check_balance() {
    local target_principal="$1"
    
    log "${BLUE}Checking balance...${NC}"
    
    local balance_cmd="dfx canister call $ICP_LEDGER_CANISTER_ID icrc1_balance_of \"(record { 
        owner = principal \\\"$target_principal\\\"; 
        subaccount = null 
    })\" --network $NETWORK"
    
    local balance_result
    if balance_result=$(eval "$balance_cmd" 2>/dev/null); then
        echo "Balance result: $balance_result"
    else
        log "${YELLOW}Could not check balance${NC}"
    fi
}

# Main function
main() {
    # Check arguments
    if [[ $# -lt 1 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
        show_usage
        exit 0
    fi
    
    local target_principal="$1"
    local amount_icp="${2:-1000}"  # Default to 1000 ICP if not specified
    
    # Validate inputs
    validate_principal "$target_principal"
    
    # Validate amount
    if ! [[ "$amount_icp" =~ ^[0-9]+$ ]] || [[ "$amount_icp" -le 0 ]]; then
        log "${RED}Invalid amount: $amount_icp${NC}"
        log "${YELLOW}Amount must be a positive integer${NC}"
        exit 1
    fi
    
    # Check prerequisites
    check_dfx
    check_canister "$ICP_LEDGER_CANISTER_ID"
    
    # Perform airdrop
    perform_airdrop "$target_principal" "$amount_icp"
    
    # Check balance
    check_balance "$target_principal"
    
    log "${GREEN}🎉 Airdrop completed successfully!${NC}"
}

# Run main function
main "$@"
