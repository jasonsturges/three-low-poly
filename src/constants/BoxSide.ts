export const BoxSide = {
  LEFT: "left",
  RIGHT: "right",
  TOP: "top",
  BOTTOM: "bottom",
  FRONT: "front",
  BACK: "back",
} as const;

export type BoxSide = (typeof BoxSide)[keyof typeof BoxSide];
