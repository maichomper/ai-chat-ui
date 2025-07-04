'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolFeedback {
  type: 'tool_status';
  action: 'start' | 'end' | 'call' | 'result';
  message: string;
  tool: string;
  args?: Record<string, any> | null;
  output?: any;
}

interface MessageToolFeedbackProps {
  feedback: ToolFeedback[];
  isActive?: boolean; // Whether the message is currently being processed
}

export function MessageToolFeedback({ feedback, isActive = false }: MessageToolFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  // Auto-open when streaming starts, auto-close when streaming ends
  useEffect(() => {
    if (isActive) {
      // Auto-open when message becomes active and has feedback
      if (feedback && feedback.length > 0) {
        setIsOpen(true);
      }
    } else {
      // Auto-close when message finishes streaming
      setIsOpen(false);
    }
  }, [isActive, feedback]);

  // Don't render if no feedback
  if (!feedback || feedback.length === 0) return null;

  const toggleItem = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const getToolEmoji = (tool: string) => {
    if (tool.toLowerCase().includes('weather')) return '🌤️';
    if (tool.toLowerCase().includes('search')) return '🔍';
    if (tool.toLowerCase().includes('api')) return '🔗';
    if (tool.toLowerCase().includes('file')) return '📁';
    if (tool.toLowerCase().includes('image')) return '🖼️';
    return '🛠️';
  };

  return (
    <div className="mb-3">
      <div className="rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden">
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Disconnect scroll observer temporarily
            const container = document.querySelector('[data-scroll-container]');
            const scrollTop = container?.scrollTop;
            
            // Disable auto-scroll by adding a temporary class
            container?.setAttribute('data-disable-autoscroll', 'true');
            
            setIsOpen(!isOpen);
            
            // Re-enable auto-scroll after animation completes
            setTimeout(() => {
              if (container && typeof scrollTop === 'number') {
                container.scrollTop = scrollTop;
              }
              container?.removeAttribute('data-disable-autoscroll');
            }, 100);
          }}
          className="w-full px-3 py-2 text-left hover:bg-sidebar-accent transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-sidebar-foreground">
              🤖 Agent Tools
            </span>
            {isActive && (
              <span className="text-xs text-sidebar-foreground/80 animate-pulse">
                Processing...
              </span>
            )}
          </div>
          <span className="text-sidebar-foreground/80 text-xs">
            {isOpen ? '▼' : '▶'}
          </span>
        </button>
        
        {isOpen && (
          <div className="px-3 pb-3">
            
              <div className="space-y-2">
                {feedback.map((item, index) => (
                  <div 
                    key={index}
                    className="text-xs border-l-2 border-sidebar-foreground/30 pl-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sidebar-foreground">
                            {item.message}
                          </span>
                        </div>
                        
                        {(item.args || item.output) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItem(index);
                            }}
                            className="mt-1 text-[10px] text-sidebar-foreground/80 hover:text-sidebar-foreground underline"
                          >
                            {expandedItems.includes(index) ? '📄 Hide details' : (item.args ? '📋 Show arguments' : '📄 Show output')}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {(item.args || item.output) && expandedItems.includes(index) && (
                      <div className="mt-2 ml-6">
                        <div className="p-2 bg-sidebar-accent rounded text-[10px] font-mono text-sidebar-foreground/90 whitespace-pre-wrap overflow-x-auto border border-sidebar-border">
                          {JSON.stringify(item.args || item.output, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}