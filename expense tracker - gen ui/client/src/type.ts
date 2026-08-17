export type StreamMessage =
  | {
      id: string;
      type: "user";
      payload: { text: string };
    }
  // Case 1: AI text token (streaming word-by-word)
  | {
      id: string;
      type: "ai";
      payload: { text: string };
    }
  // Case 2: Tool shuru hone ka notification (e.g., "add_expense chal raha hai")
  | {
      id: string;
      type: "toolCall:start";
      payload: {
        name: string; // Tool ka naam
        args: Record<string, any>; // Tool ke arguments (key-value pairs)
      };
    }
  // Case 3: Tool complete hone ka result
  | {
      id: string;
      type: "tool";
      payload: {
        name: string; // Tool ka naam
        result: Record<string, any>; // Tool ka output
      };
    };
