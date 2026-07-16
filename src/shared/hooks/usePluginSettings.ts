import { useAuth } from '@/src/shared/components/AuthProvider';

/**
 * Custom hook to retrieve company-specific settings for a given plugin.
 * 
 * @param pluginSlug - The unique identifier of the plugin (e.g. 'procurement', 'inventory')
 * @returns The parsed JSON settings object for the plugin, or an empty object if none exist/active.
 */
export function usePluginSettings(pluginSlug: string) {
  const { activePlugins } = useAuth();
  
  // Find the plugin data which was fetched during AuthProvider initialization
  const plugin = activePlugins.find(p => p.slug === pluginSlug);

  // If the plugin is not found or has no settings, return an empty object to avoid null reference errors
  if (!plugin || !plugin.settings) {
    return {};
  }

  return plugin.settings;
}
