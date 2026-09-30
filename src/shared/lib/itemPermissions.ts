export const canManageItem = (item: any, userItemType: string) => {
  if (!userItemType) return false;
  if (userItemType === 'Both') return true;
  // General items (neither Admin nor IT) are accessible by any warehouse manager
  if (!item.isAdminItem && !item.isItItem) return true;
  if (userItemType === 'IT' && item.isItItem) return true;
  if (userItemType === 'Admin' && item.isAdminItem) return true;
  return false;
};
