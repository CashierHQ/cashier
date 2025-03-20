#!/bin/bash

# Default values
network=""
package="cashier_backend"
identity=""

# Check for --skip flag
if [[ "$1" == "--skip" ]]; then
    echo "Skipping configuration. Using default values."
else
    # Prompt for network
    read -p "Enter network (ic, staging, local): " network_input
    if [ "$network_input" == "ic" ]; then
        network="--ic"
        env_file=".env.production"
    elif [ "$network_input" == "staging" ]; then
        network="--ic"
        env_file=".env.staging"
    elif [ "$network_input" == "local" ]; then
        network=""
        env_file=".env.local"
    else
        echo "Invalid network. Please enter ic, staging, or local."
        exit 1
    fi

    # Prompt for package
    read -p "Enter package (cashier_backend, token_storage, cashier_frontend): " package_input
    if [ "$package_input" == "cashier_backend" ] || [ "$package_input" == "token_storage" ] || [ "$package_input" == "cashier_frontend" ]; then
        package="$package_input"
    else
        echo "Invalid package. Please enter cashier_backend, token_storage, or cashier_frontend."
        exit 1
    fi

    # Prompt for identity
    read -p "Enter identity (default is empty): " identity_input
    if [ -n "$identity_input" ]; then
        identity="--identity $identity_input"
    else
        identity=""
    fi
fi

# Source the appropriate environment file
echo "Using $env_file"
set -a
source "$env_file"
set +a

# Run dfx deploy
echo "Deploying $package to network $network_input with identity $identity"
dfx deploy $package $network $identity