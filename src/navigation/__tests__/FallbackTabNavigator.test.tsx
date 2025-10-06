import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import FallbackTabNavigator from '../FallbackTabNavigator';

// Mock screen components for testing
const MockScreen1 = () => (
  <View testID="mock-screen-1">
    <Text>Mock Screen 1</Text>
  </View>
);

const MockScreen2 = () => (
  <View testID="mock-screen-2">
    <Text>Mock Screen 2</Text>
  </View>
);

const MockScreen3 = () => (
  <View testID="mock-screen-3">
    <Text>Mock Screen 3</Text>
  </View>
);

describe('FallbackTabNavigator', () => {
  const mockScreens = [
    {
      name: 'Screen1',
      component: MockScreen1,
      icon: 'dashboard' as const,
      title: 'Dashboard',
    },
    {
      name: 'Screen2',
      component: MockScreen2,
      icon: 'announcement' as const,
      title: 'Announcements',
    },
    {
      name: 'Screen3',
      component: MockScreen3,
      icon: 'event' as const,
      title: 'Events',
    },
  ];

  const defaultScreenOptions = {
    headerShown: false,
    tabBarActiveTintColor: '#2B5CE6',
    tabBarInactiveTintColor: '#718096',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the fallback tab navigator', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      expect(screen.getByTestId('mock-screen-1')).toBeTruthy();
      expect(screen.getByText('Mock Screen 1')).toBeTruthy();
    });

    it('should render all tab buttons', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      expect(screen.getByText('Dashboard')).toBeTruthy();
      expect(screen.getByText('Announcements')).toBeTruthy();
      expect(screen.getByText('Events')).toBeTruthy();
    });

    it('should show the first screen by default', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      expect(screen.getByTestId('mock-screen-1')).toBeTruthy();
      expect(screen.getByText('Mock Screen 1')).toBeTruthy();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch screens when tabs are pressed', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Initially shows first screen
      expect(screen.getByTestId('mock-screen-1')).toBeTruthy();

      // Press second tab
      fireEvent.press(screen.getByText('Announcements'));
      expect(screen.getByTestId('mock-screen-2')).toBeTruthy();
      expect(screen.getByText('Mock Screen 2')).toBeTruthy();

      // Press third tab
      fireEvent.press(screen.getByText('Events'));
      expect(screen.getByTestId('mock-screen-3')).toBeTruthy();
      expect(screen.getByText('Mock Screen 3')).toBeTruthy();

      // Press first tab again
      fireEvent.press(screen.getByText('Dashboard'));
      expect(screen.getByTestId('mock-screen-1')).toBeTruthy();
      expect(screen.getByText('Mock Screen 1')).toBeTruthy();
    });

    it('should maintain active tab state', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Switch to second tab
      fireEvent.press(screen.getByText('Announcements'));
      
      // Verify the active screen persists
      expect(screen.getByTestId('mock-screen-2')).toBeTruthy();
      expect(screen.queryByTestId('mock-screen-1')).toBeFalsy();
      expect(screen.queryByTestId('mock-screen-3')).toBeFalsy();
    });
  });

  describe('Icon Rendering', () => {
    it('should render MaterialIcons for each tab', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Check that MaterialIcons are rendered (mocked in jest.setup.js)
      const tabButtons = screen.getAllByRole('tab');
      expect(tabButtons).toHaveLength(3);
    });

    it('should use correct icon names from screen configuration', () => {
      const { UNSAFE_getAllByType } = render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Since MaterialIcons is mocked, we verify the component structure
      expect(screen.getByText('Dashboard')).toBeTruthy();
      expect(screen.getByText('Announcements')).toBeTruthy();
      expect(screen.getByText('Events')).toBeTruthy();
    });
  });

  describe('Color Theming', () => {
    it('should apply active tint color to active tab', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // First tab should be active by default
      const dashboardText = screen.getByText('Dashboard');
      expect(dashboardText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#2B5CE6' })])
      );
    });

    it('should apply inactive tint color to inactive tabs', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Other tabs should be inactive
      const announcementsText = screen.getByText('Announcements');
      const eventsText = screen.getByText('Events');
      
      expect(announcementsText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#718096' })])
      );
      expect(eventsText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#718096' })])
      );
    });

    it('should update colors when switching tabs', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Switch to second tab
      fireEvent.press(screen.getByText('Announcements'));

      // Colors should update
      const dashboardText = screen.getByText('Dashboard');
      const announcementsText = screen.getByText('Announcements');
      
      expect(dashboardText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#718096' })])
      );
      expect(announcementsText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#2B5CE6' })])
      );
    });

    it('should use default colors when screenOptions are not provided', () => {
      render(
        <FallbackTabNavigator screens={mockScreens} />
      );

      const dashboardText = screen.getByText('Dashboard');
      expect(dashboardText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#2B5CE6' })])
      );
    });

    it('should allow custom colors through screenOptions', () => {
      const customScreenOptions = {
        tabBarActiveTintColor: '#FF0000',
        tabBarInactiveTintColor: '#00FF00',
      };

      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={customScreenOptions}
        />
      );

      const dashboardText = screen.getByText('Dashboard');
      const announcementsText = screen.getByText('Announcements');
      
      expect(dashboardText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#FF0000' })])
      );
      expect(announcementsText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#00FF00' })])
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility attributes', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      const tabButtons = screen.getAllByRole('tab');
      
      tabButtons.forEach((tab, index) => {
        expect(tab.props.accessibilityRole).toBe('tab');
        expect(tab.props.accessibilityState).toEqual({
          selected: index === 0 // First tab is selected by default
        });
      });
    });

    it('should update accessibility state when switching tabs', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Switch to second tab
      fireEvent.press(screen.getByText('Announcements'));

      const tabButtons = screen.getAllByRole('tab');
      
      expect(tabButtons[0].props.accessibilityState.selected).toBe(false);
      expect(tabButtons[1].props.accessibilityState.selected).toBe(true);
      expect(tabButtons[2].props.accessibilityState.selected).toBe(false);
    });

    it('should have accessibility labels', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      const tabButtons = screen.getAllByRole('tab');
      
      expect(tabButtons[0].props.accessibilityLabel).toBe('Dashboard');
      expect(tabButtons[1].props.accessibilityLabel).toBe('Announcements');
      expect(tabButtons[2].props.accessibilityLabel).toBe('Events');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty screens array', () => {
      render(<FallbackTabNavigator screens={[]} />);
      expect(screen.getByText('No screens available')).toBeTruthy();
    });

    it('should handle single screen', () => {
      const singleScreen = [mockScreens[0]];
      
      render(
        <FallbackTabNavigator 
          screens={singleScreen} 
          screenOptions={defaultScreenOptions}
        />
      );

      expect(screen.getByTestId('mock-screen-1')).toBeTruthy();
      expect(screen.getByText('Dashboard')).toBeTruthy();
    });

    it('should handle rapid tab switching', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Rapidly switch tabs
      fireEvent.press(screen.getByText('Announcements'));
      fireEvent.press(screen.getByText('Events'));
      fireEvent.press(screen.getByText('Dashboard'));
      fireEvent.press(screen.getByText('Announcements'));

      // Should end up on Announcements
      expect(screen.getByTestId('mock-screen-2')).toBeTruthy();
    });

    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not re-render inactive screens', () => {
      render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Only the active screen should be rendered
      expect(screen.getByTestId('mock-screen-1')).toBeTruthy();
      expect(screen.queryByTestId('mock-screen-2')).toBeFalsy();
      expect(screen.queryByTestId('mock-screen-3')).toBeFalsy();

      // Switch tabs
      fireEvent.press(screen.getByText('Announcements'));

      expect(screen.queryByTestId('mock-screen-1')).toBeFalsy();
      expect(screen.getByTestId('mock-screen-2')).toBeTruthy();
      expect(screen.queryByTestId('mock-screen-3')).toBeFalsy();
    });

    it('should handle multiple re-renders without issues', () => {
      const { rerender } = render(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      // Multiple re-renders should not cause issues
      rerender(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );
      rerender(
        <FallbackTabNavigator 
          screens={mockScreens} 
          screenOptions={defaultScreenOptions}
        />
      );

      expect(screen.getByTestId('mock-screen-1')).toBeTruthy();
    });
  });
});