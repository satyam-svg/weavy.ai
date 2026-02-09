'use client';

import { useParams } from 'next/navigation';
import { WorkflowBuilder } from '@/components/workflow/workflow-builder';

export default function WorkflowPage() {
  const params = useParams();
  const workflowId = params.id as string;

  return (
    <div className="dark h-screen w-screen overflow-x-hidden bg-[#0e0e18] text-foreground">
      <WorkflowBuilder workflowId={workflowId} />
    </div>
  );
}
