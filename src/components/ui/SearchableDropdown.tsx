import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Colors = {
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  inputBorder: '#D1D5DB',
  inputBackground: '#F9FAFB',
  dividerColor: '#D1D5DB',
  lightBlue: '#EBF8FF',
  errorRed: '#E53E3E',
};

export interface DropdownOption {
  label: string;
  value: string;
}

interface SearchableDropdownProps {
  options: DropdownOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  isError?: boolean;
  hasError?: boolean;
  emptyStateTitle?: string;
  emptyStateSubtitle?: string;
  maxHeight?: number;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  isLoading = false,
  isError = false,
  hasError = false,
  emptyStateTitle = 'No options available',
  emptyStateSubtitle = 'Please check back later or contact support.',
  maxHeight = 250,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedOption = useMemo(() => {
    return options.find(option => option.value === selectedValue);
  }, [options, selectedValue]);

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return options;
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [options, searchText]);

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
    setSearchText('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchText('');
  };

  return (
    <View style={styles.container}>
      {/* Dropdown Trigger */}
      <TouchableOpacity
        style={[
          styles.dropdownTrigger,
          hasError && styles.dropdownError,
          isOpen && styles.dropdownOpen
        ]}
        onPress={() => setIsOpen(true)}
        disabled={isLoading || isError}
      >
        <Text style={[
          styles.dropdownText,
          !selectedOption && styles.dropdownPlaceholder
        ]}>
          {isLoading ? 'Loading...' : 
           isError ? 'Failed to load options' :
           selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Icon 
          name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
          size={moderateScale(24)} 
          color={Colors.textMedium} 
        />
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={handleClose}
        >
          <View style={styles.modalContent}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={moderateScale(20)} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor={Colors.textLight}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus={true}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Icon name="clear" size={moderateScale(20)} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {/* Options List */}
            <ScrollView 
              style={[styles.optionsList, { maxHeight }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      selectedValue === option.value && styles.optionItemSelected,
                      index === filteredOptions.length - 1 && styles.lastOption
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedValue === option.value && styles.optionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    {selectedValue === option.value && (
                      <Icon 
                        name="check" 
                        size={moderateScale(20)} 
                        color={Colors.solidBlue} 
                      />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="search-off" size={moderateScale(32)} color={Colors.textLight} />
                  <Text style={styles.emptyStateTitle}>
                    {searchText ? 'No matches found' : emptyStateTitle}
                  </Text>
                  <Text style={styles.emptyStateSubtitle}>
                    {searchText ? `No options match "${searchText}"` : emptyStateSubtitle}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dropdownTrigger: {
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: moderateScale(8),
    backgroundColor: Colors.white,
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownError: {
    borderColor: Colors.errorRed,
  },
  dropdownOpen: {
    borderColor: Colors.solidBlue,
  },
  dropdownText: {
    fontSize: moderateScale(16),
    color: Colors.textDark,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: Colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(12),
    width: '100%',
    maxWidth: scale(400),
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(8),
    elevation: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.dividerColor,
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(16),
    color: Colors.textDark,
    marginLeft: scale(8),
    paddingVertical: verticalScale(4),
  },
  optionsList: {
    flexGrow: 0,
  },
  optionItem: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dividerColor,
  },
  optionItemSelected: {
    backgroundColor: Colors.lightBlue,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: moderateScale(16),
    color: Colors.textDark,
    flex: 1,
    marginRight: scale(8),
  },
  optionTextSelected: {
    color: Colors.solidBlue,
    fontWeight: '600',
  },
  emptyState: {
    padding: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.textMedium,
    marginTop: verticalScale(12),
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: moderateScale(14),
    color: Colors.textLight,
    marginTop: verticalScale(8),
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  closeButton: {
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(16),
    borderTopWidth: 1,
    borderTopColor: Colors.dividerColor,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: moderateScale(16),
    color: Colors.solidBlue,
    fontWeight: '600',
  },
});

export default SearchableDropdown;