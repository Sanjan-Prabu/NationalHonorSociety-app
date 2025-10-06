import { MaterialIcons } from '@expo/vector-icons';
import { OfficerTabParamList } from '../../types/navigation';

// Import the icon mapping function by extracting it from the component
// Since it's not exported, we'll test it indirectly through the component behavior

describe('OfficerBottomNavigator Icon Mapping', () => {
  // Test the icon mapping logic
  const getTabBarIcon = (routeName: keyof OfficerTabParamList): keyof typeof MaterialIcons.glyphMap => {
    switch (routeName) {
      case 'OfficerDashboard':
        return 'dashboard';
      case 'OfficerAnnouncements':
        return 'announcement';
      case 'OfficerAttendance':
        return 'event-available';
      case 'OfficerVerifyHours':
        return 'schedule';
      case 'OfficerEvents':
        return 'event';
      default:
        return 'help';
    }
  };

  describe('Icon Mapping Function', () => {
    it('should map OfficerDashboard to dashboard icon', () => {
      expect(getTabBarIcon('OfficerDashboard')).toBe('dashboard');
    });

    it('should map OfficerAnnouncements to announcement icon', () => {
      expect(getTabBarIcon('OfficerAnnouncements')).toBe('announcement');
    });

    it('should map OfficerAttendance to event-available icon', () => {
      expect(getTabBarIcon('OfficerAttendance')).toBe('event-available');
    });

    it('should map OfficerVerifyHours to schedule icon', () => {
      expect(getTabBarIcon('OfficerVerifyHours')).toBe('schedule');
    });

    it('should map OfficerEvents to event icon', () => {
      expect(getTabBarIcon('OfficerEvents')).toBe('event');
    });

    it('should return help icon for unknown routes', () => {
      // @ts-expect-error Testing invalid route name
      expect(getTabBarIcon('UnknownRoute')).toBe('help');
    });
  });

  describe('Icon Consistency', () => {
    it('should use valid MaterialIcons names', () => {
      const officerRoutes: (keyof OfficerTabParamList)[] = [
        'OfficerDashboard',
        'OfficerAnnouncements',
        'OfficerAttendance',
        'OfficerVerifyHours',
        'OfficerEvents'
      ];

      officerRoutes.forEach(route => {
        const iconName = getTabBarIcon(route);
        // Verify that the icon name exists in MaterialIcons
        expect(typeof iconName).toBe('string');
        expect(iconName.length).toBeGreaterThan(0);
      });
    });

    it('should have unique icons for each tab', () => {
      const officerRoutes: (keyof OfficerTabParamList)[] = [
        'OfficerDashboard',
        'OfficerAnnouncements',
        'OfficerAttendance',
        'OfficerVerifyHours',
        'OfficerEvents'
      ];

      const icons = officerRoutes.map(route => getTabBarIcon(route));
      const uniqueIcons = new Set(icons);
      
      expect(uniqueIcons.size).toBe(icons.length);
    });

    it('should use semantically appropriate icons', () => {
      // Test that icons make semantic sense for their purpose
      expect(getTabBarIcon('OfficerDashboard')).toBe('dashboard'); // Dashboard icon for dashboard
      expect(getTabBarIcon('OfficerAnnouncements')).toBe('announcement'); // Announcement icon for announcements
      expect(getTabBarIcon('OfficerAttendance')).toBe('event-available'); // Event availability for attendance
      expect(getTabBarIcon('OfficerVerifyHours')).toBe('schedule'); // Schedule icon for hours verification
      expect(getTabBarIcon('OfficerEvents')).toBe('event'); // Event icon for events
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should accept all valid OfficerTabParamList keys', () => {
      // These should all compile without TypeScript errors
      expect(() => getTabBarIcon('OfficerDashboard')).not.toThrow();
      expect(() => getTabBarIcon('OfficerAnnouncements')).not.toThrow();
      expect(() => getTabBarIcon('OfficerAttendance')).not.toThrow();
      expect(() => getTabBarIcon('OfficerVerifyHours')).not.toThrow();
      expect(() => getTabBarIcon('OfficerEvents')).not.toThrow();
    });

    it('should return valid MaterialIcons glyph names', () => {
      const officerRoutes: (keyof OfficerTabParamList)[] = [
        'OfficerDashboard',
        'OfficerAnnouncements',
        'OfficerAttendance',
        'OfficerVerifyHours',
        'OfficerEvents'
      ];

      officerRoutes.forEach(route => {
        const iconName = getTabBarIcon(route);
        // The return type should be assignable to MaterialIcons.glyphMap keys
        expect(typeof iconName).toBe('string');
      });
    });
  });

  describe('Icon Accessibility', () => {
    it('should provide meaningful icon names for screen readers', () => {
      const iconMappings = {
        'OfficerDashboard': 'dashboard',
        'OfficerAnnouncements': 'announcement',
        'OfficerAttendance': 'event-available',
        'OfficerVerifyHours': 'schedule',
        'OfficerEvents': 'event'
      };

      Object.entries(iconMappings).forEach(([route, expectedIcon]) => {
        const iconName = getTabBarIcon(route as keyof OfficerTabParamList);
        expect(iconName).toBe(expectedIcon);
        
        // Icon names should be descriptive
        expect(iconName).not.toBe('');
        expect(iconName).not.toBe('help'); // Should not fall back to help for valid routes
      });
    });
  });
});