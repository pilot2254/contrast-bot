# Development & Release Notes

## Branch Structure

We use a three-branch workflow:

- **`canary`** - Development branch (we push and create PRs here)
- **`beta`** - Testing/staging branch (PRs from canary go here)
- **`main`** - Production branch (PRs from beta go here when stable)

## Development Workflow

1. **Daily Development**:
   \`\`\`bash
   git checkout canary
   git pull origin canary
   # Make your changes
   git add .
   git commit -m "feat: add new feature"
   git push origin canary
   \`\`\`

2. **Create Release**:
   \`\`\`bash
   npm version patch    # or minor/major
   git push origin --tags
   git push origin canary
   \`\`\`

3. **Promote to Beta**:
   - Create PR from `canary` → `beta`
   - Test thoroughly on beta branch
   - Merge when ready for testing

4. **Promote to Main**:
   - Create PR from `beta` → `main`
   - Merge when everything is stable and ready for production

## Release Process

### Creating Releases

We use `npm version` commands to create releases, which automatically:
- Updates `package.json` version
- Creates a git tag
- Triggers GitHub Actions to create releases

### Simple Versioning

\`\`\`bash
# For bug fixes and small changes
npm version patch    # 2.0.0 → 2.0.1

# For new features  
npm version minor    # 2.0.1 → 2.1.0

# For breaking changes
npm version major    # 2.1.0 → 3.0.0
\`\`\`

### Quick Release Command

\`\`\`bash
# Most common: patch release
npm version patch && git push origin --tags && git push origin canary
\`\`\`

## Automatic Release Creation

When you push tags, GitHub Actions automatically:
- Creates a release on GitHub
- Generates changelog from PR labels since last release

## PR Labeling for Changelogs

Label your PRs to get organized changelogs:

- `feature` or `enhancement` → 🚀 Features section
- `fix` or `bug` → 🐛 Bug Fixes section  
- `chore`, `dependencies`, `documentation` → 🧰 Maintenance section

## Example Workflow

\`\`\`bash
# 1. Develop on canary
git checkout canary
# ... make changes ...
git push origin canary

# 2. Create release
npm version patch  # Creates v2.0.1
git push origin --tags
git push origin canary

# 3. Create PR: canary → beta (when ready for testing)
# 4. Create PR: beta → main (when ready for production)
\`\`\`

## Important Notes

- **All releases are created from canary** - Simple and straightforward
- **Use PRs to promote** stable code through beta → main
- **Use semantic versioning** for clear version history
- **Label PRs properly** for automatic changelog generation

## Environment Variables

Make sure these are set in your environment:

- `DISCORD_TOKEN` - Your bot's token
- `CLIENT_ID` - Your bot's client ID  
- `GUILD_ID` - Test server ID (optional, for development)
- `ERROR_LOG_CHANNEL` - Channel ID for error logging (optional)
- `NODE_ENV` - Set to `production` when running in production
