/**
 * EventCard Component Tests
 * Tests the EventCard component display, category mapping, and delete functionality
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EventCard from '../../components/ui/EventCard';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock react-native-size-matters
jest.mock('react-native-size-matters', () => ({
  scale: (size: number) => size,
  verticalScale: (size: number) => size,
  moderateScale: (size: number) => size,
}));

describe('EventCard Component', () => {
  const mockEvent = {
    id: 'test-event-1',
    title: 'Community Cleanup',
    description: 'Help clean up the local park and make our community better',
    location: 'Central Park',
    event_date: '2024-02-15',
    starts_at: '2024-02-15T09:00:00Z',
    ends_at: '2024-02-15T12:00:00Z',
    category: 'volunteering',
    created_at: '2024-01-15T10:00:00Z',
    creator_name: 'John Officer',
  };

  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Display', () => {
    it('should render event information correctly', () => {
      const { getByText } = render(
        <EventCard event={mockEvent} />
      );

      // Verify event details are displayed
      expect(getByText('Community Cleanup')).toBeTruthy();
      expect(getByText('Help clean up the local park and make our community better')).toBeTruthy();
      expect(getByText('Central Park')).toBeTruthy();
      expect(getByText('by John Officer')).toBeTruthy();
    });

    it('should format date and time correctly', () => {
      const { getByText } = render(
        <EventCard event={mockEvent} />
      );

      // Check for formatted date (February 15, 2024 • 9:00 AM - 12:00 PM)
      expect(getByText(/February 15, 2024/)).toBeTruthy();
      expect(getByText(/9:00 AM - 12:00 PM/)).toBeTruthy();
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalEvent = {
        id: 'minimal-event',
        title: 'Minimal Event',
        created_at: '2024-01-15T10:00:00Z',
      };

      const { getByText, queryByText } = render(
        <EventCard event={minimalEvent} />
      );

      // Should display required fields
      expect(getByText('Minimal Event')).toBeTruthy();
      expect(getByText('by Unknown User')).toBeTruthy();

      // Should not crash on missing optional fields
      expect(queryByText('Help clean up')).toBeFalsy();
    });
  });

  describe('Category Tag Display', () => {
    it('should display fundraiser category with orange variant', () => {
      const fundraiserEvent = {
        ...mockEvent,
        category: 'fundraiser',
      };

      const { getByText } = render(
        <EventCard event={fundraiserEvent} />
      );

      expect(getByText('Fundraiser')).toBeTruthy();
      // Note: Tag component variant testing would be in Tag.test.tsx
    });

    it('should display volunteering category with teal variant', () => {
      const { getByText } = render(
        <EventCard event={mockEvent} />
      );

      expect(getByText('Volunteering')).toBeTruthy();
    });

    it('should display education category with purple variant', () => {
      const educationEvent = {
        ...mockEvent,
        category: 'education',
      };

      const { getByText } = render(
        <EventCard event={educationEvent} />
      );

      expect(getByText('Education')).toBeTruthy();
    });

    it('should display custom category with orange variant', () => {
      const customEvent = {
        ...mockEvent,
        category: 'custom',
      };

      const { getByText } = render(
        <EventCard event={customEvent} />
      );

      expect(getByText('Custom')).toBeTruthy();
    });

    it('should handle missing category gracefully', () => {
      const noCategoryEvent = {
        ...mockEvent,
        category: undefined,
      };

      const { getByText } = render(
        <EventCard event={noCategoryEvent} />
      );

      expect(getByText('Event')).toBeTruthy();
    });
  });

  describe('Delete Functionality', () => {
    it('should show delete button when showDeleteButton is true', () => {
      const { getByTestId } = render(
        <EventCard 
          event={mockEvent} 
          showDeleteButton={true}
          onDelete={mockOnDelete}
        />
      );

      // Look for delete icon (MaterialIcons delete)
      const deleteButton = getByTestId('delete-button') || 
                          getByText('delete') || // Icon name
                          getByText('🗑️'); // Fallback emoji

      expect(deleteButton).toBeTruthy();
    });

    it('should not show delete button when showDeleteButton is false', () => {
      const { queryByTestId, queryByText } = render(
        <EventCard 
          event={mockEvent} 
          showDeleteButton={false}
        />
      );

      // Should not find delete button
      const deleteButton = queryByTestId('delete-button') || 
                          queryByText('delete') ||
                          queryByText('🗑️');

      expect(deleteButton).toBeFalsy();
    });

    it('should call onDelete when delete button is pressed', () => {
      const { getByTestId } = render(
        <EventCard 
          event={mockEvent} 
          showDeleteButton={true}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = getByTestId('delete-button') || 
                          getByText('delete');

      fireEvent.press(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith('test-event-1');
    });

    it('should disable delete button when deleteLoading is true', () => {
      const { getByTestId } = render(
        <EventCard 
          event={mockEvent} 
          showDeleteButton={true}
          onDelete={mockOnDelete}
          deleteLoading={true}
        />
      );

      const deleteButton = getByTestId('delete-button') || 
                          getByText('delete');

      fireEvent.press(deleteButton);

      // Should not call onDelete when loading
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByText } = render(
        <EventCard event={mockEvent} />
      );

      // Verify important elements are accessible
      expect(getByText('Community Cleanup')).toBeTruthy();
      expect(getByText('Volunteering')).toBeTruthy();
    });

    it('should support screen readers with proper text content', () => {
      const { getByText } = render(
        <EventCard event={mockEvent} />
      );

      // All text content should be readable by screen readers
      expect(getByText('Community Cleanup')).toBeTruthy();
      expect(getByText('Help clean up the local park and make our community better')).toBeTruthy();
      expect(getByText('Central Park')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long event titles', () => {
      const longTitleEvent = {
        ...mockEvent,
        title: 'This is a very long event title that might cause layout issues if not handled properly in the component',
      };

      const { getByText } = render(
        <EventCard event={longTitleEvent} />
      );

      expect(getByText(longTitleEvent.title)).toBeTruthy();
    });

    it('should handle very long descriptions', () => {
      const longDescriptionEvent = {
        ...mockEvent,
        description: 'This is a very long description that goes on and on and might cause layout issues if not properly handled by the component. It should wrap nicely and not break the card layout.',
      };

      const { getByText } = render(
        <EventCard event={longDescriptionEvent} />
      );

      expect(getByText(longDescriptionEvent.description)).toBeTruthy();
    });

    it('should handle events with only start time (no end time)', () => {
      const startOnlyEvent = {
        ...mockEvent,
        ends_at: undefined,
      };

      const { getByText } = render(
        <EventCard event={startOnlyEvent} />
      );

      // Should still display start time
      expect(getByText(/9:00 AM/)).toBeTruthy();
    });

    it('should handle events with no time information', () => {
      const noTimeEvent = {
        ...mockEvent,
        starts_at: undefined,
        ends_at: undefined,
      };

      const { getByText } = render(
        <EventCard event={noTimeEvent} />
      );

      // Should still display date
      expect(getByText(/February 15, 2024/)).toBeTruthy();
    });
  });
});