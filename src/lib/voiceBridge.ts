// Bridge between the voice agent's tool calls (WebRTC data channel) and the live
// React app. App registers handlers; VoiceAgent executes tool calls against them.
// Decoupled so the voice layer never imports app internals directly.

export interface VoiceHandlers {
  getState: () => any;
  setAnswer: (proposal: number, choice: "yes" | "no" | "blank") => any;
  goTo: (to: string) => any;
  readCodes: () => any;
  castVote: () => any;
}

let handlers: Partial<VoiceHandlers> = {};

export const voiceBridge = {
  register(h: Partial<VoiceHandlers>) {
    handlers = { ...handlers, ...h };
  },
  // Execute a tool by name; always returns a JSON-serialisable result object.
  run(name: string, args: any): any {
    try {
      switch (name) {
        case "get_state":
          return handlers.getState ? handlers.getState() : { error: "unavailable" };
        case "set_answer":
          return handlers.setAnswer
            ? handlers.setAnswer(Number(args?.proposal), args?.choice)
            : { error: "unavailable" };
        case "go_to":
          return handlers.goTo ? handlers.goTo(String(args?.to)) : { error: "unavailable" };
        case "read_codes":
          return handlers.readCodes ? handlers.readCodes() : { error: "unavailable" };
        case "cast_vote":
          return handlers.castVote ? handlers.castVote() : { error: "unavailable" };
        default:
          return { error: "unknown_tool", name };
      }
    } catch (e: any) {
      return { error: "tool_failed", message: String(e?.message || e) };
    }
  },
};
