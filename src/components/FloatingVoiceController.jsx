import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, X, MessageCircle } from "lucide-react";
import VoiceCapture from "./VoiceCapture";
import VoiceCommandProcessor from "./VoiceCommandProcessor";
import { gsap } from "gsap";

const FloatingVoiceController = ({ isOpen, onToggle, userId }) => {
  const [isListening, setIsListening] = useState(false);
  const [currentCommand, setCurrentCommand] = useState("");
  const [showProcessor, setShowProcessor] = useState(false);

  // Refs for animation
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (isOpen && overlayRef.current && panelRef.current) {
      // Animate overlay fade in
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: "power1.out" }
      );
      // Animate modal scale/opacity
      gsap.fromTo(
        panelRef.current,
        { y: 30, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [isOpen]);

  const handleVoiceCommand = (transcript) => {
    setCurrentCommand(transcript);
    setShowProcessor(true);
  };

  const handleClose = () => {
    setIsListening(false);
    setShowProcessor(false);
    setCurrentCommand("");
    onToggle(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => onToggle(true)}
          className="animate-pulse fixed bottom-6 right-6 z-50 w-14 h-14 bg-red-500 hover:bg-blue-600 
                     text-white rounded-full shadow-lg transition-all duration-300 
                     hover:scale-110 opacity-20 flex items-center justify-center"
        >
          <MicOff size={24} />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-purple-600 animate-ping opacity-20"></div>
        </button>
      )}

      {/* OVERLAY */}
      {isOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-40 bg-black bg-opacity-60 transition-opacity duration-300"
          onClick={handleClose} // Optional: Click backdrop to close
        />
      )}

      {/* Voice Control Panel (MODAL) */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed left-1/2 top-1/2 z-50 bg-white rounded-2xl shadow-2xl 
                        border border-gray-200 overflow-hidden transition-all duration-300
                        w-80 max-h-96 -translate-x-1/2 -translate-y-1/2"
          style={{ pointerEvents: "auto" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold">VidyaNXT Voice Assistant</h3>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {!showProcessor ? (
              <VoiceCapture
                onTranscriptComplete={handleVoiceCommand}
                isListening={isListening}
                setIsListening={setIsListening}
              />
            ) : (
              <VoiceCommandProcessor
                command={currentCommand}
                userId={userId}
                onComplete={() => setShowProcessor(false)}
                onBack={() => setShowProcessor(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingVoiceController;
