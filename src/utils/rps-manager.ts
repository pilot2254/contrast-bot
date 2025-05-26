// Define types
export type RPSChoice = "rock" | "paper" | "scissors"
export type RPSResult = "win" | "loss" | "tie"

// Get bot choice
export function getBotChoice(): RPSChoice {
  const choices: RPSChoice[] = ["rock", "paper", "scissors"]
  return choices[Math.floor(Math.random() * choices.length)]
}

// Determine game result
export function determineResult(playerChoice: RPSChoice, botChoice: RPSChoice): RPSResult {
  if (playerChoice === botChoice) {
    return "tie"
  }

  if (
    (playerChoice === "rock" && botChoice === "scissors") ||
    (playerChoice === "paper" && botChoice === "rock") ||
    (playerChoice === "scissors" && botChoice === "paper")
  ) {
    return "win"
  }

  return "loss"
}
