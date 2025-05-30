'use client';

import { ReactNode } from 'react';
import { UseChatHelpers } from '@ai-sdk/react';

export interface ArtifactToolbarItem {
  description: string;
  icon: ReactNode;
  onClick: ({ appendMessage }: { appendMessage: UseChatHelpers['append'] }) => void;
} 