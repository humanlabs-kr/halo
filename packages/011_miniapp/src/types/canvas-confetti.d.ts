declare module 'canvas-confetti' {
  type ConfettiOptions = {
    particleCount?: number
    spread?: number
    startVelocity?: number
    decay?: number
    origin?: { x?: number; y?: number }
    colors?: string[]
    scalar?: number
  }

  function confetti(options?: ConfettiOptions): void

  export default confetti
}

