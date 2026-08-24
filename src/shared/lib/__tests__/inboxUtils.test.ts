import { describe, it, expect } from 'vitest';
import { deduplicateTasks, enrichInboxTasks } from '../inboxUtils';

describe('inboxUtils - deduplicateTasks', () => {
  it('should remove older duplicate tasks based on referenceType and referenceId', () => {
    const tasks = [
      { id: 1, referenceType: 'PR', referenceId: '100', status: 'Pending' },
      { id: 2, referenceType: 'PR', referenceId: '100', status: 'Draft' }, // Duplicate, should be removed
      { id: 3, referenceType: 'CS', referenceId: '200', status: 'Pending' },
      { id: 4, referenceType: null, referenceId: null, status: 'Pending' },
      { id: 5, referenceType: null, referenceId: null, status: 'Pending' }
    ];

    const result = deduplicateTasks(tasks);
    expect(result.length).toBe(4);
    
    // The first PR task (id: 1) should be kept
    expect(result.find(t => t.id === 1)).toBeDefined();
    // The duplicate PR task (id: 2) should be removed
    expect(result.find(t => t.id === 2)).toBeUndefined();
    // The CS task should be kept
    expect(result.find(t => t.id === 3)).toBeDefined();
    // Tasks without references should both be kept
    expect(result.filter(t => !t.referenceType).length).toBe(2);
  });

  it('should return empty array if no tasks provided', () => {
    expect(deduplicateTasks([])).toEqual([]);
  });
});

describe('inboxUtils - enrichInboxTasks', () => {
  it('should correctly enrich PR tasks with status and number', () => {
    const tasks = [
      { id: 1, referenceType: 'PR', referenceId: 'pr-1' },
      { id: 2, referenceType: 'CS', referenceId: 'cs-1' }
    ];
    const prs = [
      { id: 'pr-1', status: 'Approved', prNumber: 'PR-1001' }
    ];

    const enriched = enrichInboxTasks(tasks, prs, [], []);
    
    expect(enriched[0].prStatus).toBe('Approved');
    expect(enriched[0].prNumber).toBe('PR-1001');
    
    expect(enriched[1].prStatus).toBeNull();
    expect(enriched[1].prNumber).toBeNull();
  });

  it('should correctly determine isFinalStep for User Registration tasks', () => {
    const tasks = [
      { id: 1, referenceType: 'User Registration', referenceId: 'user-1', assignedToRole: 'HR' },
      { id: 2, referenceType: 'User Registration', referenceId: 'user-1', assignedToRole: 'CEO' }
    ];
    
    const userRegApprovals = [
      { documentId: 'user-1', assignedRole: 'HR', stepNumber: 1 },
      { documentId: 'user-1', assignedRole: 'CEO', stepNumber: 2 }
    ];

    const enriched = enrichInboxTasks(tasks, [], userRegApprovals, []);
    
    // HR is step 1 out of 2, so NOT final step
    expect(enriched[0].isFinalStep).toBe(false);
    // CEO is step 2 out of 2, so IS final step
    expect(enriched[1].isFinalStep).toBe(true);
  });

  it('should correctly parse requestedChanges for Profile Data Change Requests', () => {
    const details = JSON.stringify({ requestedChanges: { phone: '1234567890' } });
    const tasks = [
      { id: 1, referenceType: 'Profile Data Change Request', referenceId: 'prof-1', assignedToRole: 'HR', details }
    ];
    
    const profileApprovals = [
      { documentId: 'prof-1', assignedRole: 'HR', stepNumber: 1 }
    ];

    const enriched = enrichInboxTasks(tasks, [], [], profileApprovals);
    
    expect(enriched[0].isFinalStep).toBe(true); // Only 1 step, so it is the final step
    expect(enriched[0].requestedChanges).toEqual({ phone: '1234567890' });
  });
});
