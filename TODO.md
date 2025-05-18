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
- [ ] Database Integration
  - [ ] Switch from JSON to a proper database
  - [ ] Add migration scripts
  - [ ] Implement data backup

### Economy

- [ ] Bank Commands and Functionality
  - [ ] Add a Contrast Bot currency
  - [ ] Reward Contrast currency for various tasks or activity (activity such as amount of Contrast Bot commands user used current day)
  - [ ] Commands for Bank Functionality

#### Economy Commands

- [ ] `balance.ts`
  - [ ] Check currency balance
  - [ ] View transaction history
  - [ ] Transfer currency
  - [ ] Leaderboard
    - [ ] Total Earned
    - [ ] Total Spent
    - [ ] Current Balance

- [ ] `daily.ts`
  - [ ] Claim daily currency
  - [ ] Streak bonuses
  - [ ] Cooldown system

- [ ] `shop.ts`
  - [ ] Buy items with currency
  - [ ] View available items
  - [ ] Item effects and benefits

- [ ] `gamble.ts`
  - [ ] Bet currency on games
  - [ ] Different gambling games
  - [ ] Win/loss tracking
  - [ ] Gamble leaderboard

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

- [ ] `rps-tournament.ts`
  - [ ] Create RPS tournaments
  - [ ] Bracket system
  - [ ] Prizes for winners (Contrast currency)

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

## Infrastructure
- [ ] CI/CD Pipeline
  - [ ] Automated testing
  - [ ] Automated deployment
  - [ ] Version management

- [ ] Monitoring
  - [ ] Error tracking
  - [ ] Performance monitoring
  - [ ] Usage statistics

- [ ] Scalability
  - [ ] Sharding support
  - [ ] Load balancing
  - [ ] Resource optimization