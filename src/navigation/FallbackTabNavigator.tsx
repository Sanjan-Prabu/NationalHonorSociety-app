import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface TabScreen {
  name: string;
  component: React.ComponentType<any>;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
}

interface FallbackTabNavigatorProps {
  screens: TabScreen[];
  screenOptions?: {
    headerShown?: boolean;
    tabBarActiveTintColor?: string;
    tabBarInactiveTintColor?: string;
  };
}

// Create a context for tab navigation
const TabNavigationContext = React.createContext<{
  jumpTo: (screenName: string) => void;
}>({
  jumpTo: () => {},
});

export const useTabNavigation = () => React.useContext(TabNavigationContext);

/**
 * Fallback tab navigator implementation for when @react-navigation/bottom-tabs is not available
 * TODO: Replace with @react-navigation/bottom-tabs when dependency is installed
 * Installation: npm install @react-navigation/bottom-tabs
 */
export default function FallbackTabNavigator({ 
  screens, 
  screenOptions = {} 
}: FallbackTabNavigatorProps) {
  const [activeTab, setActiveTab] = useState(0);
  const navigation = useNavigation();

  // Function to jump to a specific tab by name
  const jumpTo = (screenName: string) => {
    const screenIndex = screens.findIndex(screen => screen.name === screenName);
    if (screenIndex !== -1) {
      setActiveTab(screenIndex);
    }
  };
  
  // Handle empty screens array
  if (!screens || screens.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text>No screens available</Text>
        </View>
      </View>
    );
  }
  
  const ActiveComponent = screens[activeTab]?.component;

  const {
    tabBarActiveTintColor = '#2B5CE6',
    tabBarInactiveTintColor = '#718096'
  } = screenOptions;

  return (
    <TabNavigationContext.Provider value={{ jumpTo }}>
      <View style={styles.container}>
        <View style={styles.content}>
          {ActiveComponent && <ActiveComponent navigation={navigation} />}
        </View>
        <View style={styles.tabBar}>
          {screens.map((screen, index) => {
            const isActive = activeTab === index;
            const color = isActive ? tabBarActiveTintColor : tabBarInactiveTintColor;
            
            return (
              <TouchableOpacity
                key={screen.name}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(index)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={screen.title}
              >
                <MaterialIcons 
                  name={screen.icon} 
                  size={24} 
                  color={color} 
                />
                <Text 
                  style={[
                    styles.tabText, 
                    { color },
                    isActive && styles.activeTabText
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {screen.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </TabNavigationContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  activeTab: {
    // Additional styling for active tab if needed
  },
  tabText: {
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
   
  },
  activeTabText: {
    fontWeight: '600',
  },
});