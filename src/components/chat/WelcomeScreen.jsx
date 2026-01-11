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
    color: 'text-green-600 bg-green-50 hover:bg-green-100',
  },
  {
    icon: Thermometer,
    title: 'Evaporator Analysis',
    prompt: 'Run a simulation for a quadruple-effect evaporator with 15% syrup concentration',
    color: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
  },
  {
    icon: Beaker,
    title: 'Crystallizer Setup',
    prompt: 'What are the optimal parameters for vacuum pan crystallization at 70°C?',
    color: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
  },
  {
    icon: Filter,
    title: 'Clarifier Settings',
    prompt: 'Calculate the mud volume and clear juice flow for a clarifier with 1000 m³/h input',
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
  },
  {
    icon: Droplets,
    title: 'Mass Balance',
    prompt: 'Perform a complete mass balance for a sugar factory processing 5000 TCD',
    color: 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100',
  },
  {
    icon: Calculator,
    title: 'Recovery Analysis',
    prompt: 'What is the overall sugar recovery percentage for the current factory configuration?',
    color: 'text-rose-600 bg-rose-50 hover:bg-rose-100',
  },
];

function WelcomeScreen({ onSend }) {
  const handlePromptClick = (prompt) => {
    if (onSend) {
      onSend(prompt);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🧮</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Sugar Calculation Engine
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Your intelligent assistant for sugar processing calculations.
          Ask me anything about mill operations, evaporators, crystallizers, and more.
        </p>
      </div>

      {/* Suggested Prompts */}
      <div className="w-full max-w-3xl">
        <h2 className="text-sm font-medium text-gray-500 mb-4 text-center">
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
                  'flex items-start gap-3 p-4 rounded-lg border border-gray-200',
                  'text-left transition-colors duration-200',
                  'hover:border-gray-300 hover:shadow-sm',
                  item.color
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {item.prompt}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-sm text-gray-400 mt-8">
        Type your question below or click a suggestion above
      </p>
    </div>
  );
}

export default WelcomeScreen;
