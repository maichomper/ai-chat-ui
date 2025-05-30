'use client';

import { ArtifactKind } from '@/components/artifact';
import { Button } from '@/components/ui/button';
import { UISuggestion } from '@/lib/editor/suggestions';

interface SuggestionProps {
  suggestion: UISuggestion;
  onApply: () => void;
  artifactKind?: ArtifactKind;
}

export function Suggestion({ suggestion, onApply, artifactKind = 'text' }: SuggestionProps) {
  return (
    <div className="absolute -top-8 left-0 z-50">
      <Button 
        variant="secondary" 
        size="sm"
        onClick={onApply}
      >
        Accept Suggestion
      </Button>
    </div>
  );
} 