# Contrast Discord Bot

## Project Overview

Contrast is a versatile, feature-rich Discord bot built with TypeScript and Discord.js. It provides a wide range of functionalities including utility commands, moderation tools, economy system, reputation tracking, leveling, and fun mini-games with public gambling results for maximum community engagement.

### Key Features

- **Command System**: Supports slash commands for regular users and prefix commands exclusively for developers
- **Economy System**: Virtual currency, daily/monthly/yearly rewards with streak multipliers, gambling games, and comprehensive transaction tracking
- **Reputation System**: Allow users to give and receive reputation points with XP rewards
- **Level System**: XP-based progression with rewards for various activities including commands, gambling, and social interactions
- **Gambling Games**: Multiple games including slots, coinflip, dice roll, number guess, and Russian Roulette with bulk play options and **PUBLIC RESULTS** for community engagement
- **Rate Limiting**: Built-in rate limiting to prevent spam and reduce server load (2s for gambling, 10s for rewards, 3/s general)
- **Utility Commands**: Server info, user info, avatar display, and more
- **Fun Features**: Jokes, facts, quotes, and mini-games
- **Developer Tools**: Server management, blacklist control, maintenance mode with webhook alerts
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
- **User Data**: All user data (quotes, feedback, etc.) is stored globally by Discord User ID

This design ensures users have a consistent experience across all servers where the bot is present and prevents data fragmentation.

## Critical Design Principles

### 🚨 GAMBLING SYSTEM REQUIREMENTS 🚨

**NEVER CHANGE THESE WITHOUT EXPLICIT APPROVAL:**

1. **PUBLIC RESULTS**: All gambling game results MUST be visible to everyone in the channel (not ephemeral). This creates excitement, engagement, and community interaction.

2. **PRIVATE ERROR MESSAGES**: Error messages, rate limits, and insufficient funds warnings should remain ephemeral (private) to avoid spam.

3. **RUSSIAN ROULETTE CONFIRMATION**: The confirmation dialog for Russian Roulette MUST remain private (ephemeral) for user safety, but the final result MUST be public.

4. **BALANCE SAFETY**: Russian Roulette has been specifically fixed for large balance handling (10M+ coins). Do not modify the balance verification logic without thorough testing.

5. **RATE LIMITING**: Gambling commands are rate-limited to 2 seconds per user to prevent spam while maintaining engagement.

### 🛡️ Code Safety Guidelines

#### For AI Assistants and Future Development

**CRITICAL - READ BEFORE MAKING ANY CHANGES:**

1. **Database Schema**: The database schema is carefully designed and tested. Do NOT modify table structures without understanding all dependencies.

2. **Transaction Safety**: All economy operations use database transactions. Never bypass the existing economy manager functions.

3. **Rate Limiting**: The rate limiting system is essential for server stability. Do not remove or significantly modify without testing.

4. **Error Handling**: All gambling functions have specific error handling for edge cases. Maintain this pattern.

5. **XP System Integration**: The level system is integrated with all major bot functions. Changes to one system may affect others.

6. **Command Type Separation**: NEVER mix slash and prefix commands. Regular commands are slash-only, developer commands are prefix-only.

## Project Structure

- `src/`: Source code directory
  - `commands/`: Command implementations organized by category
    - `Games/`: Gambling and fun games (SLASH COMMANDS - PUBLIC RESULTS)
    - `Economy/`: Currency management and rewards (SLASH COMMANDS)
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
   - Large number handling (Russian Roulette bug was caused by improper balance verification)
   - Database transaction integrity
   - Rate limiting edge cases
   - Public vs private message handling
   - Command type separation (slash vs prefix)

2. **Optimization**: Code should be well-optimized and structured for easy future development and maintenance.

3. **Logical Design**: All implementations should make sense and not introduce new problems. Consider the user experience and community engagement.

### AI-Generated Code Policy

4. **AI Usage Warning**: If using AI to generate code for PRs:
   - ⚠️ **NEVER** let AI modify gambling result visibility without explicit instruction
   - ⚠️ **NEVER** let AI change database transaction logic
   - ⚠️ **NEVER** let AI modify rate limiting without understanding the impact
   - ⚠️ **NEVER** let AI mix slash and prefix commands
   - Ensure everything works correctly and maintains existing behavior
   - Refine AI-generated code to maintain natural, human-written style and quality
   - Test all gambling games thoroughly, especially with large balances
   - Verify that public/private message behavior is preserved
   - Verify command type separation is maintained

### Customization and Flexibility

5. **Configurability**: The bot should remain highly customizable through environment variables. The bot name can be set in `.env` and will be reflected in all outputs (embeds, messages, etc.).

### Contribution Process

6. **Commit Standards**:
   - Use clear, descriptive commit messages
   - Include detailed descriptions of changes in commit bodies
   - Mention if gambling visibility or core systems were modified
   
7. **Pull Request Requirements**:
   - Clearly specify all changes made in your PR description
   - **MANDATORY**: State whether gambling results remain public
   - **MANDATORY**: Confirm rate limiting behavior is preserved
   - **MANDATORY**: Confirm command type separation is maintained
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

### Global Data Design
- All user tables use Discord User ID as the primary key (NOT Guild ID)
- No server-specific user data storage
- Users maintain consistent data across all servers
- Leaderboards and statistics are global across the entire bot network

## Testing Guidelines

### Before Any Release

1. **Gambling Games**: Test all gambling games with various bet amounts, including edge cases:
   - Small bets (1-10 coins)
   - Medium bets (1,000-10,000 coins)
   - Large bets (100,000+ coins)
   - Maximum balance scenarios (10M+ coins)

2. **Public/Private Behavior**: Verify that:
   - Gambling results are visible to everyone
   - Error messages are private
   - Rate limit messages are private
   - Russian Roulette confirmation is private, result is public

3. **Rate Limiting**: Test rate limits don't break normal usage patterns

4. **Database Integrity**: Ensure all transactions are properly recorded

5. **Global Data Consistency**: Verify that:
   - User data persists across different servers
   - Leaderboards show global statistics
   - No server-specific data isolation occurs
   - User balances/levels are the same in all servers

6. **Command Type Verification**: Ensure that:
   - All regular commands work as slash commands
   - All developer commands work as prefix commands
   - No command has both implementations
   - Command deployment only registers slash commands

## For AI Assistants

If you're an AI assistant helping with this project:

### 🚨 CRITICAL RULES 🚨

1. **NEVER** change gambling results from public to private without explicit instruction
2. **NEVER** modify database transaction logic without understanding the full impact
3. **NEVER** remove or significantly alter rate limiting
4. **NEVER** change the Russian Roulette balance verification logic
5. **ALWAYS** preserve the existing error handling patterns
6. **NEVER** implement server-specific data storage - all user data MUST be global
7. **NEVER** use Guild ID for user data storage - only use Discord User ID
8. **NEVER** create slash commands for developer functionality
9. **NEVER** create prefix commands for regular user functionality

### Safe Practices

1. Familiarize yourself with the codebase structure and patterns
2. Ensure any code you suggest follows TypeScript best practices
3. Maintain the existing error handling and logging patterns
4. Follow the database schema when suggesting changes to data operations
5. Respect the separation of concerns between different managers and utilities
6. Test any code suggestions thoroughly before providing them
7. When in doubt about gambling visibility, ask for clarification
8. Maintain strict command type separation

### Common Pitfalls to Avoid

- Making gambling results ephemeral (breaks community engagement)
- Bypassing the economy manager for direct database access
- Modifying rate limits without considering server load
- Changing transaction logic without proper testing
- Breaking the public/private message pattern
- Mixing slash and prefix command implementations
- Creating developer slash commands or user prefix commands

## Community Engagement Features

The bot is designed to maximize community engagement through:

- **Public Gambling Results**: Creates excitement and social interaction
- **Leaderboards**: Encourages friendly competition
- **Streak Systems**: Rewards consistent usage
- **XP Rewards**: Gamifies all bot interactions
- **Reputation System**: Builds community trust and recognition
- **Slash Commands**: Modern, discoverable interface for all users

## License

This project is open-source and available under the MIT License.

---

**Last Updated**: 2025-05-26 10:02PM - @pilot2254
**Critical Systems**: Economy, Gambling, Rate Limiting, Database Transactions, Command Architecture
