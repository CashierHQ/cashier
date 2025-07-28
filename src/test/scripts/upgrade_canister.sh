#!/bin/bash

# Exit on any error
set -e

# Load environment variables
set -a
source .env
set +a

# Define the file path
INIT_UPGRADE_PATH="src/cashier_backend/src/core/init_and_upgrade.rs"

echo "🔧 Starting canister upgrade process..."

# Add timestamp log to trigger rebuild and track upgrade
echo "📝 Adding timestamp log..."
TIMESTAMP=$(date)
sed -i '' 's|    // add log|    info!("post upgrade '"$TIMESTAMP"'");|' "$INIT_UPGRADE_PATH"

# Trap to ensure cleanup happens even if script fails
cleanup() {
    echo "🧹 Cleaning up temporary changes..."
    
    # Restore the original comment
    sed -i '' 's|    info!("post upgrade .*");|    // add log|' "$INIT_UPGRADE_PATH"
    
    echo "✅ Cleanup completed"
}
trap cleanup EXIT

# Deploy the upgraded canister
echo "🚀 Deploying upgraded canister..."
dfx deploy cashier_backend

echo "✅ Canister upgrade completed successfully!"