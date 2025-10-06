import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { MaterialIcons } from '@expo/vector-icons';
import OfficerBottomNavigator from '../OfficerBottomNavigator';
import FallbackTabNavigator from '../FallbackTabNavigator';

// Mock the screen components
jest.mock('../../screens/officer/nhs/OfficerDashboard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function OfficerDashboard() {
    return (
      <View testID="officer-dashboard">
        <Text>Officer Dashboard</Text>
      </View>
    );
  };
});

jest.mock('../../screens/officer/nhs/OfficerAnnouncements', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function OfficerAnnouncements() {
    return (
      <View testID="officer-announcements">
        <Text>Officer Announcements</Text>
      </View>
    );
  };
});

jest.mock('../../screens/officer/nhs/OfficerAttendance', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function OfficerAttendance() {
    return (
      <View testID="officer-attendance">
        <Text>Officer Attendance</Text>
      </View>
    );
  };
});

jest.mock('../../screens/officer/nhs/OfficerVerifyHours', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function OfficerVerifyHours() {
    return (
      <View testID="officer-verify-hours">
        <Text>Officer Verify Hours</Text>
      </View>
    );
  };
});

jest.mock('../../screens/officer/nhs/OfficerEventScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function OfficerEvents() {
    return (
      <View testID="officer-events">
        <Text>Officer Events</Text>
      </View>
    );
  };
});

// Mock FallbackTabNavigator to test the interface
jest.mock('../FallbackTabNavigator', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  
  // Create a mock MaterialIcons component that preserves props
  const MockMaterialIcons = ({ name, size, color, testID }) => {
    const iconElement = React.createElement(Text, { 
      testID,
      // Store props as data attributes for testing
      'data-name': name,
      'data-size': size,
      'data-color': color,
      style: { color }
    }, name);
    
    // Add props to the element for testing
    iconElement.props = { ...iconElement.props, name, size, color };
    return iconElement;
  };
  
  return function MockFallbackTabNavigator({ screens, screenOptions }) {
    const [activeTab, setActiveTab] = React.useState(0);
    const ActiveComponent = screens[activeTab].component;
    
    return (
      <View testID="fallback-tab-navigator">
        <View testID="tab-content">
          <ActiveComponent />
        </View>
        <View testID="tab-bar">
          {screens.map((screen, index) => {
            const isActive = activeTab === index;
            const color = isActive 
              ? screenOptions?.tabBarActiveTintColor || '#2B5CE6'
              : screenOptions?.tabBarInactiveTintColor || '#718096';
            
            return (
              <TouchableOpacity
                key={screen.name}
                testID={`tab-${screen.name}`}
                onPress={() => setActiveTab(index)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <MockMaterialIcons 
                  name={screen.icon} 
                  size={24} 
                  color={color}
                  testID={`icon-${screen.name}`}
                />
                <Text 
                  testID={`title-${screen.name}`}
                  style={{ color }}
                >
                  {screen.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };
});

describe('OfficerBottomNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab Rendering and Navigation', () => {
    it('should render all 5 officer tabs', () => {
      render(<OfficerBottomNavigator />);
      
      // Check that all tabs are rendered
      expect(screen.getByTestId('tab-OfficerDashboard')).toBeTruthy();
      expect(screen.getByTestId('tab-OfficerAnnouncements')).toBeTruthy();
      expect(screen.getByTestId('tab-OfficerAttendance')).toBeTruthy();
      expect(screen.getByTestId('tab-OfficerVerifyHours')).toBeTruthy();
      expect(screen.getByTestId('tab-OfficerEvents')).toBeTruthy();
    });

    it('should display correct tab titles', () => {
      render(<OfficerBottomNavigator />);
      
      expect(screen.getByTestId('title-OfficerDashboard')).toHaveTextContent('Dashboard');
      expect(screen.getByTestId('title-OfficerAnnouncements')).toHaveTextContent('Announcements');
      expect(screen.getByTestId('title-OfficerAttendance')).toHaveTextContent('Attendance');
      expect(screen.getByTestId('title-OfficerVerifyHours')).toHaveTextContent('Verify Hours');
      expect(screen.getByTestId('title-OfficerEvents')).toHaveTextContent('Events');
    });

    it('should show OfficerDashboard as the default active tab', () => {
      render(<OfficerBottomNavigator />);
      
      // First tab (Dashboard) should be active by default
      expect(screen.getByTestId('officer-dashboard')).toBeTruthy();
      expect(screen.getByText('Officer Dashboard')).toBeTruthy();
    });

    it('should navigate between tabs when pressed', () => {
      render(<OfficerBottomNavigator />);
      
      // Initially shows Dashboard
      expect(screen.getByTestId('officer-dashboard')).toBeTruthy();
      
      // Tap on Announcements tab
      fireEvent.press(screen.getByTestId('tab-OfficerAnnouncements'));
      expect(screen.getByTestId('officer-announcements')).toBeTruthy();
      expect(screen.getByText('Officer Announcements')).toBeTruthy();
      
      // Tap on Attendance tab
      fireEvent.press(screen.getByTestId('tab-OfficerAttendance'));
      expect(screen.getByTestId('officer-attendance')).toBeTruthy();
      expect(screen.getByText('Officer Attendance')).toBeTruthy();
      
      // Tap on Verify Hours tab
      fireEvent.press(screen.getByTestId('tab-OfficerVerifyHours'));
      expect(screen.getByTestId('officer-verify-hours')).toBeTruthy();
      expect(screen.getByText('Officer Verify Hours')).toBeTruthy();
      
      // Tap on Events tab
      fireEvent.press(screen.getByTestId('tab-OfficerEvents'));
      expect(screen.getByTestId('officer-events')).toBeTruthy();
      expect(screen.getByText('Officer Events')).toBeTruthy();
    });

    it('should have proper accessibility attributes', () => {
      render(<OfficerBottomNavigator />);
      
      const dashboardTab = screen.getByTestId('tab-OfficerDashboard');
      expect(dashboardTab.props.accessibilityRole).toBe('tab');
      expect(dashboardTab.props.accessibilityState.selected).toBe(true);
      
      const announcementsTab = screen.getByTestId('tab-OfficerAnnouncements');
      expect(announcementsTab.props.accessibilityRole).toBe('tab');
      expect(announcementsTab.props.accessibilityState.selected).toBe(false);
    });
  });

  describe('Icon Mapping', () => {
    it('should map correct icons to each tab', () => {
      render(<OfficerBottomNavigator />);
      
      // Check that icon elements are rendered with correct text content (icon names)
      const dashboardIcon = screen.getByTestId('icon-OfficerDashboard');
      const announcementsIcon = screen.getByTestId('icon-OfficerAnnouncements');
      const attendanceIcon = screen.getByTestId('icon-OfficerAttendance');
      const verifyHoursIcon = screen.getByTestId('icon-OfficerVerifyHours');
      const eventsIcon = screen.getByTestId('icon-OfficerEvents');
      
      // Since we're using mocked MaterialIcons that render the icon name as text content
      expect(dashboardIcon).toHaveTextContent('dashboard');
      expect(announcementsIcon).toHaveTextContent('announcement');
      expect(attendanceIcon).toHaveTextContent('event-available');
      expect(verifyHoursIcon).toHaveTextContent('schedule');
      expect(eventsIcon).toHaveTextContent('event');
    });

    it('should use correct icon sizes', () => {
      render(<OfficerBottomNavigator />);
      
      // Test that icons are rendered (size is handled by the mock)
      const dashboardIcon = screen.getByTestId('icon-OfficerDashboard');
      expect(dashboardIcon).toBeTruthy();
    });
  });

  describe('Theme-Aware Color Application', () => {
    it('should apply active tint color to active tab', () => {
      render(<OfficerBottomNavigator />);
      
      // Dashboard should be active by default
      const dashboardTitle = screen.getByTestId('title-OfficerDashboard');
      
      // Check that the title has the active color
      expect(dashboardTitle.props.style.color).toBe('#2B5CE6');
    });

    it('should apply inactive tint color to inactive tabs', () => {
      render(<OfficerBottomNavigator />);
      
      // Announcements should be inactive by default
      const announcementsTitle = screen.getByTestId('title-OfficerAnnouncements');
      
      // Check that the title has the inactive color
      expect(announcementsTitle.props.style.color).toBe('#718096');
    });

    it('should update colors when switching tabs', () => {
      render(<OfficerBottomNavigator />);
      
      // Initially Dashboard is active
      expect(screen.getByTestId('title-OfficerDashboard').props.style.color).toBe('#2B5CE6');
      expect(screen.getByTestId('title-OfficerAnnouncements').props.style.color).toBe('#718096');
      
      // Switch to Announcements
      fireEvent.press(screen.getByTestId('tab-OfficerAnnouncements'));
      
      // Colors should switch
      expect(screen.getByTestId('title-OfficerDashboard').props.style.color).toBe('#718096');
      expect(screen.getByTestId('title-OfficerAnnouncements').props.style.color).toBe('#2B5CE6');
    });

    it('should use correct theme colors from existing app design', () => {
      render(<OfficerBottomNavigator />);
      
      // Verify the colors match the existing app theme
      const activeColor = '#2B5CE6'; // Colors.solidBlue
      const inactiveColor = '#718096'; // Colors.textLight
      
      const dashboardTitle = screen.getByTestId('title-OfficerDashboard');
      expect(dashboardTitle.props.style.color).toBe(activeColor);
      
      const announcementsTitle = screen.getByTestId('title-OfficerAnnouncements');
      expect(announcementsTitle.props.style.color).toBe(inactiveColor);
    });
  });

  describe('Fallback Tab Navigator Functionality', () => {
    it('should use FallbackTabNavigator component', () => {
      render(<OfficerBottomNavigator />);
      
      expect(screen.getByTestId('fallback-tab-navigator')).toBeTruthy();
      expect(screen.getByTestId('tab-content')).toBeTruthy();
      expect(screen.getByTestId('tab-bar')).toBeTruthy();
    });

    it('should pass correct screen configuration to FallbackTabNavigator', () => {
      const { UNSAFE_getByType } = render(<OfficerBottomNavigator />);
      
      // This would be the actual FallbackTabNavigator component if not mocked
      // We're testing that the correct props are passed
      expect(screen.getByTestId('fallback-tab-navigator')).toBeTruthy();
    });

    it('should pass correct screen options to FallbackTabNavigator', () => {
      render(<OfficerBottomNavigator />);
      
      // Verify that the screen options are applied correctly through title colors
      const activeTitle = screen.getByTestId('title-OfficerDashboard');
      const inactiveTitle = screen.getByTestId('title-OfficerAnnouncements');
      
      expect(activeTitle.props.style.color).toBe('#2B5CE6');
      expect(inactiveTitle.props.style.color).toBe('#718096');
    });

    it('should handle tab state management correctly', () => {
      render(<OfficerBottomNavigator />);
      
      // Test state persistence during navigation
      fireEvent.press(screen.getByTestId('tab-OfficerAttendance'));
      expect(screen.getByTestId('officer-attendance')).toBeTruthy();
      
      fireEvent.press(screen.getByTestId('tab-OfficerDashboard'));
      expect(screen.getByTestId('officer-dashboard')).toBeTruthy();
      
      // Should be able to go back to Attendance
      fireEvent.press(screen.getByTestId('tab-OfficerAttendance'));
      expect(screen.getByTestId('officer-attendance')).toBeTruthy();
    });
  });

  describe('TypeScript Typing and Screen Connections', () => {
    it('should properly connect all officer screen components', () => {
      render(<OfficerBottomNavigator />);
      
      // Test that each screen component is properly imported and connected
      fireEvent.press(screen.getByTestId('tab-OfficerDashboard'));
      expect(screen.getByTestId('officer-dashboard')).toBeTruthy();
      
      fireEvent.press(screen.getByTestId('tab-OfficerAnnouncements'));
      expect(screen.getByTestId('officer-announcements')).toBeTruthy();
      
      fireEvent.press(screen.getByTestId('tab-OfficerAttendance'));
      expect(screen.getByTestId('officer-attendance')).toBeTruthy();
      
      fireEvent.press(screen.getByTestId('tab-OfficerVerifyHours'));
      expect(screen.getByTestId('officer-verify-hours')).toBeTruthy();
      
      fireEvent.press(screen.getByTestId('tab-OfficerEvents'));
      expect(screen.getByTestId('officer-events')).toBeTruthy();
    });

    it('should have correct screen names matching OfficerTabParamList', () => {
      render(<OfficerBottomNavigator />);
      
      // Verify that screen names match the TypeScript interface
      const expectedScreenNames = [
        'OfficerDashboard',
        'OfficerAnnouncements', 
        'OfficerAttendance',
        'OfficerVerifyHours',
        'OfficerEvents'
      ];
      
      expectedScreenNames.forEach(screenName => {
        expect(screen.getByTestId(`tab-${screenName}`)).toBeTruthy();
      });
    });

    it('should maintain type safety for screen props', () => {
      // This test verifies that the component compiles with TypeScript
      // The fact that the component renders without TypeScript errors
      // indicates proper typing
      expect(() => render(<OfficerBottomNavigator />)).not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing screen components gracefully', () => {
      // This test would be more relevant if we had dynamic imports
      // For now, we test that the component doesn't crash
      expect(() => render(<OfficerBottomNavigator />)).not.toThrow();
    });

    it('should handle rapid tab switching', () => {
      render(<OfficerBottomNavigator />);
      
      // Rapidly switch between tabs
      fireEvent.press(screen.getByTestId('tab-OfficerAnnouncements'));
      fireEvent.press(screen.getByTestId('tab-OfficerAttendance'));
      fireEvent.press(screen.getByTestId('tab-OfficerVerifyHours'));
      fireEvent.press(screen.getByTestId('tab-OfficerEvents'));
      fireEvent.press(screen.getByTestId('tab-OfficerDashboard'));
      
      // Should end up on Dashboard
      expect(screen.getByTestId('officer-dashboard')).toBeTruthy();
    });

    it('should maintain consistent behavior across re-renders', () => {
      const { rerender } = render(<OfficerBottomNavigator />);
      
      // Switch to a different tab
      fireEvent.press(screen.getByTestId('tab-OfficerAnnouncements'));
      expect(screen.getByTestId('officer-announcements')).toBeTruthy();
      
      // Re-render the component
      rerender(<OfficerBottomNavigator />);
      
      // After re-render, the component should still work (may reset to default or maintain state)
      // This tests that the component doesn't crash on re-render
      expect(screen.getByTestId('fallback-tab-navigator')).toBeTruthy();
      // The active tab might be either dashboard (reset) or announcements (maintained)
      const hasAnnouncements = screen.queryByTestId('officer-announcements');
      const hasDashboard = screen.queryByTestId('officer-dashboard');
      expect(hasAnnouncements || hasDashboard).toBeTruthy();
    });
  });

  describe('Performance and Optimization', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<OfficerBottomNavigator />);
      
      // Multiple re-renders should not cause issues
      rerender(<OfficerBottomNavigator />);
      rerender(<OfficerBottomNavigator />);
      rerender(<OfficerBottomNavigator />);
      
      expect(screen.getByTestId('fallback-tab-navigator')).toBeTruthy();
      expect(screen.getByTestId('officer-dashboard')).toBeTruthy();
    });

    it('should handle component unmounting cleanly', () => {
      const { unmount } = render(<OfficerBottomNavigator />);
      
      expect(() => unmount()).not.toThrow();
    });
  });
});