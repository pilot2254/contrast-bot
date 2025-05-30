# Manual Release Workflow

This document outlines the manual release workflow without automated GitHub releases.

## Branch Structure

- **`canary`** - Development branch (we push and create PRs here)
- **`beta`** - Testing/staging branch (PRs from canary go here)
- **`main`** - Production branch (PRs from beta go here when stable)

## Development Workflow

### When working on canary (daily development):

```bash
# Make sure you're on canary with latest changes
git checkout canary
git pull origin canary

# Make changes and commit
git add .
git commit -m "feat: add new feature"
git push origin canary
```

### When ready for testing:

```bash
# 1. Create PR: canary → beta (test thoroughly)
# 2. Create PR: beta → main (when stable)
```

## Manual Release Process

When you want to create a release manually:

### Option 1: GitHub Web Interface
1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Choose a tag (e.g., `v2.0.1`) or create new one
4. Write release notes manually
5. Publish release

### Option 2: Command Line + GitHub
```bash
# Create and push a tag
git checkout main
git pull origin main
git tag v2.0.1
git push origin v2.0.1

# Then create release on GitHub web interface using the tag
```

## Version Management

You can still use npm version commands for package.json updates:

```bash
# Update package.json version
npm version patch    # 2.0.0 → 2.0.1
npm version minor    # 2.0.0 → 2.1.0  
npm version major    # 2.0.0 → 3.0.0

# Push the changes
git push origin main
```

## No Automated Releases

- No automatic release creation
- No automatic changelog generation
- Manual control over when and how releases are created
- Create releases only when you decide to
