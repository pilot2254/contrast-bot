# Development & Release Notes

## Branch Structure

We use a three-branch workflow:

- **`canary`** - Development branch (we push and create PRs here)
- **`beta`** - Testing/staging branch (PRs from canary go here)
- **`main`** - Production branch (PRs from beta go here when stable)

## Development Workflow

1. **Daily Development on Canary**:
   ```bash
   git checkout canary
   git pull origin canary
   # Make your changes
   git add .
   git commit -m "feat: add new feature"
   git push origin canary
   
   # Optional: Update version for tracking
   npm version patch
   git push origin canary
   ```

2. **Promote to Beta**:
   - Create PR from `canary` → `beta`
   - Test thoroughly on beta branch
   - Merge when ready for testing

3. **Promote to Main & Release**:
   - Create PR from `beta` → `main`
   - Merge when everything is stable
   - Create official release:
   ```bash
   git checkout main
   git pull origin main
   npm version patch    # Creates official release
   git push origin --tags
   git push origin main
   ```

## Release Process

### Manual Releases Only
- No automated release creation
- Create releases manually when needed
- Full control over release timing and content

### Creating a Manual Release

**Option 1: GitHub Web Interface**
1. Go to repository → Releases → "Create a new release"
2. Choose or create a tag (e.g., `v2.0.1`)
3. Write release notes
4. Publish when ready

**Option 2: Command Line + GitHub**
```bash
# Create and push tag
git checkout main
git pull origin main
git tag v2.0.1
git push origin v2.0.1

# Then create release on GitHub using the tag
```

### Version Updates

```bash
# Update package.json version (optional)
npm version patch    # Updates version number
git push origin main

# Create release manually when you want to
```

## Manual Release Creation

**No automatic releases** - you have full control:
- Create releases when you decide
- Write custom release notes
- Choose which commits/features to highlight
- Release on your schedule

## Example Workflow

```bash
# 1. Develop on canary
git checkout canary
git commit -m "feat: add new feature"
git push origin canary

# 2. Optional version tracking
npm version patch  # Just updates package.json
git push origin canary

# 3. Create PR: canary → beta (test)
# 4. Create PR: beta → main (when stable)

# 5. Official release from main
git checkout main
git pull origin main
npm version patch  # Creates v2.0.1 and GitHub release
git push origin --tags
git push origin main
```

## Important Notes

- **Canary versions**: For tracking only, no releases
- **Main versions**: Create official GitHub releases
- **Only main branch releases are marked as "latest"**
- **Use PRs to promote** stable code through beta → main

## Environment Variables

Make sure these are set in your environment:

- `DISCORD_TOKEN` - Your bot's token
- `CLIENT_ID` - Your bot's client ID  
- `GUILD_ID` - Test server ID (optional, for development)
- `ERROR_LOG_CHANNEL` - Channel ID for error logging (optional)
- `NODE_ENV` - Set to `production` when running in production
