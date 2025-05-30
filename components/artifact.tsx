'use client';

import { ReactNode } from 'react';
import { ArtifactToolbarItem } from './create-artifact';

export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet';

export interface UIArtifact {
  documentId: string;
  content: string;
  kind: ArtifactKind;
  title: string;
  status: 'streaming' | 'idle';
  isVisible: boolean;
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface ArtifactDefinition {
  kind: ArtifactKind;
  toolbar: ArtifactToolbarItem[];
}

// Default artifact definitions
export const artifactDefinitions: ArtifactDefinition[] = [
  {
    kind: 'text',
    toolbar: [],
  },
  {
    kind: 'code',
    toolbar: [],
  },
  {
    kind: 'image',
    toolbar: [],
  },
  {
    kind: 'sheet',
    toolbar: [],
  },
]; 