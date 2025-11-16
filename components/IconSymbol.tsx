
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

// Comprehensive map of icon names to valid Material Icons
const ICON_FALLBACK_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  // Help & Info
  "help_outline": "help-outline",
  "help": "help-outline",
  "question_mark": "help-outline",
  "info": "info",
  "info_outline": "info-outline",
  
  // Navigation
  "home": "home",
  "arrow_back": "arrow-back",
  "arrow_forward": "arrow-forward",
  "chevron_left": "chevron-left",
  "chevron_right": "chevron-right",
  
  // Actions
  "add": "add",
  "delete": "delete",
  "edit": "edit",
  "save": "save",
  "close": "close",
  
  // Media
  "photo": "photo",
  "camera": "camera-alt",
  "video": "videocam",
  "image": "image",
  "collections": "collections",
  "add_photo_alternate": "add-photo-alternate",
  
  // Files & Folders
  "folder": "folder",
  "folder_open": "folder-open",
  "create_new_folder": "create-new-folder",
  
  // Common
  "settings": "settings",
  "search": "search",
  "menu": "menu",
  "more": "more-vert",
  "warning": "warning",
  "error": "error",
  "check": "check",
  "check_circle": "check-circle",
  
  // Favorites & Heart
  "favorite": "favorite",
  "heart": "favorite",
  
  // Maps & Location
  "map": "map",
  "location": "location-on",
  
  // Communication
  "headset_mic": "headset-mic",
  "phone": "phone",
  
  // Payment
  "payment": "payment",
  "credit_card": "credit-card",
  
  // Security
  "security": "security",
  "lock": "lock",
  
  // Drone & Flight
  "flight": "flight",
  "settings_remote": "settings-remote",
  
  // 3D & AR
  "view_in_ar": "view-in-ar",
  "cube": "view-in-ar",
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
  // Ensure we have a valid Material Icon name
  let iconName = android_material_icon_name as string;
  
  // Try to find a fallback mapping first
  if (ICON_FALLBACK_MAP[iconName]) {
    iconName = ICON_FALLBACK_MAP[iconName];
  }
  
  // Check if the icon name exists in MaterialIcons glyphMap
  if (!MaterialIcons.glyphMap[iconName as keyof typeof MaterialIcons.glyphMap]) {
    console.warn(`[IconSymbol] Invalid Material Icon name: ${iconName}, using help-outline as fallback`);
    iconName = "help-outline";
  }
  
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={iconName as keyof typeof MaterialIcons.glyphMap}
      style={style as StyleProp<TextStyle>}
    />
  );
}
