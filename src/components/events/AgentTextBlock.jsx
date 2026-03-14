import MarkdownRenderer from '../markdown/MarkdownRenderer';

export default function AgentTextBlock({ content }) {
  return (
    <div className="pl-4 border-l-2 border-gray-300 dark:border-gray-600 py-1 my-2">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}
