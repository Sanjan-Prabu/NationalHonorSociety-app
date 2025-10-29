import React from 'react';
import { render } from '@testing-library/react-native';
import ImagePicker from '../../components/ui/ImagePicker';

describe('ImagePicker', () => {
  const mockOnImageSelected = jest.fn();
  const mockOnImageRemoved = jest.fn();
  const mockOnValidationError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders placeholder when no image is selected', () => {
    const { getByText } = render(
      <ImagePicker
        onImageSelected={mockOnImageSelected}
        onImageRemoved={mockOnImageRemoved}
        placeholder="Add Image"
      />
    );

    expect(getByText('Add Image')).toBeTruthy();
  });

  it('shows loading state during upload', () => {
    const { getByText } = render(
      <ImagePicker
        onImageSelected={mockOnImageSelected}
        onImageRemoved={mockOnImageRemoved}
        selectedImage="file://test-image.jpg"
        loading={true}
      />
    );

    expect(getByText('Uploading...')).toBeTruthy();
  });

  it('disables interaction when disabled prop is true', () => {
    const { getByTestId } = render(
      <ImagePicker
        onImageSelected={mockOnImageSelected}
        onImageRemoved={mockOnImageRemoved}
        disabled={true}
      />
    );

    const pickerButton = getByTestId('picker-button');
    expect(pickerButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('displays error text when error prop is provided', () => {
    const { getByText } = render(
      <ImagePicker
        onImageSelected={mockOnImageSelected}
        onImageRemoved={mockOnImageRemoved}
        error="Upload failed. Please try again."
      />
    );

    expect(getByText('Upload failed. Please try again.')).toBeTruthy();
  });
});