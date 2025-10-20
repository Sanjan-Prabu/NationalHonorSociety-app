import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchableDropdown, { DropdownOption } from '../../components/ui/SearchableDropdown';

const mockOptions: DropdownOption[] = [
  { label: 'Community Service Event', value: '1' },
  { label: 'Food Bank Volunteer', value: '2' },
  { label: 'Beach Cleanup', value: '3' },
];

describe('SearchableDropdown', () => {
  it('renders with placeholder text when no option is selected', () => {
    const mockOnSelect = jest.fn();
    const { getByText } = render(
      <SearchableDropdown
        options={mockOptions}
        onSelect={mockOnSelect}
        placeholder="Select an event"
      />
    );

    expect(getByText('Select an event')).toBeTruthy();
  });

  it('displays selected option label', () => {
    const mockOnSelect = jest.fn();
    const { getByText } = render(
      <SearchableDropdown
        options={mockOptions}
        selectedValue="1"
        onSelect={mockOnSelect}
        placeholder="Select an event"
      />
    );

    expect(getByText('Community Service Event')).toBeTruthy();
  });

  it('opens modal when dropdown is pressed', () => {
    const mockOnSelect = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <SearchableDropdown
        options={mockOptions}
        onSelect={mockOnSelect}
        placeholder="Select an event"
        searchPlaceholder="Search events..."
      />
    );

    fireEvent.press(getByText('Select an event'));
    expect(getByPlaceholderText('Search events...')).toBeTruthy();
  });

  it('calls onSelect when option is pressed', () => {
    const mockOnSelect = jest.fn();
    const { getByText } = render(
      <SearchableDropdown
        options={mockOptions}
        onSelect={mockOnSelect}
        placeholder="Select an event"
      />
    );

    fireEvent.press(getByText('Select an event'));
    fireEvent.press(getByText('Community Service Event'));
    
    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });

  it('shows loading state', () => {
    const mockOnSelect = jest.fn();
    const { getByText } = render(
      <SearchableDropdown
        options={[]}
        onSelect={mockOnSelect}
        isLoading={true}
        placeholder="Select an event"
      />
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('shows error state', () => {
    const mockOnSelect = jest.fn();
    const { getByText } = render(
      <SearchableDropdown
        options={[]}
        onSelect={mockOnSelect}
        isError={true}
        placeholder="Select an event"
      />
    );

    expect(getByText('Failed to load options')).toBeTruthy();
  });
});