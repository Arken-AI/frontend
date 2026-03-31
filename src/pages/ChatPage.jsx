/**
 * ChatPage — split-panel layout: 28% chat | 72% HX progress.
 *
 * useHXStream lives here (not inside ChatPanel) so the same stream state
 * drives both HXPanel (step display) and ChatPanel (connectStream callback).
 */

import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import ChatPanel from '../components/chat/ChatPanel';
import HXPanel from '../components/hx/HXPanel';
import { useHXStream } from '../hooks/useHXStream';
import { useChatContext } from '../context/ChatContext';
import { getContext } from '../api/client';

/** Delay helper. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Delay before first poll (let backend persist report). */
const REPORT_INITIAL_DELAY_MS = 5000;
/** Retry delay between polls. */
const REPORT_RETRY_DELAY_MS = 3000;
/** Max poll attempts. */
const REPORT_POLL_MAX = 4;

export default function ChatPage() {
  const { conversationId, currentContext } = useChatContext();
  // Holds the report text once fetched — passed to ChatContainer which
  // dispatches ADD_MESSAGE directly (bypasses the isThinking LOAD_MESSAGES guard).
  const [pendingReport, setPendingReport] = useState(null);

  // Called when DESIGN_COMPLETE fires on the HX Engine SSE stream.
  // Polls the backend until the design_report message appears in context,
  // then passes the report text to ChatContainer via state.
  const handleDesignComplete = useCallback(async () => {
    if (!conversationId) return;

    await sleep(REPORT_INITIAL_DELAY_MS);

    for (let attempt = 0; attempt < REPORT_POLL_MAX; attempt++) {
      try {
        const ctx = await getContext(conversationId);
        // Find the design report message in the messages array
        const reportMsg = (ctx?.messages || []).find(
          (m) =>
            m.role === 'assistant' &&
            (m.metadata?.type === 'design_report' ||
              m.content?.startsWith('### Design Complete')),
        );
        if (reportMsg) {
          setPendingReport(reportMsg.content);
          return;
        }
      } catch {
        // Network hiccup — retry
      }
      if (attempt < REPORT_POLL_MAX - 1) {
        await sleep(REPORT_RETRY_DELAY_MS);
      }
    }
    // Exhausted retries — force a context refresh so page-refresh will show it
    try {
      const ctx = await getContext(conversationId);
      const reportMsg = (ctx?.messages || []).find(
        (m) => m.role === 'assistant' && m.metadata?.type === 'design_report',
      );
      if (reportMsg) setPendingReport(reportMsg.content);
    } catch { /* give up */ }
  }, [conversationId]);

  const {
    steps,
    isRunning,
    currentStep,
    sessionId,
    designResult,
    reportPending,
    connectStream,
    respondToEscalation,
  } = useHXStream({ conversationId, currentContext, onDesignComplete: handleDesignComplete });

  // Clear pendingReport once consumed by ChatContainer
  const handleReportConsumed = useCallback(() => setPendingReport(null), []);

  return (
    <Layout>
      <ChatPanel
        onHXDesignStarted={connectStream}
        reportPending={reportPending}
        pendingReport={pendingReport}
        onReportConsumed={handleReportConsumed}
      />
      <HXPanel
        steps={steps}
        isRunning={isRunning}
        currentStep={currentStep}
        design={designResult}
        sessionId={sessionId}
        onRespond={respondToEscalation}
      />
    </Layout>
  );
}
