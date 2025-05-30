# Release Workflow Guide

This document outlines the recommended workflow for creating releases in this project.

## Branch Structure

- **`canary`** - Development branch (we push and create PRs here)
- **`beta`** - Testing/staging branch (PRs from canary go here)
- **`main`** - Production branch (PRs from beta go here when stable)

## Beta Release Process

1. **Develop on canary branch**
   ```bash
   git checkout canary
   # Make changes, commit, push to canary
   ```

2. **Create beta release tag**
   ```bash
   git checkout canary
   git pull origin canary
   npm version prerelease --preid=beta  # Creates v2.1.3-beta.0
   git push origin --tags
   ```
   
   This will:
   - Update version in package.json
   - Create a git tag (v2.1.3-beta.0)
   - Trigger the beta release workflow

3. **Create PR: canary → beta**
   - Create a pull request from `canary` to `beta`
   - Review and test thoroughly
   - Merge when ready for wider testing

## Production Release Process

1. **Create PR: beta → main**
   - Create a pull request from `beta` to `main`
   - Review and ensure everything is stable
   - Merge when ready for production

2. **Create production release tag**
   ```bash
   git checkout main
   git pull origin main
   npm version patch  # Creates v2.1.3 (or minor/major as needed)
   git push origin --tags
   ```
   
   This will:
   - Update version in package.json
   - Create a git tag (v2.1.3)
   - Trigger the production release workflow

## Version Types

- **patch** (`npm version patch`): Bug fixes, small changes (2.0.0 → 2.0.1)
- **minor** (`npm version minor`): New features, backwards compatible (2.0.0 → 2.1.0)
- **major** (`npm version major`): Breaking changes (2.0.0 → 3.0.0)
- **prerelease** (`npm version prerelease --preid=beta`): Beta versions (2.0.0 → 2.0.1-beta.0)

## Important Notes

- Beta releases are created from the `canary` branch
- Production releases are created from the `main` branch
- Always create tags after code is finalized but before merging PRs
- Use semantic versioning (patch/minor/major) appropriately
- Label PRs properly for automatic changelog generation

## Example Workflow

```bash
# Start development on canary
git checkout canary
git pull origin canary

# Make changes and commit
git add .
git commit -m "feat: add new feature"
git push origin canary

# Create beta release
npm version prerelease --preid=beta  # Creates v2.1.3-beta.0
git push origin --tags

# Create PR: canary → beta
# Test on beta branch

# Create PR: beta → main
# After merging to main:

git checkout main
git pull origin main
npm version patch  # Creates v2.1.3
git push origin --tags
```

This workflow ensures proper versioning and release management across all branches.