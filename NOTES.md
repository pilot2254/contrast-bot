# Development & Release Notes

## Branch Structure

We use a three-branch workflow:

- **`canary`** - Development branch (we push and create PRs here)
- **`beta`** - Testing/staging branch (PRs from canary go here)
- **`main`** - Production branch (PRs from beta go here when stable)

## Development Workflow

1. **Daily Development**:
   ```bash
   git checkout canary
   git pull origin canary
   # Make your changes
   git add .
   git commit -m "feat: add new feature"
   git push origin canary
   ```

2. **Create PR to Beta**:
   - Create PR from `canary` → `beta`
   - Test thoroughly on beta branch
   - Merge when ready for testing

3. **Promote to Main**:
   - Create PR from `beta` → `main`
   - Merge when everything is stable and ready for production

## Release Process

### Creating Releases

We use `npm version` commands to create releases, which automatically:
- Updates `package.json` version
- Creates a git tag
- Triggers GitHub Actions to create releases

### Beta Releases (Pre-releases)

```bash
# For beta releases (from beta branch)
git checkout beta
npm version prerelease --preid=beta
git push origin --tags
```

This creates tags like: `v2.0.1-beta.1`, `v2.0.1-beta.2`, etc.

### Production Releases

```bash
# For production releases (from main branch)
git checkout main
npm version patch    # 2.0.0 → 2.0.1
npm version minor    # 2.0.1 → 2.1.0  
npm version major    # 2.1.0 → 3.0.0
git push origin --tags
```

This creates tags like: `v2.0.1`, `v2.1.0`, `v3.0.0`, etc.

## Version Types

- **patch** (`npm version patch`): Bug fixes, small changes (2.0.0 → 2.0.1)
- **minor** (`npm version minor`): New features, backwards compatible (2.0.0 → 2.1.0)
- **major** (`npm version major`): Breaking changes (2.0.0 → 3.0.0)
- **prerelease** (`npm version prerelease --preid=beta`): Beta versions (2.0.0 → 2.0.1-beta.1)

## Automatic Release Creation

When you push tags, GitHub Actions automatically:

- **Beta tags** (`v*-beta.*`): Creates pre-release on GitHub
- **Production tags** (`v*.*.*`): Creates full release on GitHub
- **Generates changelog**: Automatically from PR labels since last release

## PR Labeling for Changelogs

Label your PRs to get organized changelogs:

- `feature` or `enhancement` → 🚀 Features section
- `fix` or `bug` → 🐛 Bug Fixes section  
- `chore`, `dependencies`, `documentation` → 🧰 Maintenance section

## Example Workflow

```bash
# 1. Develop on canary
git checkout canary
# ... make changes ...
git push origin canary

# 2. Create PR: canary → beta
# 3. Test on beta, then create beta release
git checkout beta
npm version prerelease --preid=beta  # Creates v2.0.1-beta.1
git push origin --tags

# 4. When stable, create PR: beta → main
# 5. Create production release
git checkout main  
npm version minor  # Creates v2.1.0
git push origin --tags
```

## Important Notes

- **Never push directly** to `main` or `beta` branches
- **Always use PRs** for code changes
- **Test thoroughly** on beta before promoting to main
- **Use semantic versioning** for clear version history
- **Label PRs properly** for automatic changelog generation

## Environment Variables

Make sure these are set in your environment:

- `DISCORD_TOKEN` - Your bot's token
- `CLIENT_ID` - Your bot's client ID  
- `GUILD_ID` - Test server ID (optional, for development)
- `ERROR_LOG_CHANNEL` - Channel ID for error logging (optional)
- `NODE_ENV` - Set to `production` when running in production
