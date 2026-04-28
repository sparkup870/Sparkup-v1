import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Home, MessageCircle, MapPin } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import MatchScreen from '../screens/MatchScreen';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.secondary,
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={28} />
          ),
        }}
      />
      <Tab.Screen 
        name="ChatsTab" 
        component={ChatScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={28} />
          ),
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={View} // Placeholder for profile/location
        options={{
          tabBarIcon: ({ color, size }) => (
            <MapPin color={color} size={28} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen 
          name="MatchModal" 
          component={MatchScreen} 
          options={{ presentation: 'transparentModal', animation: 'fade' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    elevation: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: 90,
    paddingTop: 10,
    paddingBottom: 30,
  },
});
