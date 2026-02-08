/**
 * WelcomeScreen Component
 * 
 * Displayed when there are no messages in the conversation.
 * Shows suggested prompts to help users get started with process simulations.
 */

import { FlaskConical, Columns3, Wind, Droplets, Workflow, Recycle, Sparkles, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const SUGGESTED_PROMPTS = [
  {
    icon: Columns3,
    title: 'Distillation Column',
    prompt: 'Simulate an ethanol-water binary distillation column with 20 stages using NRTL to achieve 85% distillate purity',
    gradient: 'from-blue-500/10 to-indigo-500/10',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    hoverBorder: 'hover:border-blue-300',
  },
  {
    icon: Recycle,
    title: 'Separation with Recycle',
    prompt: 'Set up a benzene-toluene separation flowsheet with a distillation column, splitter with 15% recycle, and Wegstein convergence',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    hoverBorder: 'hover:border-emerald-300',
  },
  {
    icon: FlaskConical,
    title: 'Solvent Recovery',
    prompt: 'Design an IPA recovery unit with collection tank, pump, feed heater, distillation column, and product cooling',
    gradient: 'from-violet-500/10 to-purple-500/10',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600',
    hoverBorder: 'hover:border-violet-300',
  },
  {
    icon: Droplets,
    title: 'Azeotropic Distillation',
    prompt: 'Break the isopropanol-water azeotrope using cyclohexane as entrainer with a 30-stage column and decanter',
    gradient: 'from-amber-500/10 to-orange-500/10',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    hoverBorder: 'hover:border-amber-300',
  },
  {
    icon: Wind,
    title: 'Industrial Drying',
    prompt: 'Simulate a 3-zone continuous flat bed dryer for industrial salt drying with hot air at 363 K and 3% inlet moisture',
    gradient: 'from-cyan-500/10 to-sky-500/10',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-600',
    hoverBorder: 'hover:border-cyan-300',
  },
  {
    icon: Workflow,
    title: 'Flash Separation',
    prompt: 'Run a flash drum simulation for a multi-component hydrocarbon mixture at specified temperature and pressure conditions',
    gradient: 'from-rose-500/10 to-pink-500/10',
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-600',
    hoverBorder: 'hover:border-rose-300',
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
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-content mb-1">
            Start a Conversation
          </h2>
          <p className="text-sm text-content-secondary">
            Ask questions about process simulations
          </p>
        </div>

        <div className="w-full space-y-2">
          {SUGGESTED_PROMPTS.slice(0, 3).map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => handlePromptClick(item.prompt)}
                className="flex items-center gap-3 w-full p-3 rounded-xl border border-gray-100 text-left transition-all duration-200 hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm group"
              >
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', item.iconBg)}>
                  <Icon className={clsx('h-4 w-4', item.iconColor)} />
                </div>
                <span className="text-sm font-medium text-content truncate flex-1">{item.title}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      {/* Hero Section */}
      <div className="text-center mb-10">
        {/* Logo with glow effect */}
        <div className="relative mb-6 flex justify-center">
          <div className="absolute inset-0 w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 blur-xl opacity-30" />
          <img src="/arken-logo.svg" alt="Arken AI" className="relative w-20 h-20 rounded-2xl shadow-lg shadow-blue-500/20" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-3">
          Arken AI
        </h1>
        <p className="text-base text-gray-500 max-w-lg mx-auto leading-relaxed">
          Your intelligent process simulation assistant.
          Design flowsheets, run simulations, and analyze results across industries.
        </p>
      </div>

      {/* Suggested Prompts */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-5">
          <Sparkles className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Suggested prompts
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SUGGESTED_PROMPTS.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => handlePromptClick(item.prompt)}
                className={clsx(
                  'group relative flex items-start gap-3.5 p-4 rounded-xl',
                  'border border-gray-100 bg-white',
                  'text-left transition-all duration-300 ease-out',
                  'hover:shadow-md hover:-translate-y-0.5',
                  item.hoverBorder
                )}
              >
                {/* Subtle gradient background on hover */}
                <div className={clsx(
                  'absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  item.gradient
                )} />
                
                <div className={clsx(
                  'relative z-10 flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
                  item.iconBg
                )}>
                  <Icon className={clsx('h-[18px] w-[18px]', item.iconColor)} />
                </div>
                <div className="relative z-10 flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 mb-0.5 group-hover:text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed group-hover:text-gray-500">
                    {item.prompt}
                  </p>
                </div>
                <ArrowRight className="relative z-10 w-4 h-4 text-gray-200 group-hover:text-gray-400 mt-0.5 flex-shrink-0 transition-all duration-300 group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
