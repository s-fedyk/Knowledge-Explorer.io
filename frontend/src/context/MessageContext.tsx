import React, { createContext, useContext, useState, useEffect } from "react";
import { useTabContext } from "./TabContext";
import { Client } from "@api/query.ts";

const MessageContext = createContext();

/**
 * Custom hook to consume the MessageContext
 */
export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessageContext must be used within a MessageProvider");
  }
  return context;
};

/**
 * Provider component for streaming multi-stage jobs
 */
export const MessageProvider = ({ children }) => {
  // message history
  const [messages, setMessages] = useState([]);
  const [queryMode, setQueryMode] = useState("global");

  // streaming state
  const [queryID, setQueryID] = useState(null);
  const [totalStages, setTotalStages] = useState(0);
  const [stage, setStage] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(false);
  const { addGraphTab } = useTabContext();

  /**
   * Injects new sections into the last bot message
   */
  const onNewSections = (sections) => {
    if (sections.length === 0) return;
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = {
        ...last,
        sections: [...last.sections, ...sections],
      };
      return copy;
    });
  };

  /**
   * Called by each Section component when its job finishes
   */
  const markDone = () => {
    setPending((p) => p - 1);
  };

  /**
   * Kick off the next stage whenever pending hits zero
   */
  useEffect(() => {
    console.log("Trying next stage", stage, loading, pending);
    if (!loading && pending === 0 && stage > 0 && stage <= totalStages) {
      setStage(stage + 1);
    }
  }, [loading, pending, stage, totalStages]);

  /**
   * Fetch jobs for a given stage
   */
  useEffect(() => {
    if (
      loading ||
      !queryID ||
      stage === 0 ||
      stage > totalStages ||
      pending > 0
    )
      return;

    setLoading(true);
    (async () => {
      console.log("Stepping into stage", stage);
      const { jobs, sources } = await Client.step(queryID, stage);

      if (sources) {
        addGraphTab(sources);
      }

      const sections = jobs.flatMap(([type, ids]) =>
        ids.map((id) => ({
          id,
          type,
          content: "",
          onComplete: () => {
            markDone();
          },
        })),
      );
      onNewSections(sections);
      setPending(sections.length);
    })().then(() => {
      setLoading(false);
    });
  }, [loading, queryID, stage, totalStages, pending, markDone]);

  /**
   * When queryID is set, reset to first stage
   */
  useEffect(() => {
    if (queryID) {
      setStage(1);
      setPending(0);
    }
  }, [queryID]);

  /**
   * Send a user message and initialize streaming
   */
  const handleSendMessage = async (text, mode) => {
    // add user then bot placeholder
    setMessages((prev) => [
      ...prev,
      { sender: "user", text, sections: [], timestamp: new Date() },
      { sender: "bot", text: "", sections: [], timestamp: new Date() },
    ]);

    const resp = await Client.query({ query: text, top_k: 5, mode });
    setQueryID(resp.query_id);
    setTotalStages(resp.stages);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <MessageContext.Provider
      value={{
        messages,
        handleSendMessage,
        markDone,
        setQueryMode,
        queryMode,
        currentStage: stage,
        jobsLeft: pending,
        formatTime,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};
