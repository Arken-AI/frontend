/**
 * WelcomeScreen Component
 * 
 * Displayed when there are no messages in the conversation.
 * Shows suggested prompts to help users get started.
 */

import { Beaker, Calculator, Factory, Droplets, Thermometer, Filter } from 'lucide-react';
import clsx from 'clsx';

const SUGGESTED_PROMPTS = [
  {
    icon: Factory,
    title: 'Mill Operations',
    prompt: 'Calculate the extraction efficiency for a three-roller mill with 500 tons of cane input',
    color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30',
  },
  {
    icon: Thermometer,
    title: 'Evaporator Analysis',
    prompt: 'Run a simulation for a quadruple-effect evaporator with 15% syrup concentration',
    color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30',
  },
  {
    icon: Beaker,
    title: 'Crystallizer Setup',
    prompt: 'What are the optimal parameters for vacuum pan crystallization at 70°C?',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30',
  },
  {
    icon: Filter,
    title: 'Clarifier Settings',
    prompt: 'Calculate the mud volume and clear juice flow for a clarifier with 1000 m³/h input',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30',
  },
  {
    icon: Droplets,
    title: 'Mass Balance',
    prompt: 'Perform a complete mass balance for a sugar factory processing 5000 TCD',
    color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30',
  },
  {
    icon: Calculator,
    title: 'Recovery Analysis',
    prompt: 'What is the overall sugar recovery percentage for the current factory configuration?',
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30',
  },
];

function WelcomeScreen({ onSend, compact = false }) {
  const handlePromptClick = (prompt) => {
    if (onSend) {
      onSend(prompt);
    }
  };

  // Compact mode for sidebar panels
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">💬</div>
          <h2 className="text-lg font-semibold text-content mb-1">
            Start a Conversation
          </h2>
          <p className="text-sm text-content-secondary">
            Ask questions about your simulation results
          </p>
        </div>

        <div className="w-full space-y-2">
          {SUGGESTED_PROMPTS.slice(0, 3).map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => handlePromptClick(item.prompt)}
                className="flex items-center gap-2 w-full p-3 rounded-lg border border-border text-left transition-colors hover:bg-surface-secondary"
              >
                <Icon className="h-4 w-4 text-content-secondary flex-shrink-0" />
                <span className="text-sm text-content truncate">{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🧮</div>
        <h1 className="text-3xl font-bold text-content mb-2">
          Sugar Calculation Engine
        </h1>
        <p className="text-content-secondary max-w-md mx-auto">
          Your intelligent assistant for sugar processing calculations.
          Ask me anything about mill operations, evaporators, crystallizers, and more.
        </p>
      </div>

      {/* Suggested Prompts */}
      <div className="w-full max-w-3xl">
        <h2 className="text-sm font-medium text-content-secondary mb-4 text-center">
          Try one of these prompts to get started
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SUGGESTED_PROMPTS.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => handlePromptClick(item.prompt)}
                className={clsx(
                  'flex items-start gap-3 p-4 rounded-lg border border-border',
                  'text-left transition-colors duration-200',
                  'hover:border-border-secondary hover:shadow-sm',
                  item.color
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-content mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-content-secondary line-clamp-2">
                    {item.prompt}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-sm text-content-tertiary mt-8">
        Type your question below or click a suggestion above
      </p>
    </div>
  );
}

export default WelcomeScreen;
