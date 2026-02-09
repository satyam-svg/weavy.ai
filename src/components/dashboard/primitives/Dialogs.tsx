'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Folder as FolderIcon } from 'lucide-react';
import type { MoveDialogProps, CreateFolderDialogProps } from '../types';
import { cn } from '@/lib/utils';

/*
 * MoveDialog Component
 * 
 * Dialog for moving a workflow to a different folder
 */
export function MoveDialog({
  open,
  onOpenChange,
  workflow,
  folders,
  selectedTarget,
  onSelectTarget,
  onMove,
}: MoveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-[#262626] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Move workflow</DialogTitle>
          <DialogDescription className="text-white/70">
            Select a destination folder for "{workflow?.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          {/* Root folder option */}
          <button
            type="button"
            onClick={() => onSelectTarget(null)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-white',
              selectedTarget === null
                ? 'bg-purple-500/20 border border-purple-500'
                : 'hover:bg-white/10 border border-transparent'
            )}
          >
            <FolderIcon className="h-5 w-5 text-white/60" />
            <span className="text-sm">My files (root)</span>
          </button>

          {/* Folder options */}
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelectTarget(folder.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-white',
                selectedTarget === folder.id
                  ? 'bg-purple-500/20 border border-purple-500'
                  : 'hover:bg-white/10 border border-transparent'
              )}
            >
              <FolderIcon className="h-5 w-5 text-white/60" />
              <span className="text-sm">{folder.name}</span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/20 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button onClick={onMove} className="bg-[#faffc7] text-black hover:bg-[#f4f8cd]">
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * CreateFolderDialog Component
 * 
 * Dialog for creating a new folder
 */
export function CreateFolderDialog({
  open,
  onOpenChange,
  folderName,
  onFolderNameChange,
  onCreate,
}: CreateFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-[#262626] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Create new folder</DialogTitle>
          <DialogDescription className="text-white/70">
            Enter a name for your new folder.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            placeholder="Folder name"
            className="w-full bg-[#1a1a1a] border-white/20 text-white placeholder:text-white/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCreate();
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/20 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button onClick={onCreate} className="bg-[#faffc7] text-black hover:bg-[#f4f8cd]">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
