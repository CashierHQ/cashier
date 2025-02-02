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
    read -p "Enter network (ic or local): " network_input
    if [ "$network_input" == "ic" ]; then
        network="--ic"
    elif [ "$network_input" == "local" ]; then
        network=""
    else
        echo "Invalid network. Please enter ic or local."
        exit 1
    fi

    # Prompt for stage
    read -p "Enter stage (prod or staging): " stage
    if [ "$stage" != "prod" ] && [ "$stage" != "staging" ]; then
        echo "Invalid stage. Please enter prod or staging."
        exit 1
    fi

    # Prompt for package
    if [ "$stage" == "prod" ]; then
        read -p "Enter package (cashier_backend, cashier_frontend): " package
        if [ "$package" != "cashier_backend" ] && [ "$package" != "cashier_frontend" ]; then
            echo "Invalid package for prod. Please enter cashier_backend or cashier_frontend."
            exit 1
        fi
    elif [ "$stage" == "staging" ]; then
        read -p "Enter package (cashier_frontend_staging): " package
        if [ "$package" != "cashier_frontend_staging" ]; then
            echo "Invalid package for staging. Please enter cashier_frontend_staging."
            exit 1
        fi
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
if [ "$network" == "--ic" ]; then
    echo "Using .env.staging"
    set -a
    source .env.staging
    set +a
else
    echo "Using .env.local"
    set -a
    source .env.local
    set +a
fi

# Run dfx deploy
dfx deploy $package $network $identity