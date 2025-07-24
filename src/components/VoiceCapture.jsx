// src/components/VoiceCapture.jsx
import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader, Volume2 } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
// import { useNetwork } from "../contexts/NetworkContext";

export default function VoiceCapture({
  onTranscriptComplete,
  isListening,
  setIsListening,
}) {
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  // const { isOnline } = useNetwork();
  const isOnline = true;

  // Web Speech API fallback for offline
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isOnline) {
      // Initialize Web Speech API for offline use
      if ("webkitSpeechRecognition" in window) {
        recognitionRef.current = new window.webkitSpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "hi-IN";

        recognitionRef.current.onresult = (event) => {
          const result = event.results[0][0].transcript;
          setTranscript(result);
          onTranscriptComplete(result);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event) => {
          setError("Voice recognition failed");
          setIsListening(false);
        };
      }
    }
  }, [isOnline, onTranscriptComplete]);

  const startRecording = async () => {
    setError("");
    setTranscript("");
    setIsListening(true);

    if (!isOnline) {
      // Use Web Speech API for offline
      if (recognitionRef.current) {
        recognitionRef.current.start();
      } else {
        setError("Voice recognition not supported");
        setIsListening(false);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        await processAudioWithChirp(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      setError("Microphone access denied");
      setIsListening(false);
    }
  };

  const stopRecording = () => {
    if (!isOnline && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processAudioWithChirp = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const processVoiceCommand = httpsCallable(
        functions,
        "processVoiceCommand"
      );

      const result = await processVoiceCommand({
        audioBase64: audioBase64.split(",")[1], // Remove data:audio/wav;base64,
        language: "hi-IN",
        useChirp: true,
      });

      if (result.data.success) {
        setTranscript(result.data.transcript);
        onTranscriptComplete(result.data.transcript);
      } else {
        setError("Voice processing failed");
      }
    } catch (err) {
      setError("Failed to process voice command");
      console.error("Voice processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <div className="text-center">
      {/* Status Indicator */}
      <div className="mb-4">
        <div
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            isOnline
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full mr-2 ${
              isOnline ? "bg-green-500" : "bg-yellow-500"
            }`}
          ></div>
          {isOnline ? "Online (Chirp)" : "Offline (Web Speech)"}
        </div>
      </div>

      {/* Voice Command Instructions */}
      <div className="mb-4 text-sm text-gray-600">
        <p>Try saying:</p>
        <ul className="text-xs mt-2 space-y-1">
          <li>"Create a story about farmers"</li>
          <li>"Make worksheet for grade 3"</li>
          <li>"Start reading assessment"</li>
        </ul>
      </div>

      {/* Recording Button */}
      <div className="mb-4">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full flex items-center justify-center
                     transition-all duration-200 shadow-lg ${
                       isListening
                         ? "bg-red-500 scale-110 animate-pulse"
                         : isProcessing
                         ? "bg-gray-400 cursor-not-allowed"
                         : "bg-blue-500 hover:bg-blue-600 active:scale-95"
                     }`}
        >
          {isProcessing ? (
            <Loader className="text-white animate-spin" size={24} />
          ) : isListening ? (
            <Mic className="text-white" size={24} />
          ) : (
            <MicOff className="text-white" size={24} />
          )}
        </button>

        <p className="text-xs text-gray-500 mt-2">
          {isProcessing ? "Processing..." : "Hold to speak"}
        </p>
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="bg-gray-50 p-3 rounded-lg text-sm">
          <div className="flex items-center mb-2">
            <Volume2 size={16} className="text-blue-500 mr-2" />
            <span className="font-medium">You said:</span>
          </div>
          <p className="text-gray-700 italic">"{transcript}"</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
