import type { UIMessage } from "ai";

export const initialMessages: UIMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Hey! I'm a mocked demo assistant. Drag my header around, or dock me to an edge — then ask me something.",
      },
    ],
  },
];

const canned = [
  "That's a great question. In a real integration this is where a streamed response from your model would land.",
  "I'm just a mock for now, but the drag-and-dock chrome around me is fully wired up.",
  "Try dragging the header near the left or right edge of the window — you'll see a dock zone light up.",
  "Once docked, use the pop-out icon in the header to go back to floating mode.",
  "Everything here is built from shadcn primitives and Vercel's AI Elements, so swapping this mock for `useChat` is mostly a data-layer change.",
];

let cursor = 0;

export const getMockReply = (userText: string): string => {
  if (/hello|hi|hey/i.test(userText)) {
    return "Hey there! What can I help you with?";
  }
  if (/drag|dock|move/i.test(userText)) {
    return "Grab the header and drag toward either edge of the screen — release inside the highlighted zone to dock me there as a drawer.";
  }
  const reply = canned[cursor % canned.length];
  cursor += 1;
  return reply;
};

export const createMessage = (
  role: UIMessage["role"],
  text: string
): UIMessage => ({
  id: crypto.randomUUID(),
  role,
  parts: [{ type: "text", text }],
});
