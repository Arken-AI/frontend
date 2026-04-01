/**
 * ChatPage — split-panel layout: 28% chat | 72% HX progress.
 *
 * useHXStream lives here (not inside ChatPanel) so the same stream state
 * drives both HXPanel (step display) and ChatPanel (connectStream callback).
 */

import { useCallback, useState, useRef } from 'react';
import Layout from '../components/layout/Layout';
import ChatPanel from '../components/chat/ChatPanel';
import HXPanel from '../components/hx/HXPanel';
import { useHXStream } from '../hooks/useHXStream';
import { useChatContext } from '../context/ChatContext';
import { getContext } from '../api/client';

/** Delay helper. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Delay before first poll (let backend persist report). */
const REPORT_INITIAL_DELAY_MS = 4000;
/** Retry delay between polls. */
const REPORT_RETRY_DELAY_MS = 4000;
/** Max poll attempts. */
const REPORT_POLL_MAX = 10;

export default function ChatPage() {
  const { conversationId, currentContext } = useChatContext();
  // Holds the report text once fetched — passed to ChatContainer which
  // dispatches ADD_MESSAGE directly (bypasses the isThinking LOAD_MESSAGES guard).
  const [pendingReport, setPendingReport] = useState(null);

  // Called when DESIGN_COMPLETE fires on the HX Engine SSE stream.
  // Polls the backend until the design_report message appears in context,
  // then passes the report text to ChatContainer via state.
  const handleDesignComplete = useCallback(async () => {
    console.log('[ChatPage] handleDesignComplete called, conversationId:', conversationId);
    if (!conversationId) {
      console.warn('[ChatPage] handleDesignComplete: NO conversationId, aborting');
      return;
    }

    console.log('[ChatPage] waiting', REPORT_INITIAL_DELAY_MS, 'ms before first poll...');
    await sleep(REPORT_INITIAL_DELAY_MS);

    for (let attempt = 0; attempt < REPORT_POLL_MAX; attempt++) {
      try {
        console.log('[ChatPage] polling getContext attempt', attempt + 1);
        const ctx = await getContext(conversationId);
        const msgs = ctx?.messages || [];
        console.log('[ChatPage] got', msgs.length, 'messages. Last 3:', msgs.slice(-3).map(m => ({ role: m.role, metaType: m.metadata?.type, contentStart: m.content?.substring(0, 50) })));
        // Find the design report message in the messages array
        const reportMsg = msgs.find(
          (m) =>
            m.role === 'assistant' &&
            (m.metadata?.type === 'design_report' ||
              m.content?.startsWith('### Design Complete')),
        );
        if (reportMsg) {
          console.log('[ChatPage] FOUND report message, length:', reportMsg.content.length);
          setPendingReport(reportMsg.content);
          return;
        }
        console.log('[ChatPage] report NOT found yet');
      } catch (err) {
        console.warn('[ChatPage] getContext error:', err);
      }
      if (attempt < REPORT_POLL_MAX - 1) {
        await sleep(REPORT_RETRY_DELAY_MS);
      }
    }
    console.warn('[ChatPage] exhausted retries, trying one more time...');
    // Exhausted retries — force a context refresh so page-refresh will show it
    try {
      const ctx = await getContext(conversationId);
      const reportMsg = (ctx?.messages || []).find(
        (m) => m.role === 'assistant' && m.metadata?.type === 'design_report',
      );
      if (reportMsg) {
        console.log('[ChatPage] FOUND report on final attempt');
        setPendingReport(reportMsg.content);
      } else {
        console.warn('[ChatPage] report NOT found even on final attempt');
      }
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

  // Ref populated by ChatContainer with its handleSendMessage function.
  // Used to send chat messages from HXPanel ("Explain tradeoffs" button).
  const sendMessageRef = useRef(null);
  const handleChatMessage = useCallback((text) => {
    if (sendMessageRef.current) {
      sendMessageRef.current(text);
    }
  }, []);

  return (
    <Layout>
      <ChatPanel
        onHXDesignStarted={connectStream}
        reportPending={reportPending}
        pendingReport={pendingReport}
        onReportConsumed={handleReportConsumed}
        sendMessageRef={sendMessageRef}
      />
      <HXPanel
        steps={steps}
        isRunning={isRunning}
        currentStep={currentStep}
        design={designResult}
        sessionId={sessionId}
        onRespond={respondToEscalation}
        onChatMessage={handleChatMessage}
      />
    </Layout>
  );
}
