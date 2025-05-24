import React, { createContext, useContext, useState, useRef } from "react";
import { Client } from "@api/query.ts";
import { useTabContext } from "./TabContext";

const MessageContext = createContext();

const SECTION_TYPES = {
  TEXT: "text",
  ENTITY: {
    type: "entity",
    startToken: "[ENTITYSTART]",
    endToken: "[ENTITYEND]",
  },
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
  const [queryMode, setQueryMode] = useState("global");
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

  const handleSendMessage = async (userMessage, mode) => {
    // Add user message
    addMessage("user", userMessage);

    // Add empty bot message and get its index
    const botMessageIndex = messages.length + 1;
    addMessage("bot", "", []);

    const queryRequest = {
      query: userMessage,
      top_k: 5,
      mode: mode,
    };

    const queryResponse = await Client.query(queryRequest);
    const queryId = queryResponse.query_id;
    if (!queryId) {
      throw new Error("No query ID received from server");
    }

    // Step 2: Execute the step to get jobs
    const stepResponse = await Client.step(queryId);
    console.log("STEP RESPONSE");
    const jobs = stepResponse.jobs;

    setMessages((prev) => {
      const new_messages = [...prev];
      const lastMessage = new_messages[new_messages.length - 1];

      const allNewSections = jobs.flatMap(([sectionType, jobIDs]) =>
        jobIDs.map((jobId) => ({
          id: jobId,
          type: sectionType,
          content: "",
          status: "pending",
        })),
      );

      new_messages[new_messages.length - 1] = {
        ...lastMessage,
        sections: [...lastMessage.sections, ...allNewSections],
      };

      return new_messages;
    });

    console.log("MESSAGES UPDATED", jobs);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const value = {
    messages,
    addMessage,
    queryMode,
    setQueryMode,
    handleSendMessage,
    formatTime,
    isStreaming: !!cancelStreamRef.current,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};
