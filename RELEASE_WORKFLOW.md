# Simple Release Workflow

This document outlines the simplified release workflow using standard semantic versioning.

## Branch Structure

- **`canary`** - Development branch (we push and create PRs here)
- **`beta`** - Testing/staging branch (PRs from canary go here)
- **`main`** - Production branch (PRs from beta go here when stable)

## Release Process

### When working on canary and want to create a release:

\`\`\`bash
# Make sure you're on canary with latest changes
git checkout canary
git pull origin canary

# Create a new version (choose one):
npm version patch    # 2.0.0 → 2.0.1 (bug fixes)
npm version minor    # 2.0.0 → 2.1.0 (new features)
npm version major    # 2.0.0 → 3.0.0 (breaking changes)

# Push the tag and changes
git push origin --tags
git push origin canary
\`\`\`

### That's it! 

The GitHub Action will automatically:
- Detect the new tag
- Generate a changelog
- Create a release on GitHub

## Version Types

- **patch** (`npm version patch`): Bug fixes, small changes
- **minor** (`npm version minor`): New features, backwards compatible  
- **major** (`npm version major`): Breaking changes

## Quick Commands

\`\`\`bash
# For most updates (bug fixes, small features)
npm version patch && git push origin --tags && git push origin canary

# For new features
npm version minor && git push origin --tags && git push origin canary

# For breaking changes
npm version major && git push origin --tags && git push origin canary
\`\`\`

## Example Workflow

\`\`\`bash
# Start development on canary
git checkout canary
git pull origin canary

# Make changes and commit
git add .
git commit -m "feat: add new feature"
git push origin canary

# Create release
npm version minor  # Creates v2.1.0
git push origin --tags
git push origin canary

# Later, create PRs to promote through beta → main when ready
\`\`\`

## Notes

- All releases are created from the canary branch
- Use PRs to promote stable releases through beta → main
- The release workflow automatically generates changelogs from PR labels
- Label your PRs with `feature`, `fix`, `bug`, `chore`, etc. for better changelogs
