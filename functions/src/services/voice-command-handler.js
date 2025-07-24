const { VertexAIService } = require("../config/vertex-ai");

class VoiceCommandHandler {
  constructor() {
    this.vertexAI = VertexAIService;
    this.sessionStates = new Map(); // Store conversation states
  }

  // Process voice command and manage conversation flow
  async processVoiceCommand(audioData, sessionId, teacherId) {
    try {
      // Transcribe audio to text
      const transcription = await this.vertexAI.transcribeAudioWithChirp(
        audioData,
        {
          languageCode: "en-US",
          encoding: "WEBM_OPUS",
          sampleRate: 48000,
        }
      );

      console.log("🎤 Transcribed text:", transcription.transcript);

      // Get or create session state
      let sessionState = this.sessionStates.get(sessionId) || {
        step: "initial",
        parameters: {},
        teacherId: teacherId,
      };

      // Process the command based on current state
      const response = await this.processCommandByState(
        transcription.transcript,
        sessionState
      );

      // Update session state
      this.sessionStates.set(sessionId, sessionState);

      return {
        success: true,
        transcript: transcription.transcript,
        response: response.message,
        action: response.action,
        parameters: sessionState.parameters,
        nextStep: sessionState.step,
        confidence: transcription.confidence,
      };
    } catch (error) {
      console.error("❌ Voice command processing failed:", error);
      return {
        success: false,
        error: error.message,
        response:
          "Sorry, I couldn't understand your command. Please try again.",
      };
    }
  }

  // Process commands based on conversation state
  async processCommandByState(transcript, sessionState) {
    const lowerTranscript = transcript.toLowerCase();

    switch (sessionState.step) {
      case "initial":
        return this.handleInitialCommand(lowerTranscript, sessionState);

      case "awaiting_topic":
        return this.handleTopicInput(transcript, sessionState);

      case "awaiting_grades":
        return this.handleGradeSelection(lowerTranscript, sessionState);

      case "confirmation":
        return this.handleConfirmation(lowerTranscript, sessionState);

      default:
        return this.handleInitialCommand(lowerTranscript, sessionState);
    }
  }

  // Handle initial voice commands
  handleInitialCommand(transcript, sessionState) {
    if (this.containsKeywords(transcript, ["create", "content", "generate"])) {
      sessionState.step = "awaiting_topic";
      sessionState.parameters.intent = "create_content";

      return {
        message:
          "I'd be happy to help you create educational content! What topic would you like me to create content about? For example, you could say 'Create a story about water cycle' or 'Explain photosynthesis for students'.",
        action: "request_topic",
      };
    }

    if (this.containsKeywords(transcript, ["search", "find", "library"])) {
      return {
        message:
          "I can help you search the content library. What subject or topic are you looking for?",
        action: "search_content",
      };
    }

    return {
      message:
        "Hello! I can help you create educational content or search your content library. Try saying 'Create content' or 'Search library'. What would you like to do?",
      action: "show_options",
    };
  }

  // Handle topic input
  handleTopicInput(transcript, sessionState) {
    sessionState.parameters.contentRequest = transcript;
    sessionState.step = "awaiting_grades";

    return {
      message: `Great! I'll create content about "${transcript}". Which grades should this content be suitable for? You can say something like "Grade 1 and 2" or "All grades from 1 to 5".`,
      action: "request_grades",
    };
  }

  // Handle grade selection
  handleGradeSelection(transcript, sessionState) {
    const grades = this.extractGrades(transcript);

    if (grades.length === 0) {
      return {
        message:
          "I couldn't identify the grades. Please specify which grades this content should be for, like 'Grade 1', 'Grade 3 and 4', or 'All grades'.",
        action: "request_grades_again",
      };
    }

    sessionState.parameters.grades = grades;
    sessionState.step = "confirmation";

    const gradeList = grades.join(", ");
    return {
      message: `Perfect! I'll create content about "${sessionState.parameters.contentRequest}" for Grade ${gradeList}. Should I proceed with generating this content? Say 'Yes' to continue or 'No' to make changes.`,
      action: "request_confirmation",
    };
  }

  // Handle confirmation
  handleConfirmation(transcript, sessionState) {
    if (
      this.containsKeywords(transcript, [
        "yes",
        "proceed",
        "continue",
        "go ahead",
        "ok",
        "okay",
      ])
    ) {
      sessionState.step = "processing";

      return {
        message:
          "Excellent! I'm now generating your educational content. This may take a few moments while I create grade-specific materials and visual aids.",
        action: "execute_content_creation",
        parameters: {
          teacherId: sessionState.teacherId,
          contentRequest: sessionState.parameters.contentRequest,
          grades: sessionState.parameters.grades,
        },
      };
    }

    if (this.containsKeywords(transcript, ["no", "cancel", "stop", "change"])) {
      sessionState.step = "initial";
      sessionState.parameters = {};

      return {
        message:
          "No problem! Let's start over. What would you like to create content about?",
        action: "restart",
      };
    }

    return {
      message:
        "I didn't catch that. Please say 'Yes' to proceed with creating the content, or 'No' to make changes.",
      action: "request_confirmation_again",
    };
  }

  // Extract grade numbers from transcript
  extractGrades(transcript) {
    const grades = [];
    const gradePatterns = [
      /grade\s*(\d+)/gi,
      /(\d+)(?:st|nd|rd|th)?\s*grade/gi,
      /(\d+)/g,
    ];

    // Check for "all grades" pattern
    if (/all\s*grades?/i.test(transcript)) {
      return ["1", "2", "3", "4", "5"];
    }

    for (const pattern of gradePatterns) {
      const matches = transcript.matchAll(pattern);
      for (const match of matches) {
        const grade = match[1];
        if (grade && grade >= "1" && grade <= "5" && !grades.includes(grade)) {
          grades.push(grade);
        }
      }
    }

    return grades.sort();
  }

  // Check if transcript contains specific keywords
  containsKeywords(transcript, keywords) {
    return keywords.some(
      (keyword) =>
        transcript.includes(keyword) || this.similarWords(transcript, keyword)
    );
  }

  // Basic similarity check for voice recognition errors
  similarWords(transcript, keyword) {
    const variations = {
      create: ["make", "build", "generate", "develop"],
      content: ["material", "lesson", "story"],
      yes: ["yeah", "yep", "sure", "definitely"],
      no: ["nope", "nah", "negative"],
    };

    if (variations[keyword]) {
      return variations[keyword].some((variation) =>
        transcript.includes(variation)
      );
    }
    return false;
  }

  // Clear session state
  clearSession(sessionId) {
    this.sessionStates.delete(sessionId);
  }

  // Get session state
  getSessionState(sessionId) {
    return this.sessionStates.get(sessionId);
  }
}

module.exports = new VoiceCommandHandler();
