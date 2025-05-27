# Contrast Discord Bot - Updated Documentation

## Project Overview

Contrast is a highly configurable, feature-rich Discord bot built with TypeScript and Discord.js. It provides comprehensive functionality including utility commands, economy system, reputation tracking, leveling, gambling games, and work system with **UNLIMITED TRANSACTION SUPPORT** and **PUBLIC GAMBLING RESULTS** for maximum community engagement.

### Key Features

- **Command System**: Supports slash commands for regular users and prefix commands exclusively for developers
- **Economy System**: Virtual currency with **UNLIMITED TRANSACTIONS**, daily/weekly/monthly/yearly rewards with streak multipliers, gambling games, work system, and comprehensive transaction tracking
- **Safe System**: Secure storage that protects coins from all-in gambling losses, with upgradeable capacity
- **Shop System**: Purchase upgrades and items including safe expansions, XP boosts, and transfer limit upgrades
- **Reputation System**: Allow users to give and receive reputation points with XP rewards
- **Level System**: XP-based progression with rewards for various activities including commands, gambling, work, and social interactions
- **Gambling Games**: Multiple games including slots, coinflip, dice roll, number guess, roulette, and Russian Roulette with **BULK PLAY OPTIONS** (up to 50+ repeats) and **PUBLIC RESULTS** for community engagement
- **Work System**: Balanced earning mechanism with cooldowns, salary scaling based on balance, and bonus chances
- **Rate Limiting**: Built-in rate limiting to prevent spam (10s for work, 2s for gambling, 10s for rewards, 3/s general)
- **Utility Commands**: Server info, user info, avatar display, and comprehensive help system
- **Fun Features**: Jokes, facts, quotes, and mini-games
- **Developer Tools**: Server management, blacklist control, maintenance mode with webhook alerts, shop item management
- **Webhook Alerts**: Optional Discord webhook notifications for developer actions

### Command Architecture

**STRICT COMMAND TYPE SEPARATION:**

- **Regular User Commands**: ALL regular commands use SLASH COMMANDS ONLY (`/command`)
  - No prefix commands for regular users
  - Modern Discord interface with autocomplete and validation
  - Better user experience and discoverability

- **Developer Commands**: ALL developer commands use PREFIX COMMANDS ONLY (`?command`)
  - No slash commands for developers
  - Quick access for administrative tasks
  - Separate from user-facing commands for security

This separation ensures clear distinction between user and administrative functionality while providing the best interface for each use case.

### Global System Architecture

**ALL DATA IS GLOBAL ACROSS DISCORD SERVERS:**

- **Economy System**: User balances, transaction history, and daily/monthly/yearly streaks are shared across all servers
- **Level System**: XP, levels, and progression are global - users maintain the same level regardless of which server they're in
- **Reputation System**: Reputation points (positive/negative, given/received) are global across all servers
- **Gambling Statistics**: All gambling stats, leaderboards, and records are global
- **Work History**: Work earnings and statistics are global
- **User Data**: All user data (quotes, feedback, etc.) is stored globally by Discord User ID

This design ensures users have a consistent experience across all servers where the bot is present and prevents data fragmentation.

## Critical Design Principles

### 🚨 GAMBLING SYSTEM REQUIREMENTS 🚨

**NEVER CHANGE THESE WITHOUT EXPLICIT APPROVAL:**

1. **PUBLIC RESULTS**: All gambling game results MUST be visible to everyone in the channel (not ephemeral). This creates excitement, engagement, and community interaction.

2. **PRIVATE ERROR MESSAGES**: Error messages, rate limits, and insufficient funds warnings should remain ephemeral (private) to avoid spam.

3. **RUSSIAN ROULETTE CONFIRMATION**: The confirmation dialog for Russian Roulette MUST remain private (ephemeral) for user safety, but the final result MUST be public.

4. **UNLIMITED TRANSACTIONS**: The bot supports unlimited transaction amounts for maximum flexibility and fun. Regular betting games have a 1 billion coin limit, but all-in games like Russian Roulette have no limits.

5. **BULK PLAY SUPPORT**: All gambling games support bulk play with high repeat counts (20+ repeats recommended) for faster gameplay and reduced bot slowness.

6. **RATE LIMITING**: Gambling commands are rate-limited to 2 seconds per user to prevent spam while maintaining engagement.

### 🛡️ Code Safety Guidelines

#### For AI Assistants and Future Development

**CRITICAL - READ BEFORE MAKING ANY CHANGES:**

1. **Database Schema**: The database schema is carefully designed and tested. Do NOT modify table structures without understanding all dependencies.

2. **Transaction Safety**: All economy operations use database transactions. Never bypass the existing economy manager functions.

3. **Rate Limiting**: The rate limiting system is essential for server stability. Do not remove or significantly modify without testing.

4. **Error Handling**: All gambling functions have specific error handling for edge cases. Maintain this pattern.

5. **XP System Integration**: The level system is integrated with all major bot functions. Changes to one system may affect others.

6. **Command Type Separation**: NEVER mix slash and prefix commands. Regular commands are slash-only, developer commands are prefix-only.

7. **Configurable Limits**: All transaction limits are configurable in the economy manager. The default is set to unlimited for maximum flexibility.

## Configurable Economy Limits

The bot includes highly configurable limits that can be adjusted in `src/utils/economy-manager.ts`:

\`\`\`typescript
export const ECONOMY_LIMITS = {
  MAX_TRANSACTION_AMOUNT: Infinity, // No limit on transactions
  MAX_BET_AMOUNT: 1000000000, // 1 billion for regular bets (not all-in games)
  MAX_TRANSFER_AMOUNT: Infinity, // No limit on transfers
  MAX_WORK_EARNINGS: Infinity, // No limit on work earnings
}
\`\`\`

**Key Points:**
- Set any limit to `Infinity` for unlimited transactions
- `MAX_BET_AMOUNT` only applies to regular gambling games, NOT all-in games like Russian Roulette
- All limits are easily configurable without code changes
- Default configuration prioritizes fun and flexibility over restrictions

## Project Structure

- `src/`: Source code directory
  - `commands/`: Command implementations organized by category
    - `Games/`: Gambling and fun games (SLASH COMMANDS - PUBLIC RESULTS)
    - `Economy/`: Currency management, rewards, safe system, shop system, and work system (SLASH COMMANDS)
    - `Social/`: Reputation and level systems (SLASH COMMANDS)
    - `Utility/`: General bot utilities (SLASH COMMANDS)
    - `Fun/`: Entertainment commands (SLASH COMMANDS)
    - `Developer/`: Admin-only commands (PREFIX COMMANDS ONLY)
  - `events/`: Discord.js event handlers
  - `utils/`: Core utility functions and managers
  - `constants/`: Static data like jokes and facts
  - `index.ts`: Main entry point

## Development Guidelines

### Code Quality Standards

1. **Bug-Free Code**: All code must be thoroughly tested and free of bugs before submission. Pay special attention to:
   - Large number handling (unlimited transaction support)
   - Database transaction integrity
   - Rate limiting edge cases
   - Public vs private message handling
   - Command type separation (slash vs prefix)
   - Bulk play functionality for gambling games

2. **Optimization**: Code should be well-optimized and structured for easy future development and maintenance.

3. **Logical Design**: All implementations should make sense and not introduce new problems. Consider the user experience and community engagement.

### AI-Generated Code Policy

4. **AI Usage Warning**: If using AI to generate code for PRs:
   - ⚠️ **NEVER** let AI modify gambling result visibility without explicit instruction
   - ⚠️ **NEVER** let AI change database transaction logic
   - ⚠️ **NEVER** let AI modify rate limiting without understanding the impact
   - ⚠️ **NEVER** let AI mix slash and prefix commands
   - ⚠️ **NEVER** let AI reduce bulk play limits or make games slower
   - ⚠️ **NEVER** let AI add unnecessary transaction limits
   - Ensure everything works correctly and maintains existing behavior
   - Refine AI-generated code to maintain natural, human-written style and quality
   - Test all gambling games thoroughly, especially with large balances and bulk play
   - Verify that public/private message behavior is preserved
   - Verify command type separation is maintained
   - Test unlimited transaction support

### Customization and Flexibility

5. **Configurability**: The bot should remain highly customizable through:
   - Environment variables for basic configuration
   - Configurable limits in the economy manager
   - Easy modification of game parameters
   - Adjustable rate limits and cooldowns

### Contribution Process

6. **Commit Standards**:
   - Use clear, descriptive commit messages
   - Include detailed descriptions of changes in commit bodies
   - Mention if gambling visibility, limits, or core systems were modified
   
7. **Pull Request Requirements**:
   - Clearly specify all changes made in your PR description
   - **MANDATORY**: State whether gambling results remain public
   - **MANDATORY**: Confirm rate limiting behavior is preserved
   - **MANDATORY**: Confirm command type separation is maintained
   - **MANDATORY**: Confirm unlimited transaction support is preserved
   - **MANDATORY**: Test bulk play functionality if gambling games were modified
   - PRs without proper descriptions will be closed

8. **Branch Strategy**:
   - **DO NOT** open PRs directly to the `main` branch
   - All PRs should target the `development` branch
   - Code will be merged to `main` only after thorough testing and verification

## Setup and Configuration

1. Clone the repository
2. Copy `.env.example` to `.env` and configure the required variables
3. Install dependencies with `npm install`
4. Initialize the database with `npm run init-db`
5. Build the project with `npm run build`
6. Deploy commands with `npm run deploy` (deploys slash commands only)
7. Start the bot with `npm start`

## Environment Variables

The following environment variables can be configured in your `.env` file:

- `TOKEN`: Your Discord bot token (REQUIRED)
- `CLIENT_ID`: Your bot's application ID (REQUIRED)
- `GUILD_ID`: Your development server ID
- `PREFIX`: Command prefix for developer commands (default: `?`)
- `BOT_NAME`: Custom name for your bot (default: `Contrast`)
- `STATUS`: Bot's status (online, idle, dnd, invisible)
- `ACTIVITY_TYPE`: Activity type (PLAYING, WATCHING, LISTENING, COMPETING, STREAMING)
- `ACTIVITY_NAME`: Activity name displayed in the bot's status
- `DEPLOY_GUILD_COMMANDS`: Set to "true" to deploy commands to a specific guild only
- `DEVELOPER_WEBHOOK_URL`: Discord webhook URL for developer alerts (optional)
- `DONATE_URL`: Donation URL for the donate command

## Rate Limiting Configuration

The bot includes built-in rate limiting to prevent spam and maintain server stability:

- **Work Command**: 1 request per 10 seconds (prevents spam while allowing regular earning)
- **Gambling Commands**: 1 request per 2 seconds (prevents spam while maintaining engagement)
- **Reward Commands** (daily/monthly/yearly): 1 request per 10 seconds
- **General Commands**: 3 requests per second

Rate limits are applied per user and automatically clean up old entries.

## Database Schema Notes

### Critical Tables
- `user_economy`: Core economy data with balance, streaks, and totals
- `transactions`: All financial transactions with full audit trail
- `gambling_stats`: Gambling statistics and leaderboards
- `user_levels`: XP and level progression data
- `reputation`: User reputation system

### Important Constraints
- All economy operations use transactions for data integrity
- Foreign key relationships maintain data consistency
- Timestamps are stored as Unix milliseconds for precision
- No artificial limits on transaction amounts (configurable)

### Global Data Design
- All user tables use Discord User ID as the primary key (NOT Guild ID)
- No server-specific user data storage
- Users maintain consistent data across all servers
- Leaderboards and statistics are global across the entire bot network

## Testing Guidelines

### Before Any Release

1. **Gambling Games**: Test all gambling games with various bet amounts and bulk play:
   - Small bets (1-10 coins)
   - Medium bets (1,000-10,000 coins)
   - Large bets (100,000+ coins)
   - Maximum balance scenarios (billions+ coins)
   - Bulk play with high repeat counts (20+ repeats)

2. **Work System**: Test work command with different balance levels:
   - New users with 0 balance
   - Users with medium balances (10,000-100,000 coins)
   - Users with high balances (1M+ coins)
   - Bonus chance functionality

3. **Public/Private Behavior**: Verify that:
   - Gambling results are visible to everyone
   - Work results are visible to everyone
   - Error messages are private
   - Rate limit messages are private
   - Russian Roulette confirmation is private, result is public

4. **Rate Limiting**: Test rate limits don't break normal usage patterns

5. **Database Integrity**: Ensure all transactions are properly recorded

6. **Global Data Consistency**: Verify that:
   - User data persists across different servers
   - Leaderboards show global statistics
   - No server-specific data isolation occurs
   - User balances/levels are the same in all servers

7. **Command Type Verification**: Ensure that:
   - All regular commands work as slash commands
   - All developer commands work as prefix commands
   - No command has both implementations
   - Command deployment only registers slash commands

8. **Unlimited Transaction Support**: Test that:
   - Large transactions (billions+ coins) work correctly
   - No artificial limits prevent legitimate transactions
   - All-in games like Russian Roulette handle any balance size
   - Regular games respect the 1 billion limit but can be configured

## For AI Assistants

If you're an AI assistant helping with this project:

### 🚨 CRITICAL RULES 🚨

1. **NEVER** change gambling results from public to private without explicit instruction
2. **NEVER** modify database transaction logic without understanding the full impact
3. **NEVER** remove or significantly alter rate limiting
4. **NEVER** add artificial limits to transactions without explicit instruction
5. **NEVER** reduce bulk play capabilities or make games slower
6. **ALWAYS** preserve the existing error handling patterns
7. **NEVER** implement server-specific data storage - all user data MUST be global
8. **NEVER** use Guild ID for user data storage - only use Discord User ID
9. **NEVER** create slash commands for developer functionality
10. **NEVER** create prefix commands for regular user functionality

### Safe Practices

1. Familiarize yourself with the codebase structure and patterns
2. Ensure any code you suggest follows TypeScript best practices
3. Maintain the existing error handling and logging patterns
4. Follow the database schema when suggesting changes to data operations
5. Respect the separation of concerns between different managers and utilities
6. Test any code suggestions thoroughly before providing them
7. When in doubt about gambling visibility, ask for clarification
8. Maintain strict command type separation
9. Preserve unlimited transaction support unless explicitly asked to change it
10. Support bulk play functionality in gambling games

### Common Pitfalls to Avoid

- Making gambling results ephemeral (breaks community engagement)
- Bypassing the economy manager for direct database access
- Modifying rate limits without considering server load
- Adding unnecessary transaction limits
- Breaking the public/private message pattern
- Mixing slash and prefix command implementations
- Creating developer slash commands or user prefix commands
- Reducing bulk play capabilities
- Making games slower or less responsive

## Community Engagement Features

The bot is designed to maximize community engagement through:

- **Public Gambling Results**: Creates excitement and social interaction
- **Public Work Results**: Shows off earnings and encourages others to work
- **Leaderboards**: Encourages friendly competition
- **Streak Systems**: Rewards consistent usage
- **XP Rewards**: Gamifies all bot interactions
- **Reputation System**: Builds community trust and recognition
- **Slash Commands**: Modern, discoverable interface for all users
- **Bulk Play Options**: Allows for exciting high-stakes gambling sessions
- **Unlimited Transactions**: Enables epic wins and massive gameplay

## License

This project is open-source and available under the MIT License.

---

**Last Updated**: December 2024
**Version**: 2.0.0
**Critical Systems**: Economy (Unlimited), Gambling (Public Results), Work System, Rate Limiting, Database Transactions, Command Architecture, Bulk Play Support
**Key Features**: Unlimited transactions, 1 billion bet limit (configurable), public results, bulk play support, work system with balance scaling
