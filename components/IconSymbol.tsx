
// This file is a fallback for using MaterialIcons on Android and web.

import React from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Map of common icon names to valid Material Icons
const ICON_FALLBACK_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  // Common fallbacks
  "help_outline": "help_outline",
  "help": "help_outline",
  "question_mark": "help_outline",
  
  // Navigation
  "home": "home",
  "arrow_back": "arrow_back",
  "arrow_forward": "arrow_forward",
  "chevron_left": "chevron_left",
  "chevron_right": "chevron_right",
  
  // Actions
  "add": "add",
  "delete": "delete",
  "edit": "edit",
  "save": "save",
  "close": "close",
  
  // Media
  "photo": "photo",
  "camera": "camera_alt",
  "video": "videocam",
  "image": "image",
  
  // Common
  "settings": "settings",
  "search": "search",
  "menu": "menu",
  "more": "more_vert",
  "info": "info",
  "warning": "warning",
  "error": "error",
  "check": "check",
};

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  ios_icon_name = undefined,
  android_material_icon_name,
  size = 24,
  color,
  style,
}: {
  ios_icon_name?: string | undefined;
  android_material_icon_name: keyof typeof MaterialIcons.glyphMap | string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // Ensure we have a valid Material Icon name, fallback to help_outline if invalid
  let iconName = android_material_icon_name as keyof typeof MaterialIcons.glyphMap;
  
  // Check if the icon name exists in MaterialIcons glyphMap
  if (!MaterialIcons.glyphMap[iconName]) {
    // Try to find a fallback
    const fallback = ICON_FALLBACK_MAP[iconName as string];
    if (fallback) {
      iconName = fallback;
    } else {
      console.warn(`[IconSymbol] Invalid Material Icon name: ${iconName}, using help_outline as fallback`);
      iconName = "help_outline";
    }
  }
  
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={iconName}
      style={style as StyleProp<TextStyle>}
    />
  );
}
