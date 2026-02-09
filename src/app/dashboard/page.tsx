'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { workflowApi, folderApi, userApi } from '@/lib/api-client';
import { BsDiscord } from 'react-icons/bs';
import { PiUsers } from 'react-icons/pi';
import {
  LogOut,
  File,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import modular dashboard components
import {
  SidebarNavItem,
  ShowcaseCard,
  FileCard,
  FolderCard,
  MoveDialog,
  CreateFolderDialog,
  SHOWCASE_ITEMS,
  formatTimeAgo,
} from '@/components/dashboard';
import { PageLoader } from '@/components/ui/page-loader';

// Types from API (api-types)
import type { WorkflowListItem, FolderListItem } from '@/lib/api-types';

type Workflow = WorkflowListItem;
type Folder = FolderListItem;

/**
 * DashboardPage Component
 *
 * Uses Clerk for authentication and typed REST API + React Query for data fetching.
 */
export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  // Current folder navigation state
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = React.useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My files' }]);

  // Dialog states
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [moveDialogOpen, setMoveDialogOpen] = React.useState(false);
  const [workflowToMove, setWorkflowToMove] = React.useState<Workflow | null>(null);
  const [selectedMoveTarget, setSelectedMoveTarget] = React.useState<string | null>(null);

  // Search and view state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showcaseTab, setShowcaseTab] = React.useState<'workflows' | 'tutorials'>('workflows');
  const [filesView, setFilesView] = React.useState<'grid' | 'list'>('grid');
  const [isCreating, setIsCreating] = React.useState(false);

  // Showcase scroll
  const showcaseScrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollShowcaseLeft, setCanScrollShowcaseLeft] = React.useState(false);
  const [canScrollShowcaseRight, setCanScrollShowcaseRight] = React.useState(false);

  // API queries (React Query)
  const workflowsQuery = useQuery({
    queryKey: ['workflows', currentFolderId],
    queryFn: () => workflowApi.list({ folderId: currentFolderId }),
    enabled: !!isSignedIn,
  });
  const foldersQuery = useQuery({
    queryKey: ['folders', currentFolderId],
    queryFn: () => folderApi.list({ parentId: currentFolderId }),
    enabled: !!isSignedIn,
  });
  const allFoldersQuery = useQuery({
    queryKey: ['folders', null],
    queryFn: () => folderApi.list({ parentId: null }),
    enabled: moveDialogOpen && !!isSignedIn,
  });

  const { data: creditsData } = useQuery({
    queryKey: ['user', 'credits'],
    queryFn: () => userApi.getCredits(),
    enabled: !!isSignedIn,
  });
  const totalCredit = creditsData?.totalCredit ?? 100;

  const invalidateLists = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
  }, [queryClient]);

  const createWorkflowMutation = useMutation({
    mutationFn: (body: { name?: string; folderId?: string | null }) =>
      workflowApi.create(body),
    onSuccess: (data) => {
      router.push(`/dashboard/workflow/${data.workflow.id}`);
    },
  });
  const updateWorkflowMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; folderId?: string | null }) =>
      workflowApi.update(id, body),
    onSuccess: invalidateLists,
  });
  const deleteWorkflowMutation = useMutation({
    mutationFn: (id: string) => workflowApi.delete(id),
    onSuccess: invalidateLists,
  });
  const createFolderMutation = useMutation({
    mutationFn: (body: { name: string; parentId?: string | null }) =>
      folderApi.create(body),
    onSuccess: () => {
      setCreateFolderDialogOpen(false);
      setNewFolderName('');
      invalidateLists();
    },
  });
  const updateFolderMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string }) =>
      folderApi.update(id, body),
    onSuccess: invalidateLists,
  });
  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => folderApi.delete(id),
    onSuccess: invalidateLists,
  });

  // Derived data
  const workflows: Workflow[] = workflowsQuery.data?.workflows ?? [];
  const folders: Folder[] = foldersQuery.data?.folders ?? [];
  const allFolders: Folder[] = allFoldersQuery.data?.folders ?? [];

  // Filtered data
  const filteredFolders = React.useMemo(() => {
    if (!searchQuery.trim()) return folders;
    const query = searchQuery.toLowerCase();
    return folders.filter(folder => folder.name.toLowerCase().includes(query));
  }, [folders, searchQuery]);

  const filteredWorkflows = React.useMemo(() => {
    if (!searchQuery.trim()) return workflows;
    const query = searchQuery.toLowerCase();
    return workflows.filter(workflow => workflow.name.toLowerCase().includes(query));
  }, [workflows, searchQuery]);

  // Redirect to signin if not authenticated
  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/signin');
    }
  }, [isLoaded, isSignedIn, router]);

  // Handlers
  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  const handleCreateNewFile = React.useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      await createWorkflowMutation.mutateAsync({ name: 'untitled', folderId: currentFolderId });
    } catch (error) {
      console.error('Failed to create workflow:', error);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, createWorkflowMutation, currentFolderId]);

  const handleRenameWorkflow = React.useCallback(async (id: string, newName: string) => {
    try {
      await updateWorkflowMutation.mutateAsync({ id, name: newName });
    } catch (error) {
      console.error('Failed to rename workflow:', error);
    }
  }, [updateWorkflowMutation]);

  const handleDeleteWorkflow = React.useCallback(async (id: string) => {
    try {
      await deleteWorkflowMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  }, [deleteWorkflowMutation]);

  const handleDuplicateWorkflow = React.useCallback(async (id: string) => {
    try {
      const workflow = workflows.find(w => w.id === id);
      if (!workflow) return;

      await createWorkflowMutation.mutateAsync({ name: `${workflow.name} (copy)`, folderId: currentFolderId });
      invalidateLists();
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
    }
  }, [workflows, currentFolderId, createWorkflowMutation, invalidateLists]);

  const handleNavigateToFolder = React.useCallback(async (folderId: string | null, folderName?: string) => {
    setCurrentFolderId(folderId);

    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: 'My files' }]);
    } else if (folderName) {
      const existingIndex = breadcrumbs.findIndex(b => b.id === folderId);
      if (existingIndex >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
      } else {
        setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
      }
    }
  }, [breadcrumbs]);

  const handleCreateFolder = React.useCallback(async () => {
    if (!newFolderName.trim()) return;

    try {
      await createFolderMutation.mutateAsync({ name: newFolderName.trim(), parentId: currentFolderId });
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  }, [newFolderName, currentFolderId, createFolderMutation]);

  const handleRenameFolder = React.useCallback(async (id: string, newName: string) => {
    try {
      await updateFolderMutation.mutateAsync({ id, name: newName });
      setBreadcrumbs(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b));
    } catch (error) {
      console.error('Failed to rename folder:', error);
    }
  }, [updateFolderMutation]);

  const handleDeleteFolder = React.useCallback(async (id: string) => {
    try {
      await deleteFolderMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  }, [deleteFolderMutation]);

  const handleOpenFolder = React.useCallback((folder: Folder) => {
    handleNavigateToFolder(folder.id, folder.name);
  }, [handleNavigateToFolder]);

  const handleMoveFolder = React.useCallback((folder: Folder) => {
    console.log('Move folder:', folder);
  }, []);

  const openMoveDialog = React.useCallback((workflow: Workflow) => {
    setWorkflowToMove(workflow);
    setSelectedMoveTarget(workflow.folderId || null);
    setMoveDialogOpen(true);
  }, []);

  const handleMoveWorkflow = React.useCallback(async () => {
    if (!workflowToMove) return;

    try {
      await updateWorkflowMutation.mutateAsync({ id: workflowToMove.id, folderId: selectedMoveTarget });
      setMoveDialogOpen(false);
      setWorkflowToMove(null);
    } catch (error) {
      console.error('Failed to move workflow:', error);
    }
  }, [workflowToMove, selectedMoveTarget, updateWorkflowMutation]);

  // Showcase scroll handlers
  const checkShowcaseScroll = React.useCallback(() => {
    const el = showcaseScrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollShowcaseLeft(scrollLeft > 0);
    setCanScrollShowcaseRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  const scrollShowcaseBy = (direction: -1 | 1) => {
    const el = showcaseScrollerRef.current;
    if (!el) return;
    const delta = direction * 620;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  React.useEffect(() => {
    checkShowcaseScroll();
    window.addEventListener('resize', checkShowcaseScroll);
    return () => window.removeEventListener('resize', checkShowcaseScroll);
  }, [checkShowcaseScroll]);

  // Loading state
  if (!isLoaded || (isSignedIn && (workflowsQuery.isPending || foldersQuery.isPending))) {
    return <PageLoader size="sm" />;
  }

  // Not signed in
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="dark h-screen overflow-x-hidden bg-[#0f0f0f] text-white flex flex-col">
      <div className="grid flex-1 min-h-0 w-full grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar - no scroll, fixed height */}
        <aside className="flex flex-col border-b border-white/10 bg-[#0d0d0d] px-3 py-4 md:border-b-0 md:border-r md:border-white/10 md:h-full overflow-hidden">
          <nav aria-label="dashboard navigation" className="flex h-full min-h-0 flex-col">
            <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
              {/* User dropdown: short name + popup with credits, plan, settings, sign out */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#262626]">
                      {user?.imageUrl ? (
                        <img alt={user.fullName || 'User'} src={user.imageUrl} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-purple-600 text-white text-sm font-medium">
                          {user?.firstName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <span className="min-w-0 truncate text-[13px] font-medium text-white max-w-[140px]">
                      {user?.fullName
                        ? user.fullName.length > 16
                          ? user.fullName.slice(0, 16) + '…'
                          : user.fullName
                        : 'Loading...'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-64 rounded-lg border-white/10 bg-[#1a1a1a] p-0 text-white"
                >
                  <div className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#262626]">
                        {user?.imageUrl ? (
                          <img alt="" src={user.imageUrl} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-purple-600 text-white text-sm font-medium">
                            {user?.firstName?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <span className="truncate text-sm font-medium text-white">{user?.fullName || 'User'}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/70">Credits</span>
                        <span className="flex items-center gap-1 font-medium text-white">
                          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                          {totalCredit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/70">Plan</span>
                        <span className="text-white">Free</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="focus:bg-white/10 focus:text-white cursor-pointer"
                    onSelect={() => router.push('/dashboard')}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="focus:bg-white/10 focus:text-white cursor-pointer"
                    variant="destructive"
                    onSelect={() => handleLogout()}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Create button */}
              <Button
                type="button"
                onClick={handleCreateNewFile}
                disabled={isCreating}
                className="h-11 w-full justify-start rounded-md bg-[#faffc7] px-4 text-[14px] font-medium text-black hover:bg-[#f4f8cd]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New File
              </Button>

              {/* Navigation items */}
              <div className="pt-1">
                <div className="flex flex-col gap-1">
                  <div className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                    'bg-[#1e1e1e] text-white'
                  )}>
                    <span className="grid h-8 w-8 place-items-center text-white/80">
                      <img src="https://app.weavy.ai/icons/files.svg" alt="files" className="h-5 w-5 invert" />
                    </span>
                    <span className="text-[14px] font-medium text-white">My Files</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="ml-auto p-1 rounded hover:bg-white/10 transition-colors text-white">
                          <Plus className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1 bg-[#262626] border-white/10 text-white" align="start">
                        <button
                          type="button"
                          onClick={handleCreateNewFile}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10 text-white"
                        >
                          <File className="h-4 w-4" />
                          New File
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewFolderName('');
                            setCreateFolderDialogOpen(true);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10 text-white"
                        >
                          <FolderPlus className="h-4 w-4" />
                          New Folder
                        </button>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* <SidebarNavItem disabled label="Shared with me" icon={<PiUsers className="h-5 w-5" />} /> */}
                  {/* <SidebarNavItem
                    label="Apps"
                    icon={<img src="https://app.weavy.ai/icons/apps.svg" alt="apps" className="h-5 w-5 invert" />}
                  /> */}
                </div>
              </div>
            </div>

            {/* Bottom actions - always at bottom of sidebar, no scroll */}
            <div className="shrink-0 mt-auto border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-white/80 hover:bg-white/10"
              >
                <span className="grid h-8 w-8 place-items-center">
                  <LogOut className="h-5 w-5" />
                </span>
                <span className="text-[14px] font-medium">Logout</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-white/80 hover:bg-white/10 hover:text-white"
              >
                <span className="grid h-8 w-8 place-items-center">
                  <BsDiscord className="h-5 w-5" />
                </span>
                <span className="text-[14px] font-medium">Discord</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main content - only this area scrolls */}
        <div className="min-w-0 min-h-0 overflow-y-auto bg-[#141414] px-4 py-7 sm:px-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-[14px] font-medium text-white">
              {user?.fullName ? `${user.fullName}'s Workspace` : 'Loading...'}
            </span>
            <Button
              type="button"
              onClick={handleCreateNewFile}
              disabled={isCreating}
              className="h-10 rounded-md bg-[#faffc7] px-4 text-[14px] font-medium text-black hover:bg-[#f4f8cd]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New File
            </Button>
          </header>

          <main className="pt-6">
            {/* Showcase section */}
            <section className="rounded-md border border-white/10 bg-[#1a1a1a] p-5">
              <div className="flex items-center justify-between">
                <ToggleGroup
                  type="single"
                  value={showcaseTab}
                  onValueChange={(v) => {
                    if (v === 'workflows' || v === 'tutorials') setShowcaseTab(v);
                  }}
                  className="rounded-sm gap-1"
                >
                  <ToggleGroupItem value="workflows" className="h-8 min-w-[160px] rounded-md px-6 text-[14px] font-medium text-white data-[state=on]:bg-white/20 data-[state=on]:text-white data-[state=off]:text-white/70">
                    Workflow library
                  </ToggleGroupItem>
                  <ToggleGroupItem value="tutorials" className="h-8 min-w-[100px] rounded-md px-6 text-[14px] font-medium text-white data-[state=on]:bg-white/20 data-[state=on]:text-white data-[state=off]:text-white/70">
                    Tutorials
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="group/showcase relative mt-4">
                <div
                  ref={showcaseScrollerRef}
                  onScroll={checkShowcaseScroll}
                  className="no-scrollbar flex min-w-0 gap-4 overflow-x-auto pb-1"
                >
                  {SHOWCASE_ITEMS.map((item) => (
                    <ShowcaseCard key={item.title} item={item} />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => scrollShowcaseBy(-1)}
                  disabled={!canScrollShowcaseLeft}
                  className="absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-sm bg-black/40 text-white opacity-0 transition-opacity hover:bg-black/60 disabled:opacity-0 group-hover/showcase:opacity-100"
                  aria-label="scroll left"
                >
                  <img src="/icons/arrow.svg" alt="arrow-left" className="h-4 w-4 rotate-90" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => scrollShowcaseBy(1)}
                  disabled={!canScrollShowcaseRight}
                  className="absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-sm bg-black/40 text-white opacity-0 transition-opacity hover:bg-black/60 disabled:opacity-0 group-hover/showcase:opacity-100"
                  aria-label="scroll right"
                >
                  <img src="/icons/arrow.svg" alt="arrow-right" className="h-4 w-4 -rotate-90" />
                </Button>
              </div>
            </section>

            {/* Files section */}
            <section className="pt-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[16px] font-medium text-white">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id ?? 'root'}>
                      {index > 0 && <ChevronRight className="h-4 w-4 text-white/60" />}
                      <button
                        type="button"
                        onClick={() => handleNavigateToFolder(crumb.id, crumb.name)}
                        className={cn(
                          "hover:text-white/90 transition-colors",
                          index === breadcrumbs.length - 1 ? "text-white font-semibold" : "text-white/70"
                        )}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Search and view toggle */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-[260px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                    <Input
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 rounded-md border-white/20 bg-[#1a1a1a] pl-10 text-[14px] text-white placeholder:text-white/50"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFilesView('list')}
                    aria-pressed={filesView === 'list'}
                    className={cn(
                      'h-9 w-9 rounded-md hover:bg-white/10 text-white',
                      filesView === 'list' ? 'bg-white/10' : 'bg-white/5'
                    )}
                    aria-label="list view"
                  >
                    <img src="/icons/list.svg" alt="list" className="h-5 w-5 invert" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFilesView('grid')}
                    aria-pressed={filesView === 'grid'}
                    className={cn(
                      'h-9 w-9 rounded-md hover:bg-white/10 text-white',
                      filesView === 'grid' ? 'bg-white/10' : 'bg-white/5'
                    )}
                    aria-label="grid view"
                  >
                    <img src="/icons/squares.svg" alt="squares" className="h-5 w-5 invert" />
                  </Button>
                </div>
              </div>

              {/* Grid view */}
              {filesView === 'grid' ? (
                <div className="mt-6">
                  {filteredFolders.length === 0 && filteredWorkflows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="mb-4 rounded-lg border border-white/10 bg-[#1a1a1a] p-4">
                        <img src="https://app.weavy.ai/icons/folder.svg" alt="folder" className="h-12 w-12 opacity-60 invert" />
                      </div>
                      <h3 className="text-lg font-medium text-white">This folder is empty</h3>
                      <p className="mt-1 text-sm text-white/60">Create new files or move files here from other folders</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredFolders.map((folder) => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          onOpen={handleOpenFolder}
                          onRename={handleRenameFolder}
                          onDelete={handleDeleteFolder}
                          onMove={handleMoveFolder}
                        />
                      ))}
                      {filteredWorkflows.map((workflow) => (
                        <FileCard
                          key={workflow.id}
                          workflow={workflow}
                          onRename={handleRenameWorkflow}
                          onDelete={handleDeleteWorkflow}
                          onDuplicate={handleDuplicateWorkflow}
                          onMove={openMoveDialog}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* List view */
                <div className="mt-6">
                  {filteredFolders.length === 0 && filteredWorkflows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="mb-4 rounded-lg border border-white/10 bg-[#1a1a1a] p-4">
                        <img src="https://app.weavy.ai/icons/folder.svg" alt="folder" className="h-12 w-12 opacity-60 invert" />
                      </div>
                      <h3 className="text-lg font-medium text-white">This folder is empty</h3>
                      <p className="mt-1 text-sm text-white/60">Create new files or move files here from other folders</p>
                    </div>
                  ) : (
                    <Table className="border-separate border-spacing-y-3">
                        <TableHeader className="[&_tr]:border-0">
                        <TableRow className="border-0">
                          <TableHead className="text-white/70 px-0">Name</TableHead>
                          <TableHead className="text-white/70 text-center">Files</TableHead>
                          <TableHead className="text-white/70 text-center">Last modified</TableHead>
                          <TableHead className="text-white/70 text-center">Created at</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Folder rows */}
                        {filteredFolders.map((folder) => (
                          <ContextMenu key={folder.id}>
                            <ContextMenuTrigger asChild>
                              <TableRow
                                className="group border-0 hover:bg-transparent cursor-pointer"
                                onClick={() => handleNavigateToFolder(folder.id, folder.name)}
                              >
                                <TableCell className="rounded-l-md py-5 pl-4 pr-4 group-hover:bg-white/5 text-white">
                                  <div className="flex items-center gap-6">
                                    <div className="flex h-[74px] w-[120px] items-center justify-center rounded-md bg-white/10">
                                      <img src="https://app.weavy.ai/icons/folder.svg" alt="folder" className="h-10 w-10 opacity-80 invert" />
                                    </div>
                                    <span className="text-[14px] font-medium text-white">{folder.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-white/80 group-hover:bg-white/5">{folder.fileCount}</TableCell>
                                <TableCell className="text-center text-white/80 group-hover:bg-white/5">{formatTimeAgo(folder.updatedAt)}</TableCell>
                                <TableCell className="rounded-r-md text-center text-white/80 group-hover:bg-white/5">{formatTimeAgo(folder.createdAt)}</TableCell>
                              </TableRow>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-48 bg-[#262626] border-white/10 text-white">
                              <ContextMenuItem onClick={() => handleNavigateToFolder(folder.id, folder.name)} className="text-white focus:bg-white/10 focus:text-white">Open</ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => handleDeleteFolder(folder.id)} className="text-red-400 focus:text-red-400 focus:bg-white/10">Delete</ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}

                        {/* Workflow rows */}
                        {filteredWorkflows.map((workflow) => (
                          <ContextMenu key={workflow.id}>
                            <ContextMenuTrigger asChild>
                              <TableRow
                                className="group border-0 hover:bg-transparent cursor-pointer"
                                onClick={() => router.push(`/dashboard/workflow/${workflow.id}`)}
                              >
                                <TableCell className="rounded-l-md py-5 pl-4 pr-4 group-hover:bg-white/5 text-white">
                                  <div className="flex items-center gap-6">
                                    <div className="h-[74px] w-[120px] rounded-md bg-white/10 overflow-hidden">
                                      <img
                                        src={workflow.thumbnail || 'https://app.weavy.ai/workflow-default-cover.png'}
                                        alt="workflow"
                                        className="h-full w-full object-cover invert"
                                      />
                                    </div>
                                    <span className="text-[14px] font-medium text-white">{workflow.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-white/80 group-hover:bg-white/5">-</TableCell>
                                <TableCell className="text-center text-white/80 group-hover:bg-white/5">{formatTimeAgo(workflow.updatedAt)}</TableCell>
                                <TableCell className="rounded-r-md text-center text-white/80 group-hover:bg-white/5">{formatTimeAgo(workflow.createdAt)}</TableCell>
                              </TableRow>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-48 bg-[#262626] border-white/10 text-white">
                              <ContextMenuItem onClick={() => router.push(`/dashboard/workflow/${workflow.id}`)} className="text-white focus:bg-white/10 focus:text-white">Open</ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => handleDeleteWorkflow(workflow.id)} className="text-red-400 focus:text-red-400 focus:bg-white/10">Delete</ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      {/* Dialogs */}
      <MoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        workflow={workflowToMove}
        folders={allFolders}
        selectedTarget={selectedMoveTarget}
        onSelectTarget={setSelectedMoveTarget}
        onMove={handleMoveWorkflow}
      />

      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}
