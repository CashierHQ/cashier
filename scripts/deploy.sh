#!/bin/bash

# Default values
network=""
package="cashier_backend"

# Check for --skip flag
if [[ "$1" == "--skip" ]]; then
    echo "Skipping configuration. Using default values."
else
    # Prompt for network
    read -p "Enter network (ic or none): " network_input
    if [ "$network_input" == "ic" ]; then
            network="--ic"
    fi
    if [ "$network_input" != "ic" ] && [ "$network_input" != "local" ]; then
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
fi

# Run dfx deploy

dfx deploy $package $network --identity cashier-dev