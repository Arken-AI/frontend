/**
 * MarkdownRenderer Component
 * 
 * Renders markdown content with support for tables, code blocks, etc.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Custom code block with copy button
function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') || '';
  const code = String(children).replace(/\n$/, '');
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative group my-2">
      {language && (
        <div className="absolute top-0 left-0 px-2 py-1 text-xs text-gray-500 bg-gray-200 rounded-tl-md rounded-br-md">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-gray-200 hover:bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-gray-600" />
        )}
      </button>
      <pre className={`bg-gray-800 text-gray-100 rounded-md p-4 overflow-x-auto text-sm ${language ? 'pt-8' : ''}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Custom table component
function Table({ children }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-gray-300 text-sm">
        {children}
      </table>
    </div>
  );
}

function TableHead({ children }) {
  return <thead className="bg-gray-100">{children}</thead>;
}

function TableRow({ children }) {
  return <tr className="border-b border-gray-200 hover:bg-gray-50">{children}</tr>;
}

function TableCell({ children, isHeader }) {
  const Component = isHeader ? 'th' : 'td';
  return (
    <Component className={`border border-gray-300 px-3 py-2 text-left ${isHeader ? 'font-semibold bg-gray-100' : ''}`}>
      {children}
    </Component>
  );
}

export default function MarkdownRenderer({ content }) {
  if (!content) return null;
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Code blocks
        code({ node, inline, className, children, ...props }) {
          if (inline) {
            return (
              <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }
          return <CodeBlock className={className}>{children}</CodeBlock>;
        },
        
        // Pre (wraps code blocks) - render as fragment to prevent p > pre nesting
        pre({ children }) {
          return <>{children}</>;
        },
        
        // Tables
        table: Table,
        thead: TableHead,
        tr: TableRow,
        th: ({ children }) => <TableCell isHeader>{children}</TableCell>,
        td: ({ children }) => <TableCell>{children}</TableCell>,
        
        // Links
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {children}
            </a>
          );
        },
        
        // Paragraphs - avoid wrapping block-level elements
        p({ children, node }) {
          // Check if paragraph contains code blocks, which are block-level
          const hasCodeBlock = node?.children?.some(
            child => child.type === 'element' && child.tagName === 'code' && 
            child.properties?.className?.some(c => c.startsWith('language-'))
          );
          
          // Check if contains other block elements (divs, pre tags, etc.)
          const hasBlockElement = node?.children?.some(
            child => child.type === 'element' && 
            ['pre', 'div', 'table', 'blockquote'].includes(child.tagName)
          );
          
          // If it contains block elements, render as div to maintain valid HTML
          if (hasCodeBlock || hasBlockElement) {
            return <div className="mb-2 last:mb-0">{children}</div>;
          }
          
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        
        // Lists
        ul({ children }) {
          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
        },
        
        // Headers
        h1({ children }) {
          return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>;
        },
        
        // Blockquote
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">
              {children}
            </blockquote>
          );
        },
        
        // Horizontal rule
        hr() {
          return <hr className="my-4 border-gray-300" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
