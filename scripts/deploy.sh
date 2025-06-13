#!/bin/bash

# Default values
network=""
package="cashier_backend"
identity=""
config_file="$(dirname "$0")/../.deploy-config"

# Check for --skip flag
if [[ "$1" == "--skip" ]]; then
    echo "Skipping configuration. Using default values."
    network="local"
    env_file=".env.local"
else
    # Prompt for network
    read -p "Enter network (ic, staging, dev, local): " network_input
    if [ "$network_input" == "ic" ]; then
        network="ic"
        env_file=".env.production"
    elif [ "$network_input" == "staging" ]; then
        network="staging"
        env_file=".env.staging"
    elif [ "$network_input" == "dev" ]; then
        network="dev"
        env_file=".env.dev"
    elif [ "$network_input" == "local" ]; then
        network="local"
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
    identity_from_config=""
    if [ -f "$config_file" ]; then
        identity_from_config=$(grep "^$network=" "$config_file" | cut -d'=' -f2)
    fi
    
    if [ -n "$identity_from_config" ]; then
        echo "Found identity '$identity_from_config' for network '$network' in config file."
        read -p "Use this identity? (y/n, default: y): " use_config_identity
        if [ "$use_config_identity" != "n" ] && [ "$use_config_identity" != "N" ]; then
            identity="--identity $identity_from_config"
        else
            read -p "Enter identity (default is empty): " identity_input
            if [ -n "$identity_input" ]; then
                identity="--identity $identity_input"
            else
                identity=""
            fi
        fi
    else
        read -p "Enter identity (default is empty): " identity_input
        if [ -n "$identity_input" ]; then
            identity="--identity $identity_input"
            # Ask if user wants to save this identity to config
            if [ ! -f "$config_file" ]; then
                echo "Config file doesn't exist. Creating it..."
                touch "$config_file"
            fi
            read -p "Save this identity for network '$network'? (y/n): " save_identity
            if [ "$save_identity" == "y" ] || [ "$save_identity" == "Y" ]; then
                # Remove existing entry for this network and add new one
                grep -v "^$network=" "$config_file" > "$config_file.tmp" 2>/dev/null || true
                echo "$network=$identity_input" >> "$config_file.tmp"
                mv "$config_file.tmp" "$config_file"
                echo "Identity saved to config file."
            fi
        else
            identity=""
        fi
    fi
fi

# Source the appropriate environment file
echo "Using $env_file"
set -a
source "$env_file"
set +a

# Run dfx deploy
echo "====================================================== "
echo "dfx deploy $package --network $network $identity"
echo "======================================================"

dfx deploy $package --network $network $identity