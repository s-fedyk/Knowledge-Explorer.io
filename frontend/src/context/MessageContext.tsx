import React, { createContext, useContext, useState, useRef } from "react";
import { Client } from "@api/query.ts";
import { useTabContext } from "./TabContext";

const MessageContext = createContext();

const SECTION_TYPES = {
  TEXT: "text",
  SUMMARY: {
    type: "summary",
    startToken: "[SUMSTART]",
    endToken: "[SUMEND]",
  },
  FINAL: {
    type: "final",
    startToken: "[FINALSTART]",
    endToken: "[FINALEND]",
  },
};

/**
 * Custom hook to use the MessageContext
 * @returns {Object} MessageContext value
 */
export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessageContext must be used within a MessageProvider");
  }
  return context;
};

/**
 * Provider component for MessageContext
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const MessageProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const { addGraphTab } = useTabContext();
  const cancelStreamRef = useRef(null);

  const streamingStateRef = useRef({
    currentSectionType: SECTION_TYPES.TEXT,
    currentSectionId: null,
    currentSectionText: "",
    currentTextBuffer: "",
    sections: [],
  });

  const addMessage = (sender, text, sections = []) => {
    setMessages((prev) => [
      ...prev,
      {
        sender,
        text,
        sections,
        timestamp: new Date(),
      },
    ]);
    return new Date();
  };

  const updateMessage = (messageId, newText = null, sectionsUpdate = null) => {
    setMessages((prev) =>
      prev.map((message, index) => {
        if (index === messageId) {
          return {
            ...message,
            text: newText !== null ? newText : message.text,
            sections:
              sectionsUpdate !== null ? sectionsUpdate : message.sections,
          };
        }
        return message;
      }),
    );
  };

  /**
   * Find or create a section of specific type in the sections array
   * @param {Array} sections - Current sections array
   * @param {string} sectionId - ID of the section to find/create
   * @param {string} sectionType - Type of the section
   * @param {string} initialContent - Initial content if creating
   * @param {boolean} complete - Whether the section is complete
   * @returns {Object} The found or created section and its index
   */
  const findOrCreateSection = (
    sections,
    sectionId,
    sectionType,
    initialContent = "",
    complete = false,
  ) => {
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);

    if (sectionIndex !== -1) {
      return {
        section: sections[sectionIndex],
        index: sectionIndex,
      };
    }

    const newSection = {
      type: sectionType,
      content: initialContent,
      id: sectionId,
      complete: complete,
    };

    sections.push(newSection);
    return {
      section: newSection,
      index: sections.length - 1,
    };
  };

  /**
   * Handles starting a new section
   * @param {Object} state - Current streaming state
   * @param {string} sectionType - Type of section to start
   * @param {string} token - Current token being processed
   * @param {number} startIndex - Index of start marker in token
   * @param {string} startMarker - Start marker string
   * @returns {string} Any remaining content after start marker
   */
  const handleSectionStart = (
    state,
    sectionType,
    token,
    startIndex,
    startMarker,
  ) => {
    // Finish the current text section if there's any content
    if (startIndex > 0 || state.currentTextBuffer.length > 0) {
      state.currentTextBuffer += token.substring(0, startIndex);

      if (state.currentTextBuffer.length > 0) {
        // Add accumulated text as a section
        if (state.currentSectionType === SECTION_TYPES.TEXT) {
          const { section } = findOrCreateSection(
            state.sections,
            state.currentSectionId || `text-${Date.now()}`,
            SECTION_TYPES.TEXT,
            state.currentTextBuffer,
          );

          // If we were already in a text section, update it
          if (state.currentSectionId) {
            section.content = state.currentTextBuffer;
          }
        } else {
          // If we were in a different section type, create a new text section
          state.sections.push({
            type: SECTION_TYPES.TEXT,
            content: state.currentTextBuffer,
            id: `text-${Date.now()}`,
            complete: true,
          });
        }

        // Clear the text buffer
        state.currentTextBuffer = "";
      }
    }

    // Start new section
    state.currentSectionType = sectionType;
    state.currentSectionId = `${sectionType}-${Date.now()}`;
    state.currentSectionText = "";

    // Process any content after the start marker
    const remainingContent = token.substring(startIndex + startMarker.length);
    return remainingContent;
  };

  /**
   * Handles ending a section
   * @param {Object} state - Current streaming state
   * @param {string} token - Current token being processed
   * @param {number} endIndex - Index of end marker in token
   * @param {string} endMarker - End marker string
   * @returns {string} Any remaining content after end marker
   */
  const handleSectionEnd = (state, token, endIndex, endMarker) => {
    // Add content before the end tag
    state.currentSectionText += token.substring(0, endIndex);

    // Find and update the section
    const { section } = findOrCreateSection(
      state.sections,
      state.currentSectionId,
      state.currentSectionType,
      state.currentSectionText,
      true,
    );

    // Mark as complete and update content
    section.content = state.currentSectionText;
    section.complete = true;

    // Reset to text mode
    state.currentSectionType = SECTION_TYPES.TEXT;
    state.currentSectionId = null;
    state.currentSectionText = "";

    // Process content after the end marker
    const afterEndTag = token.substring(endIndex + endMarker.length);
    return afterEndTag;
  };

  /**
   * Process incoming tokens and manage sections
   * @param {string} token - The token to process
   * @param {number} botMessageIndex - Index of the bot message in messages array
   * @returns {string} Clean text without markers
   */
  const processTokenStream = (token, botMessageIndex) => {
    const state = streamingStateRef.current;
    let processedToken = token;
    let updatedSections = false;

    // Check for all section markers
    const sectionTypes = Object.values(SECTION_TYPES).filter(
      (t) => typeof t === "object",
    );

    // First priority: check for end markers if we're in a special section
    if (state.currentSectionType !== SECTION_TYPES.TEXT) {
      const currentSectionConfig = sectionTypes.find(
        (t) => t.type === state.currentSectionType,
      );

      if (currentSectionConfig) {
        const endIndex = processedToken.indexOf(currentSectionConfig.endToken);

        if (endIndex !== -1) {
          // Handle section end
          const remaining = handleSectionEnd(
            state,
            processedToken,
            endIndex,
            currentSectionConfig.endToken,
          );

          // Set remaining content to be processed
          processedToken = remaining;
          updatedSections = true;
        }
      }
    }

    // Next priority: check for start markers for new sections
    let continueChecking = true;

    while (continueChecking) {
      continueChecking = false;

      for (const sectionConfig of sectionTypes) {
        const startIndex = processedToken.indexOf(sectionConfig.startToken);

        if (startIndex !== -1) {
          // Handle section start
          const remaining = handleSectionStart(
            state,
            sectionConfig.type,
            processedToken,
            startIndex,
            sectionConfig.startToken,
          );

          // Look for an end token in the remaining content
          const endIndex = remaining.indexOf(sectionConfig.endToken);

          if (endIndex !== -1) {
            // Handle immediate section end in the same token
            const afterEnd = handleSectionEnd(
              state,
              remaining,
              endIndex,
              sectionConfig.endToken,
            );

            processedToken = afterEnd;
          } else {
            // Initialize new section
            state.currentSectionText = remaining;

            // Create the new section
            findOrCreateSection(
              state.sections,
              state.currentSectionId,
              state.currentSectionType,
              state.currentSectionText,
              false,
            );

            processedToken = "";
          }

          updatedSections = true;
          continueChecking = processedToken.length > 0;
          break;
        }
      }
    }

    // Handle any remaining token content
    if (processedToken.length > 0) {
      if (state.currentSectionType === SECTION_TYPES.TEXT) {
        // In text mode, append to text buffer
        state.currentTextBuffer += processedToken;

        // Update or create text section
        if (
          state.sections.length > 0 &&
          state.sections[state.sections.length - 1].type === SECTION_TYPES.TEXT
        ) {
          // Append to last text section
          state.sections[state.sections.length - 1].content += processedToken;
        } else {
          // Create new text section
          state.sections.push({
            type: SECTION_TYPES.TEXT,
            content: state.currentTextBuffer,
            id: `text-${Date.now()}`,
            complete: false,
          });
          state.currentTextBuffer = "";
        }

        updatedSections = true;
      } else {
        // In special section, append to current section
        state.currentSectionText += processedToken;

        // Find and update the section
        const { section } = findOrCreateSection(
          state.sections,
          state.currentSectionId,
          state.currentSectionType,
          state.currentSectionText,
          false,
        );

        section.content = state.currentSectionText;
        updatedSections = true;
      }
    }

    // Update the message if sections changed
    if (updatedSections) {
      updateMessage(botMessageIndex, null, [...state.sections]);
    }

    // Construct clean text without markers
    const cleanText = state.sections.reduce((acc, section) => {
      return acc + section.content;
    }, "");

    return cleanText;
  };

  const handleSendMessage = async (userMessage) => {
    // Add user message
    addMessage("user", userMessage);

    // Reset streaming state
    streamingStateRef.current = {
      currentSectionType: SECTION_TYPES.TEXT,
      currentSectionId: null,
      currentSectionText: "",
      currentTextBuffer: "",
      sections: [],
    };

    // Add empty bot message and get its index
    const botMessageIndex = messages.length + 1;
    addMessage("bot", "", []);

    // Track accumulated text for the full message
    let accumulatedText = "";

    const queryRequest = {
      query: userMessage,
      similarity_top_k: 8,
    };

    try {
      // Cancel any previous stream
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
        cancelStreamRef.current = null;
      }

      // Start streaming request
      const cancelFn = await Client.queryStream(
        queryRequest,
        // Token callback
        (token) => {
          // Process the token and get clean text
          accumulatedText = processTokenStream(token, botMessageIndex);

          // Update the main message text updateMessage(botMessageIndex, accumulatedText, null);
        },
        // Completion callback
        async (sessionId) => {
          try {
            console.log(sessionId);
            const sources = (await Client.getSources(sessionId)).sources;

            addGraphTab(sources);
            // Finalize any in-progress sections
            const state = streamingStateRef.current;
            // If we're still in a special section, force complete it
            if (
              state.currentSectionType !== SECTION_TYPES.TEXT &&
              state.currentSectionId
            ) {
              const sectionIndex = state.sections.findIndex(
                (s) => s.id === state.currentSectionId,
              );
              if (sectionIndex !== -1) {
                state.sections[sectionIndex].complete = true;
                updateMessage(botMessageIndex, null, [...state.sections]);
              }
            }
            // Add any remaining text buffer as a final section
            if (state.currentTextBuffer.length > 0) {
              // Check if last section is text
              if (
                state.sections.length > 0 &&
                state.sections[state.sections.length - 1].type ===
                  SECTION_TYPES.TEXT
              ) {
                // Update the existing text section
                state.sections[state.sections.length - 1].content +=
                  state.currentTextBuffer;
              } else {
                // Add a new text section
                state.sections.push({
                  type: SECTION_TYPES.TEXT,
                  content: state.currentTextBuffer,
                  id: `text-${Date.now()}`,
                  complete: true,
                });
              }
              // Clear the buffer
              state.currentTextBuffer = "";
              // Update the message with the updated sections
              updateMessage(botMessageIndex, null, [...state.sections]);
            }
            // Reset streaming state
            cancelStreamRef.current = null;
          } catch (error) {
            console.error("Error getting sources:", error);
            // Still complete the message even if sources failed
            const state = streamingStateRef.current;
            // Finalize sections
            updateMessage(botMessageIndex, null, [...state.sections]);
            // Reset streaming state
            cancelStreamRef.current = null;
          }
        },
        // Error callback
        (error) => {
          console.error("Stream error:", error);
          updateMessage(botMessageIndex, `Streaming error: ${error.message}`);
          cancelStreamRef.current = null;
        },
      );

      // Store cancel function
      cancelStreamRef.current = cancelFn;
    } catch (error) {
      console.error("Query error:", error);
      updateMessage(
        botMessageIndex,
        `API call error: ${error.message || error}`,
      );
    }
  };

  // Function to cancel current stream if needed
  const cancelCurrentStream = () => {
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
      return true;
    }
    return false;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const value = {
    messages,
    addMessage,
    handleSendMessage,
    formatTime,
    cancelCurrentStream,
    isStreaming: !!cancelStreamRef.current,
    sectionTypes: SECTION_TYPES, // Export section types for use in other components
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};
