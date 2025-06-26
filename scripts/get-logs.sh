#!/bin/bash

# Default values
network=""
package="cashier_backend"
identity=""
config_file="$(dirname "$0")/../.deploy-config"
log_dir="$(dirname "$0")/../logs"
log_file="$log_dir/${package}_logs.txt"

# Prompt for network
read -p "Enter network (ic, staging, dev, local): " network_input
if [ "$network_input" == "ic" ]; then
    network="ic"
elif [ "$network_input" == "staging" ]; then
    network="staging"
elif [ "$network_input" == "dev" ]; then
    network="dev"
elif [ "$network_input" == "local" ]; then
    network="local"
else
    echo "Invalid network. Please enter ic, staging, dev, or local."
    exit 1
fi

# Get identity from config
identity_from_config=""
if [ -f "$config_file" ]; then
    identity_from_config=$(grep "^$network=" "$config_file" | cut -d'=' -f2)
fi
if [ -n "$identity_from_config" ]; then
    echo "Found identity '$identity_from_config' for network '$network' in config file."
    identity="--identity $identity_from_config"
else
    identity=""
fi

# Get canister id from canister_ids.json
canister_id=$(jq -r ".${package}.${network}" "$(dirname "$0")/../canister_ids.json")
if [ "$canister_id" == "null" ] || [ -z "$canister_id" ]; then
    echo "Canister ID for $package on $network not found."
    exit 1
fi

# Ensure log directory exists
mkdir -p "$log_dir"

# Smart log pulling loop
while true; do
    # Get last log header from file
    if [ -s "$log_file" ]; then
        last_header=$(tail -n 1 "$log_file" | grep -oE '^\[[0-9]+\. [^]]+\]:')
    else
        last_header=""
    fi

    # Pull all logs
    new_logs=$(dfx canister logs $package --network $network $identity)

    if [ -z "$last_header" ]; then
        # If log file is empty, dump all logs
        echo "$new_logs" > "$log_file"
    else
        # Find the last occurrence of the header
        last_line_num=$(echo "$new_logs" | grep -nF "$last_header" | tail -n 1 | cut -d: -f1)
        if [[ -n "$last_line_num" ]]; then
            # Output lines after the last header
            tail -n +$((last_line_num + 1)) <<< "$new_logs" >> "$log_file"
        else
            # If header not found, append all new logs
            echo "$new_logs" >> "$log_file"
        fi
    fi

    sleep 2
done
