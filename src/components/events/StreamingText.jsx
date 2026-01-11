/**
 * StreamingText Component
 * 
 * Displays text as it streams in with a typing cursor effect.
 */

export default function StreamingText({ text = '' }) {
  if (!text) return null;
  
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] md:max-w-[80%]">
        <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
          <p className="whitespace-pre-wrap break-words text-gray-800">
            {text}
            <span className="inline-block w-2 h-5 bg-gray-400 ml-0.5 animate-pulse" />
          </p>
        </div>
      </div>
    </div>
  );
}
