
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
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import { generateFlightPlan, djiUploadFlightPlan } from "@/utils/apiClient";

export default function FlightPlanningScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;
  const projectName = params.projectName as string;

  const [altitude, setAltitude] = useState("100");
  const [overlap, setOverlap] = useState("70");
  const [speed, setSpeed] = useState("5");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePlan = async () => {
    if (!altitude || !overlap) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateFlightPlan({
        area: {
          type: "polygon",
          coordinates: [],
        },
        altitude: parseInt(altitude),
        overlap: parseInt(overlap),
        drone_specs: {
          max_speed: parseInt(speed) || 5,
        },
      });

      if (result.success) {
        Alert.alert(
          "Success",
          "Flight plan generated successfully!",
          [
            {
              text: "Upload to Drone",
              onPress: () => handleUploadToDrone(result.data),
            },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to generate flight plan");
      }
    } catch (error) {
      console.error("Generate flight plan error:", error);
      Alert.alert("Error", "Failed to generate flight plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadToDrone = async (flightPlanData: any) => {
    try {
      const result = await djiUploadFlightPlan(
        flightPlanData.waypoints || [],
        {
          altitude: parseInt(altitude),
          speed: parseInt(speed),
        }
      );

      if (result.success) {
        Alert.alert("Success", "Flight plan uploaded to drone!");
      } else {
        Alert.alert("Error", result.error || "Failed to upload flight plan");
      }
    } catch (error) {
      console.error("Upload flight plan error:", error);
      Alert.alert("Error", "Failed to upload flight plan");
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
        <Text style={styles.headerTitle}>Flight Planning</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.projectInfo}>
          <IconSymbol
            ios_icon_name="airplane"
            android_material_icon_name="flight"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.projectName}>{projectName}</Text>
        </View>

        <View style={styles.infoBox}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            Note: react-native-maps is not supported in Natively. Map-based flight
            planning will be available in a future update. For now, you can set
            flight parameters manually.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Flight Parameters</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Altitude (meters) *</Text>
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
            <Text style={styles.label}>Image Overlap (%) *</Text>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Flight Speed (m/s)</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor={colors.textSecondary}
              value={speed}
              onChangeText={setSpeed}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>
              Recommended: 3-7 m/s for stable imagery
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="camera.fill"
              android_material_icon_name="camera_alt"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.statValue}>~</Text>
            <Text style={styles.statLabel}>Est. Photos</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="clock.fill"
              android_material_icon_name="schedule"
              size={24}
              color={colors.primaryDark}
            />
            <Text style={styles.statValue}>~</Text>
            <Text style={styles.statLabel}>Est. Time</Text>
          </View>
        </View>

        <Button
          onPress={handleGeneratePlan}
          loading={isGenerating}
          disabled={isGenerating}
          style={styles.generateButton}
        >
          {isGenerating ? "Generating..." : "Generate Flight Plan"}
        </Button>

        <Button
          onPress={() => router.push("/drone-control")}
          variant="outline"
          style={styles.controlButton}
        >
          <View style={styles.buttonContent}>
            <IconSymbol
              ios_icon_name="antenna.radiowaves.left.and.right"
              android_material_icon_name="settings_remote"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              Go to Drone Control
            </Text>
          </View>
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
  projectInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  projectName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: 24,
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
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  generateButton: {
    marginBottom: 12,
  },
  controlButton: {
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
