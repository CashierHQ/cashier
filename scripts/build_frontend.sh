#!/bin/bash
# build_frontend.sh

# Get the DFX information
REPLICA_PORT=$(dfx info replica-port)
WEBSERVER_PORT=$(dfx info webserver-port)
NETWORK=${DFX_NETWORK:-local}
# Make sure to replace 'your_canister_name' with the actual canister name
CANISTER_ID=$(dfx canister id cashier_backend || echo "canister_id_not_found")

echo "Building frontend for network: $NETWORK"
echo "Replica port: $REPLICA_PORT"
echo "Webserver port: $WEBSERVER_PORT"
echo "Canister ID: $CANISTER_ID"

# Navigate to frontend directory
cd "$(dirname "$0")/../src/cashier_frontend" || exit

# Use these variables in your build process
if [ "$NETWORK" == "ic" ]; then
  # Production build
  echo "Building for production..."
  npm run build:prod
elif [ "$NETWORK" == "staging" ]; then
  # Staging build
  echo "Building for staging..."
  npm run build:staging
elif [ "$NETWORK" == "dev" ]; then
  # Staging build
  echo "Building for dev..."
  npm run build:dev
else
  # Local build
  echo "Building for local development..."
  npm run build:local
fi

echo "Frontend build completed for $NETWORK environment"