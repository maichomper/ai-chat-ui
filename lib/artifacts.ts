interface Suggestion {
  id: string;
  documentId: string;
  content: string;
  createdAt: Date;
}

// In-memory storage for suggestions
const suggestions: Suggestion[] = [];

export async function getSuggestionsByDocumentId({ 
  documentId 
}: { 
  documentId: string 
}): Promise<Suggestion[]> {
  return suggestions.filter(suggestion => suggestion.documentId === documentId);
}

export async function saveSuggestion(suggestion: Omit<Suggestion, 'id'>): Promise<Suggestion> {
  const newSuggestion: Suggestion = {
    ...suggestion,
    id: Math.random().toString(36).substring(7),
  };
  suggestions.push(newSuggestion);
  return newSuggestion;
} 