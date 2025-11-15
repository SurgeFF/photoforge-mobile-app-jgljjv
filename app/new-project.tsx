
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import { createProject, getAccessKey } from "@/utils/apiClient";

export default function NewProjectScreen() {
  const theme = useTheme();
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [altitude, setAltitude] = useState("100");
  const [overlap, setOverlap] = useState("70");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!projectName.trim()) {
      Alert.alert("Error", "Please enter a project name");
      return;
    }

    setIsCreating(true);

    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        router.replace("/(tabs)/(home)/");
        return;
      }

      const projectData = {
        name: projectName.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        status: "active",
        flight_settings: {
          altitude: parseInt(altitude) || 100,
          overlap: parseInt(overlap) || 70,
        },
      };

      const result = await createProject(accessKey, projectData);

      if (result.success) {
        Alert.alert(
          "Success",
          "Project created successfully!",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to create project");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      Alert.alert("Error", "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopographicBackground />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>New Project</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.iconContainer}>
          <IconSymbol
            ios_icon_name="folder.badge.plus"
            android_material_icon_name="create_new_folder"
            size={48}
            color={colors.primary}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Project Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Downtown Mapping Survey"
              placeholderTextColor={colors.textSecondary}
              value={projectName}
              onChangeText={setProjectName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., San Francisco, CA"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Project description..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Flight Settings</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Altitude (meters)</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor={colors.textSecondary}
              value={altitude}
              onChangeText={setAltitude}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>
              Recommended: 80-120 meters for mapping
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Image Overlap (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="70"
              placeholderTextColor={colors.textSecondary}
              value={overlap}
              onChangeText={setOverlap}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>
              Recommended: 70-80% for best 3D reconstruction
            </Text>
          </View>
        </View>

        <Button
          onPress={handleCreate}
          loading={isCreating}
          disabled={isCreating}
          style={styles.createButton}
        >
          {isCreating ? "Creating..." : "Create Project"}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === "android" ? 48 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  createButton: {
    marginTop: 16,
  },
});
