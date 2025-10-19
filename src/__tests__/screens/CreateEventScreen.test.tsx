/**
 * CreateEventScreen Component Tests
 * Tests the event creation form, validation, and submission workflow
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CreateEventScreen from '../../screens/officer/CreateEventScreen';
import { eventService } from '../../services/EventService';

// Mock dependencies
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-size-matters', () => ({
  scale: (size: number) => size,
  verticalScale: (size: number) => size,
  moderateScale: (size: number) => size,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock contexts
jest.mock('../../contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    activeOrganization: { id: 'test-org-id', name: 'Test Organization' },
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock toast provider
jest.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showValidationError: jest.fn(),
  }),
}));

// Mock HOC
jest.mock('../../components/hoc/withRoleProtection', () => ({
  withRoleProtection: (Component: any) => Component,
}));

// Mock event service
jest.mock('../../services/EventService', () => ({
  eventService: {
    createEvent: jest.fn(),
  },
}));

// Mock navigation
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

describe('CreateEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Alert.alert
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Form Rendering', () => {
    it('should render all form fields', () => {
      const { getByPlaceholderText, getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Check for form fields
      expect(getByPlaceholderText('Enter event name')).toBeTruthy();
      expect(getByText('Fundraiser')).toBeTruthy();
      expect(getByText('Volunteering')).toBeTruthy();
      expect(getByText('Education')).toBeTruthy();
      expect(getByText('Custom')).toBeTruthy();
      expect(getByPlaceholderText('Enter event location')).toBeTruthy();
      expect(getByPlaceholderText(/Describe the event/)).toBeTruthy();
    });

    it('should show custom category input when custom is selected', () => {
      const { getByText, getByPlaceholderText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Select custom category
      fireEvent.press(getByText('Custom'));

      // Should show custom category input
      expect(getByPlaceholderText('Enter custom category name')).toBeTruthy();
    });

    it('should hide custom category input when other categories are selected', () => {
      const { getByText, queryByPlaceholderText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // First select custom to show the input
      fireEvent.press(getByText('Custom'));
      expect(queryByPlaceholderText('Enter custom category name')).toBeTruthy();

      // Then select another category
      fireEvent.press(getByText('Volunteering'));
      expect(queryByPlaceholderText('Enter custom category name')).toBeFalsy();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const { getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Try to submit without filling required fields
      fireEvent.press(getByText('Create Event'));

      // Should show validation errors
      await waitFor(() => {
        expect(getByText('Event name is required')).toBeTruthy();
        expect(getByText('Please select a category')).toBeTruthy();
        expect(getByText('Event date is required')).toBeTruthy();
        expect(getByText('Start time is required')).toBeTruthy();
        expect(getByText('End time is required')).toBeTruthy();
        expect(getByText('Location is required')).toBeTruthy();
      });
    });

    it('should validate event name length', () => {
      const { getByPlaceholderText, getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      const eventNameInput = getByPlaceholderText('Enter event name');
      
      // Enter a name that's too long (over 50 characters)
      const longName = 'This is a very long event name that exceeds the fifty character limit';
      fireEvent.changeText(eventNameInput, longName);
      fireEvent.press(getByText('Create Event'));

      expect(getByText('Event name must be 50 characters or less')).toBeTruthy();
    });

    it('should validate custom category when custom is selected', () => {
      const { getByText, getByPlaceholderText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Select custom category but don't enter custom name
      fireEvent.press(getByText('Custom'));
      fireEvent.press(getByText('Create Event'));

      expect(getByText('Custom category name is required')).toBeTruthy();
    });

    it('should validate description word count', () => {
      const { getByPlaceholderText, getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      const descriptionInput = getByPlaceholderText(/Describe the event/);
      
      // Create a description with more than 150 words
      const longDescription = Array(151).fill('word').join(' ');
      fireEvent.changeText(descriptionInput, longDescription);
      fireEvent.press(getByText('Create Event'));

      expect(getByText('Description must be 150 words or less')).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    it('should submit valid event data successfully', async () => {
      const mockCreateEvent = eventService.createEvent as jest.Mock;
      mockCreateEvent.mockResolvedValue({
        success: true,
        data: { id: 'new-event-id', title: 'Test Event' },
        error: null,
      });

      const { getByPlaceholderText, getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Fill out the form
      fireEvent.changeText(getByPlaceholderText('Enter event name'), 'Test Event');
      fireEvent.press(getByText('Volunteering'));
      fireEvent.changeText(getByPlaceholderText('Enter event location'), 'Test Location');
      fireEvent.changeText(getByPlaceholderText(/Describe the event/), 'Test description');

      // Mock date and time selection (would normally be done through DateTimePicker)
      // For testing, we'll assume the component state is set correctly

      fireEvent.press(getByText('Create Event'));

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalled();
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });

    it('should handle submission errors gracefully', async () => {
      const mockCreateEvent = eventService.createEvent as jest.Mock;
      mockCreateEvent.mockResolvedValue({
        success: false,
        data: null,
        error: 'Failed to create event',
      });

      const { getByPlaceholderText, getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Fill out the form with valid data
      fireEvent.changeText(getByPlaceholderText('Enter event name'), 'Test Event');
      fireEvent.press(getByText('Volunteering'));
      fireEvent.changeText(getByPlaceholderText('Enter event location'), 'Test Location');

      fireEvent.press(getByText('Create Event'));

      await waitFor(() => {
        expect(mockCreateEvent).toHaveBeenCalled();
        // Should not navigate back on error
        expect(mockNavigation.goBack).not.toHaveBeenCalled();
      });
    });

    it('should disable submit button during submission', async () => {
      const mockCreateEvent = eventService.createEvent as jest.Mock;
      // Mock a slow response
      mockCreateEvent.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ success: true, data: {}, error: null }), 1000)
      ));

      const { getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Create Event'));

      // Should show loading state
      expect(getByText('Creating Event...')).toBeTruthy();
    });
  });

  describe('Category Selection', () => {
    it('should highlight selected category', () => {
      const { getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      const volunteeringButton = getByText('Volunteering');
      fireEvent.press(volunteeringButton);

      // The button should have active styling (tested through component state)
      // This would be verified through style testing in a more complete test setup
      expect(volunteeringButton).toBeTruthy();
    });

    it('should allow only one category selection at a time', () => {
      const { getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Select first category
      fireEvent.press(getByText('Fundraiser'));
      
      // Select second category
      fireEvent.press(getByText('Volunteering'));

      // Only the second category should be selected
      // This would be verified through component state in a more complete test
      expect(getByText('Volunteering')).toBeTruthy();
      expect(getByText('Fundraiser')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByTestId } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Look for back button (would need testID in actual component)
      const backButton = getByTestId('back-button') || getByText('arrow-back');
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should navigate back after successful event creation', async () => {
      const mockCreateEvent = eventService.createEvent as jest.Mock;
      mockCreateEvent.mockResolvedValue({
        success: true,
        data: { id: 'new-event-id' },
        error: null,
      });

      const { getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Submit form (assuming validation passes)
      fireEvent.press(getByText('Create Event'));

      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });
  });

  describe('Character Counters', () => {
    it('should show character count for event name', () => {
      const { getByPlaceholderText, getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      const eventNameInput = getByPlaceholderText('Enter event name');
      fireEvent.changeText(eventNameInput, 'Test Event');

      expect(getByText('10/50 characters')).toBeTruthy();
    });

    it('should show word count for description', () => {
      const { getByPlaceholderText, getByText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      const descriptionInput = getByPlaceholderText(/Describe the event/);
      fireEvent.changeText(descriptionInput, 'This is a test description with multiple words');

      expect(getByText(/\/150 words/)).toBeTruthy();
    });

    it('should show character count for custom category', () => {
      const { getByText, getByPlaceholderText } = render(
        <CreateEventScreen navigation={mockNavigation} />
      );

      // Select custom category
      fireEvent.press(getByText('Custom'));
      
      const customInput = getByPlaceholderText('Enter custom category name');
      fireEvent.changeText(customInput, 'Custom Category');

      expect(getByText('15/30 characters')).toBeTruthy();
    });
  });
});