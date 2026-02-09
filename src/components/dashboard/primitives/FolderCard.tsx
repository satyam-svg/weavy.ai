'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FolderCardProps } from '../types';

/**
 * FolderCard Component
 * 
 * A card displaying a folder with context menu actions
 */
export function FolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
  onMove,
}: FolderCardProps) {
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState(folder.name);

  const handleOpen = () => {
    onOpen(folder);
  };

  const handleOpenNewTab = () => {
    window.open(`/dashboard?folderId=${folder.id}`, '_blank');
  };

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      onRename(folder.id, newName.trim());
    }
    setRenameDialogOpen(false);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onClick={handleOpen}
            className="group space-y-2 text-left"
          >
            <div className="flex h-[220px] w-full items-center justify-center rounded-md border border-white/10 bg-[#303030] shadow-xs transition-colors hover:border-white/20">
              <img
                src="https://app.weavy.ai/icons/folder.svg"
                alt="folder"
                className="h-16 w-16 opacity-80 invert"
              />
            </div>
            <div>
              <div className="text-[16px] font-medium text-white">{folder.name}</div>
              <div className="text-[14px] text-white/60">{folder.fileCount} Files</div>
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48 bg-[#262626] border-white/10 text-white">
          <ContextMenuItem onClick={handleOpen} className="cursor-pointer text-white focus:bg-white/10 focus:text-white">
            Open
          </ContextMenuItem>
          <ContextMenuItem onClick={handleOpenNewTab} className="cursor-pointer text-white focus:bg-white/10 focus:text-white">
            Open in a new tab
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => {
            setNewName(folder.name);
            setRenameDialogOpen(true);
          }} className="cursor-pointer text-white focus:bg-white/10 focus:text-white">
            Rename
          </ContextMenuItem>
          {/* <ContextMenuItem onClick={() => onMove(folder)} className="cursor-pointer">
            Move
          </ContextMenuItem> */}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete(folder.id)}
            className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-white/10"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#262626] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
            <DialogDescription>
              Enter a new name for your folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Folder name"
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} className="bg-[#faffc7] text-black hover:bg-[#f4f8cd]">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
