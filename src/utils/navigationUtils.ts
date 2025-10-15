import { NavigationProp, CommonActions } from '@react-navigation/native';

/**
 * Utility functions for consistent navigation behavior across the app
 */

/**
 * Safely resets navigation to the auth stack after logout
 * This ensures users cannot navigate back to authenticated screens
 */
export const resetToLanding = (navigation: NavigationProp<any>) => {
  try {
    // Check if navigation is ready and has the route
    const state = navigation.getState();
    if (!state) {
      console.log('Navigation not ready, skipping reset');
      return;
    }
    
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      })
    );
  } catch (error) {
    console.error('Error resetting navigation to auth:', error);
    // Don't try fallback navigation as it might cause more issues
    console.log('Skipping fallback navigation to prevent errors');
  }
};

/**
 * Safely resets navigation to the auth stack
 * Used when authentication is required
 */
export const resetToAuth = (navigation: NavigationProp<any>) => {
  try {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      })
    );
  } catch (error) {
    console.error('Error resetting navigation to auth:', error);
    // Fallback: try to navigate to auth screen
    try {
      navigation.navigate('Auth' as never);
    } catch (fallbackError) {
      console.error('Fallback navigation to auth also failed:', fallbackError);
    }
  }
};

/**
 * Safely navigates back or to a fallback screen
 * Useful for handling navigation when the back stack might be empty
 */
export const safeGoBack = (navigation: NavigationProp<any>, fallbackRoute?: string) => {
  try {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (fallbackRoute) {
      navigation.navigate(fallbackRoute as never);
    }
  } catch (error) {
    console.error('Error in safe go back:', error);
  }
};

/**
 * Checks if a route exists in the navigation state
 * Useful for conditional navigation
 */
export const routeExists = (navigation: NavigationProp<any>, routeName: string): boolean => {
  try {
    const state = navigation.getState();
    return state.routeNames?.includes(routeName) || false;
  } catch (error) {
    console.error('Error checking if route exists:', error);
    return false;
  }
};

/**
 * Gets the current route name safely
 */
export const getCurrentRouteName = (navigation: NavigationProp<any>): string | null => {
  try {
    const state = navigation.getState();
    const route = state.routes[state.index];
    return route?.name || null;
  } catch (error) {
    console.error('Error getting current route name:', error);
    return null;
  }
};

export default {
  resetToLanding,
  resetToAuth,
  safeGoBack,
  routeExists,
  getCurrentRouteName,
};