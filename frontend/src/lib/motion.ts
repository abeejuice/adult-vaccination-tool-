// Emil Kowalski spring configs — snappy clinical feel
// Rule: only animate transform + opacity. Never layout props.

export const spring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
}

export const springEntrance = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 28,
}

export const springBounce = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 25,
}

// Stagger container for lists
export const staggerContainer = {
  animate: {
    transition: {
      delayChildren: 0.03,
      staggerChildren: 0.04,
    },
  },
}

// Fade + slide up — default entrance
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
}

// Scale pop for badges
export const scalePop = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1,   opacity: 1 },
}

// Slide from left
export const slideLeft = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
}
