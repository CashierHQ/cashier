#!/bin/bash
# scripts/release.sh

PACKAGE_JSON="src/cashier_frontend/package.json"

# Function to get current version from package.json
get_current_version() {
    node -p "require('./$PACKAGE_JSON').version"
}

# Function to update package.json version
update_package_version() {
    local new_version=$1
    # Remove 'v' prefix for package.json
    local package_version=${new_version#v}
    
    # Update package.json using node
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
        pkg.version = '$package_version';
        fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 4) + '\n');
    "
}

# Get current version
CURRENT_VERSION=$(get_current_version)
echo "Current version in package.json: $CURRENT_VERSION"

# Check if version is provided as argument
VERSION=$1
if [ -z "$VERSION" ]; then
    echo ""
    echo "Usage: ./scripts/release.sh [version]"
    echo "Example: ./scripts/release.sh v1.0.0"
    echo ""
    echo "Or use auto-increment options:"
    echo "  ./scripts/release.sh patch   # $CURRENT_VERSION -> v$(echo $CURRENT_VERSION | awk -F. '{print $1"."$2"."($3+1)}')"
    echo "  ./scripts/release.sh minor   # $CURRENT_VERSION -> v$(echo $CURRENT_VERSION | awk -F. '{print $1"."($2+1)".0"}')"
    echo "  ./scripts/release.sh major   # $CURRENT_VERSION -> v$(echo $CURRENT_VERSION | awk -F. '{print ($1+1)".0.0"}')"
    exit 1
fi

# Handle auto-increment options
if [ "$VERSION" == "patch" ]; then
    VERSION="v$(echo $CURRENT_VERSION | awk -F. '{print $1"."$2"."($3+1)}')"
elif [ "$VERSION" == "minor" ]; then
    VERSION="v$(echo $CURRENT_VERSION | awk -F. '{print $1"."($2+1)".0"}')"
elif [ "$VERSION" == "major" ]; then
    VERSION="v$(echo $CURRENT_VERSION | awk -F. '{print ($1+1)".0.0"}')"
fi

# Validate version format
if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must follow semantic versioning (v1.0.0)"
    echo "Provided: $VERSION"
    exit 1
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Error: Must be on main branch to create a release"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Ensure main is up to date
echo "Pulling latest changes from main..."
git pull origin main

# Check if tag already exists
if git tag | grep -q "^${VERSION}$"; then
    echo "Error: Tag $VERSION already exists"
    exit 1
fi

# Update package.json version
echo "Updating package.json version to $VERSION..."
update_package_version $VERSION

# Commit the version update
git add $PACKAGE_JSON
git commit -m "chore: bump version to $VERSION"

# Create and push tag
echo "Creating tag: $VERSION"
git tag $VERSION
git push origin main
git push origin $VERSION

echo "✅ Released $VERSION"
echo "🚀 Check GitHub Actions for deployment status:"
echo "   https://github.com/CashierHQ/cashier/actions"
echo ""
echo "📋 Deployment workflow:"
echo "   • Package.json updated: $CURRENT_VERSION → ${VERSION#v}"
echo "   • Tag created: $VERSION"
echo "   • Deploying to: Production (IC Mainnet)"
echo "   • Network: ic" 