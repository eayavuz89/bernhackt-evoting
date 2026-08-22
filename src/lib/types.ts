import type { Answer } from "./data";

// Voting session shared across the flow screens (Ballot → Verify → Done).
// Lives here rather than in App so screens don't depend back on the router root.
export interface Session {
  answers: Record<string, Answer>;
  setAnswer: (id: string, a: Answer) => void;
  reset: () => void;
}
