# Contrast Discord Bot

## Project Overview

Contrast is a versatile, feature-rich Discord bot built with TypeScript and Discord.js. It provides a wide range of functionalities including utility commands, moderation tools, economy system, reputation tracking, leveling, and fun mini-games.

### Key Features

- **Command System**: Supports both slash commands for users and prefix commands for developers
- **Economy System**: Virtual currency, daily rewards, gambling games, and transaction tracking
- **Reputation System**: Allow users to give and receive reputation points
- **Level System**: XP-based progression with rewards for various activities
- **Moderation Tools**: Ban, kick, and unban commands with proper permission handling
- **Utility Commands**: Server info, user info, avatar display, and more
- **Fun Features**: Jokes, facts, quotes, and mini-games
- **Developer Tools**: Server management, blacklist control, and maintenance mode

## Project Structure

- `src/`: Source code directory
  - `commands/`: Command implementations organized by category
  - `events/`: Discord.js event handlers
  - `utils/`: Utility functions and managers
  - `constants/`: Static data like jokes and facts
  - `index.ts`: Main entry point

## Development Guidelines

### Code Quality

1. **Bug-Free Code**: All code must be thoroughly tested and free of bugs before submission.
2. **Optimization**: Code should be well-optimized and structured for easy future development and maintenance.
3. **Logical Design**: All implementations should make sense and not introduce new problems.

### AI-Generated Code Policy

4. **AI Usage**: If using AI to generate code for PRs, ensure everything works correctly. Refine AI-generated code to maintain a natural, human-written style and quality.

### Customization and Flexibility

5. **Configurability**: The bot should remain highly customizable through environment variables. For example, the bot name can be set in `.env` and will be reflected in all outputs (embeds, messages, etc.).

### Contribution Process

6. **Commit Standards**:
   - Use clear, descriptive commit messages
   - Include detailed descriptions of changes in commit bodies
   
7. **Pull Request Requirements**:
   - Clearly specify all changes made in your PR description
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
6. Deploy commands with `npm run deploy`
7. Start the bot with `npm start`

## Environment Variables

The following environment variables can be configured in your `.env` file:

- `TOKEN`: Your Discord bot token
- `CLIENT_ID`: Your bot's application ID
- `GUILD_ID`: Your development server ID
- `PREFIX`: Command prefix for developer commands (default: `?`)
- `BOT_NAME`: Custom name for your bot (default: `Contrast`)
- `STATUS`: Bot's status (online, idle, dnd, invisible)
- `ACTIVITY_TYPE`: Activity type (PLAYING, WATCHING, LISTENING, COMPETING, STREAMING)
- `ACTIVITY_NAME`: Activity name displayed in the bot's status
- `DEPLOY_GUILD_COMMANDS`: Set to "true" to deploy commands to a specific guild only

## For AI Assistants

Hi, If you're an AI assistant helping with this project:

1. First of all, familiarize yourself with the codebase structure and patterns
2. Ensure any code you suggest follows best practices
3. Maintain the existing error handling and logging patterns
4. Follow the database schema when suggesting changes to data operations
5. Respect the separation of concerns between different managers and utilities
6. Test any code suggestions thoroughly before providing them

## License

This project is open-source and available under the MIT License.