import { Tabs } from "expo-router";
import { colors } from "@/lib/theme";
import Svg, { Path, Rect, Circle } from "react-native-svg";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.gray2,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.sep,
        },
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Rect x="3" y="3" width="7" height="7" rx={1.5} />
              <Rect x="14" y="3" width="7" height="7" rx={1.5} />
              <Rect x="3" y="14" width="7" height="7" rx={1.5} />
              <Rect x="14" y="14" width="7" height="7" rx={1.5} />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="estimates"
        options={{
          title: "Estimates",
          tabBarIcon: ({ color, size }) => (
            <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <Path d="M14 2v6h6" />
              <Path d="M8 13h8" />
              <Path d="M8 17h8" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ color, size }) => (
            <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <Circle cx="9" cy="7" r="4" />
              <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarIcon: ({ color, size }) => (
            <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <Path d="M8 10h8" />
              <Path d="M8 14h4" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx="12" cy="12" r="1" />
              <Circle cx="12" cy="5" r="1" />
              <Circle cx="12" cy="19" r="1" />
            </Svg>
          ),
        }}
      />
    </Tabs>
  );
}
