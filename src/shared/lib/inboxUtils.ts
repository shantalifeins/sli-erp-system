export function deduplicateTasks(tasks: any[]) {
  const seen = new Set();
  const deduplicatedTasks = [];
  
  for (const task of tasks) {
    if (task.referenceType && task.referenceId) {
      const key = `${task.referenceType}-${task.referenceId}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicatedTasks.push(task);
      }
    } else {
      deduplicatedTasks.push(task);
    }
  }
  
  return deduplicatedTasks;
}

export function enrichInboxTasks(tasks: any[], prs: any[], userRegApprovals: any[], profileChangeApprovals: any[]) {
  return tasks.map((task: any) => {
    let prStatus = null;
    let prNumber = null;
    let isFinalStep = false;
    let requestedChanges = null;

    if (task.referenceType === 'PR') {
      const pr = prs.find((p: any) => p.id === task.referenceId);
      if (pr) {
        prStatus = pr.status;
        prNumber = pr.prNumber;
      }
    }

    if (task.referenceType === 'User Registration') {
      // Find the specific step approval
      const approval = userRegApprovals.find((a: any) => a.documentId === task.referenceId && a.assignedRole === task.assignedToRole);
      if (approval) {
        // Find if this is the last step
        const allSteps = userRegApprovals.filter((a: any) => a.documentId === task.referenceId);
        const maxStep = Math.max(...allSteps.map((a: any) => a.stepNumber));
        if (approval.stepNumber === maxStep) {
          isFinalStep = true;
        }
      }
    }

    if (task.referenceType === 'Profile Data Change Request') {
      const approval = profileChangeApprovals.find((a: any) => a.documentId === task.referenceId && a.assignedRole === task.assignedToRole);
      if (approval) {
        const allSteps = profileChangeApprovals.filter((a: any) => a.documentId === task.referenceId);
        const maxStep = Math.max(...allSteps.map((a: any) => a.stepNumber));
        if (approval.stepNumber === maxStep) {
          isFinalStep = true;
        }
      }
      
      try {
        if (task.details) {
          const parsed = typeof task.details === 'string' ? JSON.parse(task.details) : task.details;
          requestedChanges = parsed.requestedChanges;
        }
      } catch (e) {
        // ignore
      }
    }

    return {
      ...task,
      prStatus,
      prNumber,
      isFinalStep,
      requestedChanges
    };
  });
}
