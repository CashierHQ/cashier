# 🚀 Cashier Deployment Guide

This guide explains the automated CI/CD deployment workflow for the Cashier project, including environment management, version bumping, and release strategies.

## 📋 Table of Contents

-   [Overview](#overview)
-   [Environment Strategy](#environment-strategy)
-   [Deployment Triggers](#deployment-triggers)
-   [Version Management](#version-management)
-   [Release Process](#release-process)
-   [Branch Strategy](#branch-strategy)
-   [Examples](#examples)
-   [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Cashier project uses an automated CI/CD pipeline that deploys to three environments based on branch activity and pull requests:

-   **🧪 Dev Environment**: For development and feature testing
-   **🔧 Staging Environment**: For pre-production testing
-   **🚀 Production Environment**: For live releases with version management

## 🏗️ Environment Strategy

### Environment Mapping

| Environment    | Network   | Deployment Target  | Version Bump   |
| -------------- | --------- | ------------------ | -------------- |
| **Dev**        | `dev`     | Development server | ❌ No          |
| **Staging**    | `staging` | Staging server     | ❌ No          |
| **Production** | `ic`      | IC Mainnet         | ✅ Yes (patch) |

### Environment Variables

Each environment uses specific configuration:

```bash
# Development (.env.dev)
VITE_ENV=dev
VITE_BACKEND_CANISTER_ID=<dev_canister_id>
VITE_TOKEN_STORAGE_CANISTER_ID=<dev_token_storage_id>

# Staging (.env.staging)
VITE_ENV=staging
VITE_BACKEND_CANISTER_ID=<staging_canister_id>
VITE_TOKEN_STORAGE_CANISTER_ID=<staging_token_storage_id>

# Production (.env.production)
VITE_ENV=production
VITE_BACKEND_CANISTER_ID=<prod_canister_id>
VITE_TOKEN_STORAGE_CANISTER_ID=<prod_token_storage_id>
```

## ⚡ Deployment Triggers

### 🧪 Dev Environment

**Triggers on:**

-   Direct push to ANY branch
-   Pull requests to any branch (except main/staging)

**Examples:**

```bash
# Feature branch deployment
git checkout -b feature/new-payment-flow
git push origin feature/new-payment-flow  # ✅ Deploys to dev

# Hotfix deployment
git checkout -b hotfix/fix-claim-button
git push origin hotfix/fix-claim-button  # ✅ Deploys to dev
```

### 🔧 Staging Environment

**Triggers on:**

-   Pull requests to `staging` branch only

**Examples:**

```bash
# Create PR to staging
git checkout staging
git pull origin staging
git checkout feature/new-feature
git push origin feature/new-feature

# Open PR: feature/new-feature → staging
# ✅ This triggers staging deployment
```

### 🚀 Production Environment

**Triggers on:**

-   Pull requests to `main` branch only
-   **Automatically bumps version** (patch increment)

**Examples:**

```bash
# Create PR to main for production release
git checkout main
git pull origin main
git checkout staging
git push origin staging

# Open PR: staging → main
# ✅ This triggers production deployment with version bump
```

## 📦 Version Management

### Automatic Version Bumping

**When:** Only for production deployments (PRs to `main`)

**What happens:**

1. Reads current version from `src/cashier_frontend_new/package.json`
2. Increments patch version (e.g., `0.0.9` → `0.0.10`)
3. Updates `package.json` with new version
4. Commits change: `"chore: bump version to 0.0.10 [skip ci]"`
5. Pushes commit to PR branch
6. Deploys to production

**Example:**

```json
// Before (package.json)
{
  "version": "0.0.9"
}

// After automatic bump
{
  "version": "0.0.10"
}
```

### Manual Version Management (Alternative)

You can also use the release script for manual version management:

```bash
# Make script executable
chmod +x scripts/release.sh

# Auto-increment options
./scripts/release.sh patch   # 0.0.9 → 0.0.10
./scripts/release.sh minor   # 0.0.9 → 0.1.0
./scripts/release.sh major   # 0.0.9 → 1.0.0

# Specify exact version
./scripts/release.sh v1.2.3
```

## 🔄 Release Process

### Recommended Workflow

1. **Feature Development**

    ```bash
    # Work on feature branch
    git checkout -b feature/payment-improvements
    # ... make changes ...
    git push origin feature/payment-improvements
    # ✅ Auto-deploys to dev for testing
    ```

2. **Staging Release**

    ```bash
    # Create PR to staging
    # feature/payment-improvements → staging
    # ✅ Auto-deploys to staging for pre-production testing
    ```

3. **Production Release**
    ```bash
    # Create PR to main
    # staging → main
    # ✅ Auto-bumps version and deploys to production
    ```

### Emergency Hotfixes

For urgent production fixes:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug-fix
# ... fix the issue ...
git push origin hotfix/critical-bug-fix

# Create PR directly to main
# hotfix/critical-bug-fix → main
# ✅ Auto-bumps version and deploys to production
```

## 🌳 Branch Strategy

### Branch Types

| Branch Type | Purpose                 | Deployment                          |
| ----------- | ----------------------- | ----------------------------------- |
| `main`      | Production-ready code   | 🚀 Production (with version bump)   |
| `staging`   | Pre-production testing  | 🔧 Staging                          |
| `dev`       | Development integration | 🧪 Dev                              |
| `feature/*` | New features            | 🧪 Dev                              |
| `hotfix/*`  | Critical fixes          | 🧪 Dev (or direct to 🚀 Production) |
| `bugfix/*`  | Bug fixes               | 🧪 Dev                              |

### Branch Protection Rules

**Recommended GitHub branch protection:**

```yaml
# main branch
- Require pull request reviews (1+ approvals)
- Require status checks to pass
- Require conversation resolution
- No direct pushes allowed

# staging branch
- Require pull request reviews (1+ approvals)
- Require status checks to pass
```

## 💡 Examples

### Example 1: New Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/multi-token-support
git push origin feature/multi-token-support
# ✅ Deploys to dev environment

# 2. Test and iterate
git commit -am "Add multi-token UI"
git push origin feature/multi-token-support
# ✅ Deploys updated version to dev

# 3. Ready for staging
# Create PR: feature/multi-token-support → staging
# ✅ Deploys to staging environment

# 4. Ready for production
# Create PR: staging → main
# ✅ Bumps version (0.0.9 → 0.0.10) and deploys to production
```

### Example 2: Hotfix Deployment

```bash
# 1. Critical bug discovered in production
git checkout main
git checkout -b hotfix/fix-payment-error

# 2. Fix the issue
git commit -am "Fix payment processing error"
git push origin hotfix/fix-payment-error
# ✅ Deploys to dev for testing

# 3. Deploy directly to production
# Create PR: hotfix/fix-payment-error → main
# ✅ Bumps version (0.0.10 → 0.0.11) and deploys to production
```

### Example 3: Feature Branch Testing

```bash
# Any branch automatically deploys to dev
git checkout -b experiment/new-ui-design
git push origin experiment/new-ui-design
# ✅ Deploys to dev environment

# Team members can test the feature at dev environment URL
# Iterate and push changes, each push triggers new dev deployment
```

## 🛠️ Troubleshooting

### Common Issues

**1. Deployment not triggering**

-   Check if changes are in `src/cashier_frontend_new/**` path
-   Verify branch naming and PR target branch
-   Check GitHub Actions logs

**2. Version bump failing**

-   Ensure GitHub token has write permissions
-   Check if package.json is properly formatted
-   Verify no merge conflicts in package.json

**3. Build failures**

-   Check environment variables are set in GitHub Secrets
-   Verify DFX identity configuration
-   Review build logs for specific errors

### Debug Commands

```bash
# Check current package.json version
node -p "require('./src/cashier_frontend_new/package.json').version"

# Validate GitHub Actions syntax
npx yaml-lint .github/workflows/frontend-deploy.yml

# Test release script locally
./scripts/release.sh --dry-run  # (if implemented)
```

### Getting Help

1. **Check GitHub Actions logs**: Go to repository → Actions tab
2. **Review deployment status**: Check environment-specific URLs
3. **Validate configuration**: Ensure all secrets and variables are set
4. **Contact team**: If issues persist, reach out to the development team

## 📚 Related Documentation

-   [GitHub Actions Workflow](../.github/workflows/frontend-deploy.yml)
-   [Release Script](../scripts/release.sh)
-   [Environment Configuration](../README.md#deployment-setup)
-   [Backend Deployment](../src/cashier_backend/README.md)

---

**Last Updated:** Jun 2025  
**Version:** 1.0.0
