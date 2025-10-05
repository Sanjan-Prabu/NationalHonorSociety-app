import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Colors = {
  solidBlue: '#2B5CE6',
  textLight: '#718096',
  white: '#FFFFFF',
  dividerColor: '#D1D5DB',
};

export interface BottomNavigatorProps {
  activeTab?: string;
  onTabPress: (tabName: string) => void;
}

// Create a context to share the active tab state
const BottomNavContext = React.createContext<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
}>({
  activeTab: 'home',
  setActiveTab: () => {},
});

// Create a provider to wrap your app
export const BottomNavProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [activeTab, setActiveTab] = React.useState('home');
  
  return (
    <BottomNavContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </BottomNavContext.Provider>
  );
};

// Hook to use the bottom navigation context
export const useBottomNav = () => {
  const context = React.useContext(BottomNavContext);
  if (!context) {
    throw new Error('useBottomNav must be used within a BottomNavProvider');
  }
  return context;
};

const BottomNavigator: React.FC<BottomNavigatorProps> = ({ onTabPress, activeTab: propActiveTab }) => {
  const { activeTab: contextActiveTab, setActiveTab } = useBottomNav();
  
  // Use prop if provided, otherwise use context
  const currentActiveTab = propActiveTab || contextActiveTab;
  
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'attendance', icon: 'book', label: 'Attendance' },
    { id: 'announcements', icon: 'notifications', label: 'Announcements' },
    { id: 'log-hours', icon: 'access-time', label: 'Log Hours' },
    { id: 'events', icon: 'event', label: 'Events' },
  ];

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    onTabPress(tabId);
  };

  return (
    <View style={styles.bottomNavContainer}>
      {tabs.map((tab) => {
        const isActive = currentActiveTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => handleTabPress(tab.id)}
          >
            <Icon 
              name={tab.icon} 
              size={moderateScale(24)} 
              color={isActive ? Colors.solidBlue : Colors.textLight} 
            />
            <Text style={[
              styles.navText, 
              { color: isActive ? Colors.solidBlue : Colors.textLight }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(1),
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.dividerColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(-2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(4),
    minWidth: scale(60),
  },
  navText: {
    fontSize: moderateScale(10),
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
});

export default BottomNavigator;