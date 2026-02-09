'use client';

import * as React from 'react';
import { Panel } from '@xyflow/react';
import { TbAsterisk } from 'react-icons/tb';
import { Check, Clock, Download, Loader2, Play, Save, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useWorkflowStore } from '@/stores/workflowStore';
import { userApi } from '@/lib/api-client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RightPanelProps {
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
  onRunAll?: () => void;
  onRunSelected?: () => void;
  hasSelectedNodes?: boolean;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
}

/**
 * RightPanel Component
 * 
 * Top-right panel containing:
 * - Credits display
 * - Share button
 * - Save status indicator
 * - Import/Export buttons
 * - Run All / Run Selected buttons
 * - History toggle
 * 
 * When history panel is open, this panel shifts to the left.
 */
export function RightPanel({
  isSaving,
  isDirty,
  onSave,
  onRunAll,
  onRunSelected,
  hasSelectedNodes = false,
  isHistoryOpen,
  onToggleHistory,
}: RightPanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [rechargeOpen, setRechargeOpen] = React.useState(false);

  const { data: creditsData } = useQuery({
    queryKey: ['user', 'credits'],
    queryFn: () => userApi.getCredits(),
    refetchInterval: false,
  });
  const totalCredit = creditsData?.totalCredit ?? 100;
  const hasCredits = totalCredit > 0;

  const exportWorkflow = useWorkflowStore((s) => s.exportWorkflow);
  const importWorkflow = useWorkflowStore((s) => s.importWorkflow);
  const nodes = useWorkflowStore((s) => s.nodes);
  const hasNodes = nodes.length > 0;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await importWorkflow(file);
      if (success) {
        console.log('Workflow imported successfully');
      } else {
        console.error('Failed to import workflow');
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Credits and controls panel */}
      <Panel
        position="top-right"
        className="pointer-events-auto transition-all duration-300"
        style={{
          margin: 24,
          marginRight: isHistoryOpen ? 344 : 24, // 320px history panel + 24px margin
        }}
      >
        <div className="w-70 rounded-lg border border-white/20 bg-[#2a2a2a] backdrop-blur p-3 shadow-xl">
          {/* Top row: Credits + Share */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => !hasCredits && setRechargeOpen(true)}
              className={cn(
                'text-[14px] flex items-center gap-1 font-medium',
                hasCredits ? 'text-white' : 'text-amber-400 hover:text-amber-300'
              )}
            >
              <TbAsterisk className="text-[16px]" />
              <p>{totalCredit} credits</p>
            </button>
            {/* <Button
              size="sm"
              className="h-8 rounded-md bg-[#faffc7] text-black hover:bg-[#f0f5a0] px-4"
            >
              <PiShareLight className="mr-2 h-4 w-4" />
              Share
            </Button> */}
          </div>

          {/* Save status indicator with Save button */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {isSaving ? (
                <span className="flex items-center gap-1 text-white/80">
                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                  Saving...
                </span>
              ) : !isDirty ? (
                <span className="flex items-center gap-1 text-green-400">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              ) : (
                <span className="flex items-center gap-1 text-white/70">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Unsaved
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || !isDirty}
              className={cn(
                'flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors',
                isDirty && !isSaving
                  ? 'bg-purple-500/20 text-white hover:bg-purple-500/30'
                  : 'text-white/40 cursor-not-allowed'
              )}
              title="Ctrl+S"
            >
              <Save className="h-3 w-3" />
              <span>Save</span>
              <span className="text-[10px] text-white/50 ml-1">⌘S</span>
            </button>
          </div>

          {/* Import/Export Buttons */}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleImportClick}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/15 transition-colors"
              title="Import workflow from JSON"
            >
              <Upload className="h-3 w-3 text-white" />
              <span>Import</span>
            </button>
            <button
              type="button"
              onClick={exportWorkflow}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/15 transition-colors"
              title="Export workflow as JSON"
            >
              <Download className="h-3 w-3 text-white" />
              <span>Export</span>
            </button>
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-white/20" />

          {/* Run Controls + History */}
          <div className="flex items-center gap-2">
            {/* Run All */}
            {onRunAll && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Run All"
                    disabled={!hasNodes}
                    onClick={() => {
                      if (!hasCredits) {
                        setRechargeOpen(true);
                        return;
                      }
                      onRunAll?.();
                    }}
                    className={cn(
                      'flex-1 flex h-9 items-center justify-center gap-1.5 rounded-md transition-colors',
                      hasNodes
                        ? hasCredits
                          ? 'bg-black hover:bg-black/90 text-white'
                          : 'bg-amber-900/40 text-amber-400 hover:bg-amber-900/60'
                        : 'bg-black/30 text-white/50 cursor-not-allowed'
                    )}
                  >
                    <Play className="h-4 w-4" />
                    <span className="text-xs font-medium">Run All</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Run entire workflow</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Run Selected */}
            {onRunSelected && hasSelectedNodes && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Run Selected"
                    onClick={() => {
                      if (!hasCredits) {
                        setRechargeOpen(true);
                        return;
                      }
                      onRunSelected?.();
                    }}
                    className={cn(
                      'flex-1 flex h-9 items-center justify-center gap-1.5 rounded-md transition-colors',
                      hasCredits
                        ? 'bg-black/80 hover:bg-black text-white'
                        : 'bg-amber-900/40 text-amber-400 hover:bg-amber-900/60'
                    )}
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Run Selected</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Run selected nodes</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* History Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Workflow History"
                  aria-pressed={isHistoryOpen}
                  onClick={onToggleHistory}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-md transition-colors',
                    isHistoryOpen
                      ? 'bg-purple-600 text-white'
                      : 'text-white hover:bg-white/15'
                  )}
                >
                  <Clock className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{isHistoryOpen ? 'Close History' : 'Workflow History'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </Panel>

      {/* Recharge credits popup when balance is 0 */}
      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent className="bg-[#2a2a2a] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Recharge your credit</DialogTitle>
            <DialogDescription className="text-white/80">
              You have no credits left. Each successful run uses 5 credits. Contact support or upgrade to get more credits.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
