"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn, configureAssistant, getSubjectColor } from "@/lib/utils";
import { getVapiClient } from "@/lib/vapi-client.sdk";
import Image from "next/image";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import soundwaves from "@/constants/soundwaves.json";
import { addToSessionHistory } from "@/lib/actions/companion.actions";
import {
  createLearningSession,
  updateSessionCallId,
  persistConversation,
} from "@/lib/actions/learning.actions";
import { addPendingNoteSession } from "@/components/NotesToastProvider";
import { Mic, MicOff, Phone, PhoneOff, Pause, Play, Loader2, ChevronDown } from "lucide-react";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

/** A committed message in the conversation history */
interface HistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** The current live (partial) transcript being spoken */
interface LiveMessage {
  role: "user" | "assistant";
  content: string;
}

let messageIdCounter = 0;
function nextMessageId(): string {
  return `msg-${Date.now()}-${++messageIdCounter}`;
}

const CompanionComponent = ({
  companionId,
  subject,
  topic,
  name,
  userName,
  userImage,
  style,
  voice,
}: CompanionComponentProps) => {
  // === Call State ===
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // === Transcript State ===
  const [conversationHistory, setConversationHistory] = useState<HistoryMessage[]>([]);
  const [liveMessage, setLiveMessage] = useState<LiveMessage | null>(null);

  // === Learning Session Tracking ===
  const learningSessionIdRef = useRef<string | null>(null);
  const vapiCallIdRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // === Refs ===
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Use refs for values needed inside event handlers to avoid stale closures
  const liveMessageRef = useRef<LiveMessage | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    liveMessageRef.current = liveMessage;
  }, [liveMessage]);

  // === Lottie animation handling ===
  useEffect(() => {
    if (lottieRef.current) {
      if (isSpeaking && !isPaused && callStatus === CallStatus.ACTIVE) {
        lottieRef.current.play();
      } else {
        lottieRef.current.stop();
      }
    }
  }, [isSpeaking, isPaused, callStatus]);

  // === Vapi Event Listeners ===
  useEffect(() => {
    const vapi = getVapiClient();
    if (!vapi) return;

    const onCallStart = () => setCallStatus(CallStatus.ACTIVE);

    const onCallStartSuccess = (event: any) => {
      // Capture the Vapi call ID for session association
      if (event?.callId) {
        vapiCallIdRef.current = event.callId;
        const sessionId = learningSessionIdRef.current;
        if (sessionId) {
          updateSessionCallId(sessionId, event.callId).catch((err) =>
            console.error("Failed to update call ID:", err)
          );
        }
      }
    };

    const onCallEnd = () => {
      // Commit any remaining live message before ending
      setLiveMessage((currentLive) => {
        if (currentLive && currentLive.content.trim()) {
          setConversationHistory((prev) => [
            ...prev,
            { id: nextMessageId(), role: currentLive.role, content: currentLive.content },
          ]);
        }
        return null;
      });
      setCallStatus(CallStatus.FINISHED);
      addToSessionHistory(companionId);

      // === Persist finalized conversation ===
      // Use setTimeout to allow the final setConversationHistory to flush
      setTimeout(() => {
        const sessionId = learningSessionIdRef.current;
        if (!sessionId) return;

        // Access the latest conversationHistory from the DOM closure
        setConversationHistory((currentHistory) => {
          if (currentHistory.length > 0) {
            const durationSeconds = callStartTimeRef.current
              ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
              : undefined;

            persistConversation({
              sessionId,
              messages: currentHistory.map((msg, idx) => ({
                role: msg.role,
                content: msg.content,
                sequenceNumber: idx,
              })),
              vapiCallId: vapiCallIdRef.current || undefined,
              durationSeconds,
            })
              .then(() => {
                addPendingNoteSession(sessionId);
              })
              .catch((err) =>
                console.error("Failed to persist conversation:", err)
              );
          }
          return currentHistory; // Don't modify the state
        });
      }, 100);

      setIsPaused(false);
      setIsMuted(false);
      setIsSpeaking(false);
    };

    const onMessage = (message: any) => {
      if (message.type === "transcript") {
        const role = message.role as "user" | "assistant";
        const content = message.transcript as string;

        if (message.transcriptType === "partial") {
          // Update the live message in-place
          setLiveMessage((prev) => {
            // If role changed (e.g. user interrupted assistant), commit the old message first
            if (prev && prev.role !== role && prev.content.trim()) {
              setConversationHistory((history) => [
                ...history,
                { id: nextMessageId(), role: prev.role, content: prev.content },
              ]);
            }
            // If same role, update in-place. If different role, start fresh.
            if (prev && prev.role === role) {
              return { role, content };
            }
            return { role, content };
          });
        } else if (message.transcriptType === "final") {
          // Commit the final transcript to history
          if (content.trim()) {
            setConversationHistory((prev) => [
              ...prev,
              { id: nextMessageId(), role, content },
            ]);
          }
          // Clear live message only if it's the same role
          setLiveMessage((prev) => {
            if (prev && prev.role === role) {
              return null;
            }
            return prev;
          });
        }
      }

      // Handle speech-update messages for more accurate speaking state
      if (message.type === "speech-update") {
        if (message.status === "started") {
          setIsSpeaking(true);
        } else if (message.status === "stopped") {
          setIsSpeaking(false);
        }
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onError = (error: Error) => {
      console.error("Vapi error:", error);
      setCallStatus(CallStatus.INACTIVE);
      setIsPaused(false);
      setLiveMessage(null);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-start-success", onCallStartSuccess);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("error", onError);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-start-success", onCallStartSuccess);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("error", onError);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
    };
  }, [companionId]);

  // === Auto-scroll — triggered on both history and live message changes ===
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, liveMessage, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
    setAutoScroll(isNearBottom);
    setShowJumpToLatest(!isNearBottom);
  }, []);

  const jumpToLatest = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      setAutoScroll(true);
      setShowJumpToLatest(false);
    }
  }, []);

  // === Controls ===
  const toggleMicrophone = () => {
    const vapi = getVapiClient();
    if (!vapi) return;
    const newMutedState = !isMuted;
    vapi.setMuted(newMutedState);
    setIsMuted(newMutedState);
  };

  const togglePause = () => {
    const vapi = getVapiClient();
    if (!vapi) return;
    if (!isPaused) {
      vapi.send({ type: "control", control: "mute-assistant" });
      vapi.setMuted(true);
      setIsPaused(true);
      setIsMuted(true);
    } else {
      vapi.send({ type: "control", control: "unmute-assistant" });
      vapi.setMuted(false);
      setIsPaused(false);
      setIsMuted(false);
    }
  };

  const handleCall = async () => {
    const vapi = getVapiClient();
    if (!vapi) return;

    setCallStatus(CallStatus.CONNECTING);
    setIsPaused(false);
    setIsMuted(false);
    setConversationHistory([]);
    setLiveMessage(null);
    learningSessionIdRef.current = null;
    vapiCallIdRef.current = null;
    callStartTimeRef.current = Date.now();

    // Create a learning session record before starting the call
    try {
      const { sessionId } = await createLearningSession({
        companionId,
        subject,
        topic,
        title: `${name} — ${topic || subject}`,
      });
      learningSessionIdRef.current = sessionId;
    } catch (err) {
      console.error("Failed to create learning session:", err);
      // Continue with the call even if session creation fails
    }

    const assistantOverrides = {
      variableValues: { subject, topic, style },
      clientMessages: ["transcript", "speech-update"],
      serverMessages: [],
    };

    // @ts-expect-error — Vapi SDK type mismatch with overrides
    vapi.start(configureAssistant(voice, style), assistantOverrides);
  };

  const handleDisconnect = () => {
    const vapi = getVapiClient();
    if (!vapi) return;
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  const companionFirstName = name.split(" ")[0].replace(/[.,]/g, "");

  // === Determine current status ===
  let statusText = "Ready to start";
  if (callStatus === CallStatus.CONNECTING) statusText = "Connecting...";
  if (callStatus === CallStatus.FINISHED) statusText = "Session ended";
  if (callStatus === CallStatus.ACTIVE) {
    if (isPaused) statusText = "Paused";
    else if (liveMessage?.role === "assistant") statusText = "Speaking...";
    else if (liveMessage?.role === "user") statusText = "Listening...";
    else if (isSpeaking) statusText = "Speaking...";
    else statusText = "Listening...";
  }

  return (
    <section className="session-layout">
      
      {/* 1. Header / Identity */}
      <header className="session-identity">
        <div
          className="companion-avatar"
          style={{ backgroundColor: getSubjectColor(subject) }}
        >
          {/* Static Icon */}
          <div
            className={cn(
              "absolute transition-opacity duration-700",
              (callStatus === CallStatus.FINISHED || callStatus === CallStatus.INACTIVE || isPaused)
                ? "opacity-100"
                : "opacity-0",
              callStatus === CallStatus.CONNECTING && "opacity-100 animate-pulse"
            )}
          >
            <Image
              src={`/icons/${subject}.svg`}
              alt={subject}
              width={64}
              height={64}
              className="max-sm:w-12 max-sm:h-12 max-lg:w-16 max-lg:h-16"
            />
          </div>

          {/* Lottie Soundwaves */}
          <div
            className={cn(
              "absolute transition-opacity duration-700",
              (callStatus === CallStatus.ACTIVE && !isPaused) ? "opacity-100" : "opacity-0"
            )}
          >
            <Lottie
              lottieRef={lottieRef}
              animationData={soundwaves}
              autoplay={false}
              className="companion-lottie"
            />
          </div>
        </div>
        <h2 className="font-bold text-xl">{name}</h2>
        <div className="session-status">
          {callStatus === CallStatus.CONNECTING && <Loader2 className="size-3.5 animate-spin" />}
          {statusText}
        </div>
      </header>

      {/* 2. Primary Transcript Area */}
      <section className="transcript-container" aria-label="Session transcript">
        <div className="transcript-fade-top" />
        
        <div 
          className="transcript-scroll no-scrollbar" 
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {/* Empty state */}
          {conversationHistory.length === 0 && !liveMessage && callStatus !== CallStatus.CONNECTING && callStatus !== CallStatus.ACTIVE && (
             <div className="flex-1 flex items-center justify-center text-muted-foreground text-center">
               Press &quot;Start Session&quot; to begin learning.
             </div>
          )}

          {/* Active but waiting for first message */}
          {conversationHistory.length === 0 && !liveMessage && (callStatus === CallStatus.CONNECTING || callStatus === CallStatus.ACTIVE) && (
             <div className="flex-1 flex items-center justify-center text-muted-foreground text-center">
               <Loader2 className="size-5 animate-spin mr-2" />
               {callStatus === CallStatus.CONNECTING ? "Connecting to session..." : "Waiting for Lingo to speak..."}
             </div>
          )}
          
          {/* Committed conversation history */}
          {conversationHistory.map((message, index) => {
            const isAI = message.role === "assistant";
            // Keep the last message visually bright if no new message has started
            const isCurrentActive = index === conversationHistory.length - 1 && !liveMessage;
            
            return (
              <div 
                key={message.id} 
                className={cn("msg-row", isAI ? "msg-ai" : "msg-user")}
              >
                <span className="msg-label">
                  {isAI ? companionFirstName : userName}
                </span>
                <p className={cn(
                  "msg-content",
                  isCurrentActive ? "msg-live" : "subdued",
                  isCurrentActive && isAI ? "text-foreground" : "",
                  isCurrentActive && !isAI ? "text-primary" : ""
                )}>
                  {message.content}
                </p>
              </div>
            );
          })}

          {/* Live message — the current caption */}
          {liveMessage && (
            <div 
              className={cn(
                "msg-row",
                liveMessage.role === "assistant" ? "msg-ai" : "msg-user"
              )}
              aria-live="polite"
              aria-atomic="false"
            >
              <span className="msg-label">
                {liveMessage.role === "assistant" ? companionFirstName : userName}
              </span>
              <p className={cn(
                "msg-content msg-live",
                liveMessage.role === "assistant" ? "text-foreground" : "text-primary"
              )}>
                {liveMessage.content}
              </p>
            </div>
          )}
          
          {/* Spacer for bottom fade */}
          <div className="h-4" />
        </div>

        <div className="transcript-fade-bottom" />

        {/* Jump to latest button */}
        {showJumpToLatest && (
          <button 
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg transition-all hover:bg-primary-hover"
            onClick={jumpToLatest}
            aria-label="Jump to latest message"
          >
            <ChevronDown className="size-3.5" strokeWidth={2} />
            New message
          </button>
        )}

        {/* Pause Overlay */}
        {isPaused && (
          <div className="pause-overlay">
            <Pause className="size-10 text-foreground opacity-50" strokeWidth={1.5} />
            <h3 className="text-xl font-bold">Conversation paused</h3>
            <p className="text-muted-foreground max-w-xs">
              Take your time. Resume when you&apos;re ready to continue learning.
            </p>
          </div>
        )}
      </section>

      {/* 3. Controls */}
      <section className="session-controls">
        <div className="controls-row">
          {/* Pause/Resume Toggle */}
          <button
            className="btn-control"
            onClick={togglePause}
            disabled={callStatus !== CallStatus.ACTIVE}
            aria-label={isPaused ? "Resume conversation" : "Pause conversation"}
          >
            {isPaused ? (
              <Play className="size-6 text-success" strokeWidth={2} />
            ) : (
              <Pause className={cn("size-6", callStatus !== CallStatus.ACTIVE ? "text-muted-foreground" : "text-foreground")} strokeWidth={2} />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isPaused ? "Resume" : "Pause"}
            </span>
          </button>

          {/* Mute/Unmute Toggle */}
          <button
            className="btn-control"
            onClick={toggleMicrophone}
            disabled={callStatus !== CallStatus.ACTIVE}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? (
              <MicOff className="size-6 text-destructive" strokeWidth={2} />
            ) : (
              <Mic className={cn("size-6", callStatus !== CallStatus.ACTIVE ? "text-muted-foreground" : "text-primary")} strokeWidth={2} />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isMuted ? "Unmute" : "Mute"}
            </span>
          </button>
        </div>

        {/* Main Session Button */}
        <button
          className={cn(
            "btn-end",
            callStatus === CallStatus.ACTIVE
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary-hover",
            callStatus === CallStatus.CONNECTING && "animate-pulse",
            callStatus === CallStatus.FINISHED && "bg-success text-white hover:bg-success/90"
          )}
          onClick={
            callStatus === CallStatus.ACTIVE
              ? handleDisconnect
              : callStatus === CallStatus.FINISHED
                ? () => setCallStatus(CallStatus.INACTIVE)
                : handleCall
          }
          aria-label={
            callStatus === CallStatus.ACTIVE
              ? "End learning session"
              : "Start learning session"
          }
        >
          {callStatus === CallStatus.ACTIVE ? (
            <>
              <PhoneOff className="size-4" strokeWidth={2} />
              End Session
            </>
          ) : callStatus === CallStatus.CONNECTING ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              Connecting...
            </>
          ) : callStatus === CallStatus.FINISHED ? (
            <>
              <Phone className="size-4" strokeWidth={2} />
              New Session
            </>
          ) : (
            <>
              <Phone className="size-4" strokeWidth={2} />
              Start Session
            </>
          )}
        </button>
      </section>

    </section>
  );
};

export default CompanionComponent;