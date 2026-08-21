"use client";

import { useEffect, useRef, useState } from "react";
import { cn, configureAssistant, getSubjectColor } from "@/lib/utils";
import { getVapiClient } from "@/lib/vapi-client.sdk";
import Image from "next/image";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import soundwaves from "@/constants/soundwaves.json";
import { addToSessionHistory } from "@/lib/actions/companion.actions";
import { Mic, MicOff, Phone, PhoneOff, Pause, Play, Loader2 } from "lucide-react";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
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
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Lottie animation handling
  useEffect(() => {
    if (lottieRef.current) {
      if (isSpeaking && !isPaused && callStatus === CallStatus.ACTIVE) {
        lottieRef.current.play();
      } else {
        lottieRef.current.stop();
      }
    }
  }, [isSpeaking, isPaused, callStatus]);

  // Vapi Event Listeners
  useEffect(() => {
    const vapi = getVapiClient();
    if (!vapi) return;

    const onCallStart = () => setCallStatus(CallStatus.ACTIVE);

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
      addToSessionHistory(companionId);
      setIsPaused(false);
      setIsMuted(false);
    };

    const onMessage = (message: Message) => {
      if (
        message.type === "transcript" &&
        message.transcriptType === "final"
      ) {
        setMessages((prev) => [
          ...prev, 
          { role: message.role, content: message.transcript }
        ]);
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onError = (error: Error) => {
      console.error("Vapi error:", error);
      setCallStatus(CallStatus.INACTIVE);
      setIsPaused(false);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("error", onError);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("error", onError);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
    };
  }, [companionId]);

  // Auto-scroll mechanism
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // If we scroll up, disable auto-scroll. If we hit the bottom, enable it.
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
  };

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
      // Pause: Mute assistant and mute user
      vapi.send({ type: "control", control: "mute-assistant" });
      vapi.setMuted(true);
      setIsPaused(true);
      setIsMuted(true); // Update local state for mic UI
    } else {
      // Resume: Unmute assistant and unmute user
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
    setMessages([]); // clear history on new call

    const assistantOverrides = {
      variableValues: { subject, topic, style },
      clientMessages: ["transcript"],
      serverMessages: [],
    };

    // @ts-expect-error — Vapi SDK type mismatch
    vapi.start(configureAssistant(voice, style), assistantOverrides);
  };

  const handleDisconnect = () => {
    const vapi = getVapiClient();
    if (!vapi) return;
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  const companionFirstName = name.split(" ")[0].replace(/[.,]/g, "");

  // Determine current active status text
  let statusText = "Ready to start";
  if (callStatus === CallStatus.CONNECTING) statusText = "Connecting...";
  if (callStatus === CallStatus.FINISHED) statusText = "Session ended";
  if (callStatus === CallStatus.ACTIVE) {
    if (isPaused) statusText = "Paused";
    else if (isSpeaking) statusText = "Lingo is speaking...";
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
          {messages.length === 0 && callStatus !== CallStatus.CONNECTING && callStatus !== CallStatus.ACTIVE && (
             <div className="flex-1 flex items-center justify-center text-muted-foreground text-center">
               Press "Start Session" to begin learning.
             </div>
          )}
          
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const isAI = message.role === "assistant";
            
            return (
              <div 
                key={index} 
                className={cn("msg-row", isAI ? "msg-ai" : "msg-user")}
              >
                <span className="msg-label">
                  {isAI ? companionFirstName : userName}
                </span>
                <p
                  className={cn(
                    "msg-content",
                    isAI ? "text-foreground" : "text-primary",
                    !isLastMessage && "subdued"
                  )}
                >
                  {message.content}
                </p>
              </div>
            );
          })}
          
          {/* Invisible spacer to ensure we can scroll past the bottom fade */}
          <div className="h-4" />
        </div>

        <div className="transcript-fade-bottom" />

        {/* Pause Overlay */}
        {isPaused && (
          <div className="pause-overlay">
            <Pause className="size-10 text-foreground opacity-50" strokeWidth={1.5} />
            <h3 className="text-xl font-bold">Conversation paused</h3>
            <p className="text-muted-foreground max-w-xs">
              Take your time. Resume when you're ready to continue learning.
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