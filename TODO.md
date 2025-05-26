# Contrast Bot - TODO

## Documentation
- [ ] README.md
  - [ ] Add project overview and features
  - [ ] Add installation instructions
  - [ ] Add usage examples
  - [ ] Add command documentation
  - [ ] Add configuration guide

- [ ] CONTRIBUTING.md
  - [ ] Add development setup instructions
  - [ ] Add coding standards
  - [ ] Add pull request process
  - [ ] Add testing guidelines

## Future Features

### Core Improvements
- [x] Database Integration
  - [x] Switch from JSON to a proper database
  - [x] Add migration scripts
  - [x] Implement data backup

- [x] Github Workflows
  - [x] Enhance `ci.yml`
  - [x] Add dependabot and dependency review
  - [x] Add auto Release on Tag creation
  - [x] Reject stale PR's
  
- [x] Commands
  - [x] General Command System
    - [x] Remove all legacy prefix commands
    - [x] Migrate to slash (`/`) commands exclusively (except developer commands)
  - [x] Developer Commands
    - [x] Restrict usage to developers only
    - [x] Remove slash (`/`) command support for developer commands
    - [x] Retain only prefix commands for developer tools

### Economy

- [ ] Bank Commands and Functionality
  - [x] Add a Contrast Bot currency
  - [x] Reward Contrast currency for various tasks or activity (activity such as amount of Contrast Bot commands user used current day)
  - [x] Commands for Bank Functionality
  - [ ] Add option to choose how many times will the gambling action happen so instead of making the same gambling action to the bot 10 times I will call it once and say that it should happen 10 times.

#### Economy Commands

- [x] `balance.ts`
  - [x] Check currency balance
  - [x] View transaction history
  - [x] Transfer currency
  - [x] Leaderboard
    - [x] Total Earned
    - [x] Total Spent
    - [x] Current Balance

- [x] `daily.ts`
  - [x] Claim daily currency
  - [x] Streak bonuses
  - [x] Cooldown system

- [ ] `shop.ts`
  - [ ] Buy items with currency
  - [ ] View available items
  - [ ] Item effects and benefits

### New Commands

#### Utility

- [ ] `weather.ts`
  - [ ] Show weather for a location using weather API
  - [ ] Show forecast
  - [ ] Support for saving default location

- [ ] `calculator.ts`
  - [ ] Perform mathematical calculations
  - [ ] Support for complex expressions
  - [ ] Show step-by-step solutions

#### Moderation
- [ ] `mute.ts`
  - [ ] Mute users in the server
  - [ ] Set mute duration
  - [ ] Provide reason for mute

- [ ] `warn.ts`
  - [ ] Warn users for rule violations
  - [ ] Track warning history
  - [ ] Set automatic actions for warning thresholds

- [ ] `purge.ts`
  - [ ] Delete multiple messages at once
  - [ ] Filter by user, content, or time
  - [ ] Confirm deletion with count

- [ ] `lockdown.ts`
  - [ ] Lock channels during emergencies
  - [ ] Set lockdown duration
  - [ ] Provide reason for lockdown

#### Fun

- [ ] `meme.ts`
  - [ ] Show random memes (for example: add integration from Reddit)
  - [ ] Allow category selection
  - [ ] Rate memes

#### Social
- [ ] `profile.ts`
  - [ ] Show user profile with stats
  - [ ] Customizable profile cards
  - [ ] Experience and level system (global)

- [ ] `rep-history.ts`
  - [ ] Show reputation history
  - [ ] Filter by given/received
  - [ ] Show timestamps

- [ ] `birthday.ts`
  - [ ] Set and track user birthdays
  - [ ] Send birthday announcements
  - [ ] Show upcoming birthdays

- [ ] `marry.ts`
  - [ ] Allow users to marry each other
  - [ ] Track relationships
  - [ ] Divorce system using `divorce.ts`
  - [ ] Categorize this shit into `E-Dating/` folder in `commands/` dir

- [x] Leveling System