/**
 * ChatPage — split-panel layout: 28% chat | 72% HX progress.
 *
 * useHXStream lives here (not inside ChatPanel) so the same stream state
 * drives both HXPanel (step display) and ChatPanel (connectStream callback).
 */

import Layout from '../components/layout/Layout';
import ChatPanel from '../components/chat/ChatPanel';
import HXPanel from '../components/hx/HXPanel';
import { useHXStream } from '../hooks/useHXStream';

export default function ChatPage() {
  const {
    steps,
    isRunning,
    currentStep,
    sessionId,
    designResult,
    connectStream,
    respondToEscalation,
  } = useHXStream();

  return (
    <Layout>
      <ChatPanel onHXDesignStarted={connectStream} />
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
