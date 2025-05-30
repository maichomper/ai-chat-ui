'use client';

import { Select } from '@/components/ui/select';

export type VisibilityType = 'public' | 'private';

interface VisibilitySelectorProps {
  visibility: VisibilityType;
  onChange: (visibility: VisibilityType) => void;
}

export function VisibilitySelector({ visibility, onChange }: VisibilitySelectorProps) {
  return (
    <Select
      value={visibility}
      onValueChange={(value) => onChange(value as VisibilityType)}
    >
      <option value="private">Private</option>
      <option value="public">Public</option>
    </Select>
  );
} 