"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatStatus, UIMessage } from "ai";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import {
  GripHorizontal,
  MessageCircle,
  PanelLeftIcon,
  PanelRightIcon,
  PictureInPicture2,
  SparklesIcon,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createMessage, getMockReply, initialMessages } from "./mock-conversation";

type Dock = "floating" | "left" | "right";

const PANEL_WIDTH = 384;
const FLOATING_HEIGHT = 576;
// Must stay bigger than DOCK_THRESHOLD — this is how far from the edge the
// panel rests by default, and it needs to sit outside the dock zone so
// dropping it back near its starting spot doesn't redock it.
const EDGE_MARGIN = 40;
const DOCK_THRESHOLD = 24;
const DRAG_OVERHANG = 240;
const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const getDockTarget = (
  dock: Dock,
  position: { x: number; y: number },
  viewport: { width: number; height: number }
) => {
  if (dock === "left") {
    return { x: 0, y: 0 };
  }
  if (dock === "right") {
    return { x: Math.max(viewport.width - PANEL_WIDTH, 0), y: 0 };
  }
  return position;
};

const getMessageText = (message: UIMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-1 py-1.5">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
        style={{ animationDelay: `${i * 120}ms` }}
      />
    ))}
  </div>
);

export function ChatWidget({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dock, setDock] = useState<Dock>("floating");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragZone, setDragZone] = useState<"left" | "right" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasPositioned, setHasPositioned] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [status, setStatus] = useState<ChatStatus>("ready");

  // Panel position is driven by these motion values so dragging updates the
  // DOM directly every pointer move instead of round-tripping through React
  // state and re-rendering the whole widget on every frame.
  const left = useMotionValue(0);
  const top = useMotionValue(0);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragZoneRef = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    const updateViewport = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  // Places the panel on first open, then keeps it in sync with `dock`,
  // `position`, and viewport changes — but only when the user isn't actively
  // dragging, since drag updates `left`/`top` imperatively below.
  useEffect(() => {
    if (!isOpen || isDragging || viewport.width === 0) {
      return;
    }

    if (!hasPositioned) {
      const initial = {
        x: viewport.width - PANEL_WIDTH - EDGE_MARGIN,
        y: viewport.height - FLOATING_HEIGHT - EDGE_MARGIN,
      };
      left.set(initial.x);
      top.set(initial.y);
      setPosition(initial);
      setHasPositioned(true);
      return;
    }

    const target = getDockTarget(dock, position, viewport);
    const controlsX = animate(left, target.x, SPRING);
    const controlsY = animate(top, target.y, SPRING);
    return () => {
      controlsX.stop();
      controlsY.stop();
    };
  }, [isOpen, isDragging, hasPositioned, dock, position, viewport, left, top]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const x = clamp(
        event.clientX - dragOffset.current.x,
        -DRAG_OVERHANG,
        window.innerWidth - PANEL_WIDTH + DRAG_OVERHANG
      );
      const y = clamp(
        event.clientY - dragOffset.current.y,
        EDGE_MARGIN,
        window.innerHeight - FLOATING_HEIGHT - EDGE_MARGIN
      );
      left.set(x);
      top.set(y);

      let zone: "left" | "right" | null = null;
      if (x <= DOCK_THRESHOLD) {
        zone = "left";
      } else if (x + PANEL_WIDTH >= window.innerWidth - DOCK_THRESHOLD) {
        zone = "right";
      }

      if (dragZoneRef.current !== zone) {
        dragZoneRef.current = zone;
        setDragZone(zone);
      }
    },
    [left, top]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    const zone = dragZoneRef.current;
    dragZoneRef.current = null;
    setDragZone(null);

    if (zone) {
      setDock(zone);
    } else {
      setPosition({
        x: clamp(left.get(), EDGE_MARGIN, window.innerWidth - PANEL_WIDTH - EDGE_MARGIN),
        y: clamp(top.get(), EDGE_MARGIN, window.innerHeight - FLOATING_HEIGHT - EDGE_MARGIN),
      });
    }
  }, [left, top]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleHeaderPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    // Start the drag from wherever the panel currently sits on screen (no
    // teleporting under the cursor) — if it's docked, this also kicks off
    // the size morph back to a floating card while the drag continues.
    dragOffset.current = {
      x: event.clientX - left.get(),
      y: event.clientY - top.get(),
    };

    if (dock !== "floating") {
      setDock("floating");
    }

    setIsDragging(true);
  };

  const handleSubmit = useCallback((message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text) {
      return;
    }

    setMessages((prev) => [...prev, createMessage("user", text)]);
    setStatus("submitted");

    window.setTimeout(() => {
      setStatus("streaming");
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", getMockReply(text)),
        ]);
        setStatus("ready");
      }, 550);
    }, 450);
  }, []);

  const panelSize =
    dock === "floating"
      ? { width: PANEL_WIDTH, height: FLOATING_HEIGHT, borderRadius: 16 }
      : {
          width: PANEL_WIDTH,
          height: viewport.height || FLOATING_HEIGHT,
          borderRadius: 0,
        };

  const contentInset = isOpen && dock !== "floating" ? PANEL_WIDTH : 0;

  const panelContent = (
    <>
      <div
        className={cn(
          "flex items-center gap-2 border-b bg-card px-3 py-2.5 select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={handleHeaderPointerDown}
      >
        <GripHorizontal className="size-4 shrink-0 text-muted-foreground" />
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <SparklesIcon className="size-3.5" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            Demo Assistant
          </p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            {status === "ready" ? "Online" : "Typing…"}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          {dock === "floating" ? (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setDock("left")}
                    />
                  }
                >
                  <PanelLeftIcon className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Dock left</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setDock("right")}
                    />
                  }
                >
                  <PanelRightIcon className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Dock right</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setPosition({
                        x: window.innerWidth - PANEL_WIDTH - EDGE_MARGIN,
                        y: window.innerHeight - FLOATING_HEIGHT - EDGE_MARGIN,
                      });
                      setDock("floating");
                    }}
                  />
                }
              >
                <PictureInPicture2 className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Undock</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setIsOpen(false)}
                />
              }
            >
              <X className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Conversation className="min-h-0">
        <ConversationContent>
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                <MessageResponse>{getMessageText(message)}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
          {status !== "ready" && (
            <Message from="assistant">
              <MessageContent>
                <TypingIndicator />
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit} className="border-t p-2">
        <PromptInputBody>
          <PromptInputTextarea placeholder="Ask a question…" rows={1} />
        </PromptInputBody>
        <PromptInputFooter className="justify-end border-t-0 py-1.5">
          <PromptInputSubmit status={status} />
        </PromptInputFooter>
      </PromptInput>
    </>
  );

  return (
    <>
      <motion.div
        className="flex flex-1 flex-col"
        animate={{
          marginLeft: dock === "left" ? contentInset : 0,
          marginRight: dock === "right" ? contentInset : 0,
        }}
        transition={SPRING}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <Button
              size="icon"
              className="size-14 rounded-full shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="size-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDragging && (
          <>
            <motion.div
              className={cn(
                "pointer-events-none fixed inset-y-0 left-0 z-40 w-28 border-r-2 border-dashed",
                dragZone === "left"
                  ? "border-primary bg-primary/10"
                  : "border-transparent bg-transparent"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className={cn(
                "pointer-events-none fixed inset-y-0 right-0 z-40 w-28 border-l-2 border-dashed",
                dragZone === "right"
                  ? "border-primary bg-primary/10"
                  : "border-transparent bg-transparent"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (dock !== "floating" || hasPositioned) && (
          <motion.div
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden bg-background",
              dock === "floating" && "border shadow-2xl",
              dock === "left" && "border-r shadow-[8px_0_32px_-8px_rgb(0_0_0_/_0.2)]",
              dock === "right" && "border-l shadow-[-8px_0_32px_-8px_rgb(0_0_0_/_0.2)]"
            )}
            style={{ position: "fixed", left, top }}
            initial={{
              opacity: 0,
              scale: 0.96,
              width: panelSize.width,
              height: panelSize.height,
              borderRadius: panelSize.borderRadius,
            }}
            animate={{
              width: panelSize.width,
              height: panelSize.height,
              borderRadius: panelSize.borderRadius,
              opacity: 1,
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={SPRING}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
