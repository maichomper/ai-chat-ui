import { useState } from 'react';

interface ToolFeedback {
  type: 'tool_status';
  action: 'start' | 'end' | 'call' | 'result';
  message: string;
  tool: string;
  args?: Record<string, any> | null;
  output?: any;
}

export function ToolFeedbackDisplay({ feedback }: { feedback: ToolFeedback[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedArgs, setExpandedArgs] = useState<number[]>([]);

  if (feedback.length === 0) return null;

  const toggleArgs = (index: number) => {
    setExpandedArgs(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="my-2 mx-4">
      <div 
        className={`
          transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
          overflow-hidden
          bg-gray-50 rounded-lg border border-gray-200
        `}
      >
        <div className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">System</span>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isOpen ? '▼' : '▶'}
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {feedback.map((item, index) => (
              <div 
                key={index}
                className="text-sm text-gray-600"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <span className="font-medium">{item.message}</span>
                    {item.tool !== 'unknown' && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                        {item.tool}
                      </span>
                    )}
                    {item.args && (
                      <button
                        onClick={() => toggleArgs(index)}
                        className="ml-2 text-xs text-blue-500 hover:text-blue-600"
                      >
                        {expandedArgs.includes(index) ? 'Hide params' : 'Show params'}
                      </button>
                    )}
                  </div>
                </div>
                {item.args && expandedArgs.includes(index) && (
                  <div className="mt-2 ml-4 p-2 bg-gray-100 rounded text-xs font-mono whitespace-pre overflow-x-auto">
                    {JSON.stringify(item.args, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 