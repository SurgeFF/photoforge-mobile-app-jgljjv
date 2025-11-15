
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
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
import {
  djiConnect,
  djiDisconnect,
  djiStartMission,
  djiPauseMission,
  djiResumeMission,
  djiStopMission,
  djiReturnHome,
  djiManualControl,
} from "@/utils/apiClient";

interface DroneStatus {
  connected: boolean;
  model?: string;
  firmware?: string;
  battery?: number;
  gps_signal?: number;
  altitude?: number;
  speed?: number;
  missionActive?: boolean;
}

export default function DroneControlScreen() {
  const theme = useTheme();
  const [droneStatus, setDroneStatus] = useState<DroneStatus>({
    connected: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [missionId, setMissionId] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await djiConnect("wifi");
      if (result.success && result.data) {
        setDroneStatus({
          connected: true,
          model: result.data.model,
          firmware: result.data.firmware,
          battery: result.data.battery,
          gps_signal: result.data.gps_signal,
        });
        Alert.alert("Success", "Connected to drone successfully!");
      } else {
        Alert.alert("Error", result.error || "Failed to connect to drone");
      }
    } catch (error) {
      console.error("Connect error:", error);
      Alert.alert("Error", "Failed to connect to drone");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await djiDisconnect();
      if (result.success) {
        setDroneStatus({ connected: false });
        setMissionId(null);
        Alert.alert("Success", "Disconnected from drone");
      } else {
        Alert.alert("Error", result.error || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      Alert.alert("Error", "Failed to disconnect");
    }
  };

  const handleReturnHome = async () => {
    Alert.alert(
      "Return Home",
      "Command the drone to return to home point?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Return Home",
          onPress: async () => {
            try {
              const result = await djiReturnHome();
              if (result.success) {
                Alert.alert("Success", "Drone returning home");
              } else {
                Alert.alert("Error", result.error || "Failed to return home");
              }
            } catch (error) {
              console.error("Return home error:", error);
              Alert.alert("Error", "Failed to return home");
            }
          },
        },
      ]
    );
  };

  const handlePauseMission = async () => {
    try {
      const result = await djiPauseMission();
      if (result.success) {
        setDroneStatus({ ...droneStatus, missionActive: false });
        Alert.alert("Success", "Mission paused");
      } else {
        Alert.alert("Error", result.error || "Failed to pause mission");
      }
    } catch (error) {
      console.error("Pause mission error:", error);
      Alert.alert("Error", "Failed to pause mission");
    }
  };

  const handleResumeMission = async () => {
    try {
      const result = await djiResumeMission();
      if (result.success) {
        setDroneStatus({ ...droneStatus, missionActive: true });
        Alert.alert("Success", "Mission resumed");
      } else {
        Alert.alert("Error", result.error || "Failed to resume mission");
      }
    } catch (error) {
      console.error("Resume mission error:", error);
      Alert.alert("Error", "Failed to resume mission");
    }
  };

  const handleStopMission = async () => {
    Alert.alert(
      "Stop Mission",
      "Stop the current mission? The drone will hover in place.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await djiStopMission();
              if (result.success) {
                setDroneStatus({ ...droneStatus, missionActive: false });
                setMissionId(null);
                Alert.alert("Success", "Mission stopped");
              } else {
                Alert.alert("Error", result.error || "Failed to stop mission");
              }
            } catch (error) {
              console.error("Stop mission error:", error);
              Alert.alert("Error", "Failed to stop mission");
            }
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Drone Control</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <IconSymbol
              ios_icon_name="antenna.radiowaves.left.and.right"
              android_material_icon_name="settings_remote"
              size={32}
              color={droneStatus.connected ? colors.success : colors.textSecondary}
            />
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: droneStatus.connected
                    ? colors.success
                    : colors.textSecondary,
                },
              ]}
            />
          </View>
          <Text style={styles.statusTitle}>
            {droneStatus.connected ? "Connected" : "Disconnected"}
          </Text>
          {droneStatus.model && (
            <Text style={styles.statusSubtitle}>{droneStatus.model}</Text>
          )}
        </View>

        {droneStatus.connected && (
          <View style={styles.telemetryContainer}>
            <Text style={styles.sectionTitle}>Telemetry</Text>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryCard}>
                <IconSymbol
                  ios_icon_name="battery.100"
                  android_material_icon_name="battery_full"
                  size={24}
                  color={colors.success}
                />
                <Text style={styles.telemetryValue}>
                  {droneStatus.battery || 0}%
                </Text>
                <Text style={styles.telemetryLabel}>Battery</Text>
              </View>
              <View style={styles.telemetryCard}>
                <IconSymbol
                  ios_icon_name="location.fill"
                  android_material_icon_name="gps_fixed"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.telemetryValue}>
                  {droneStatus.gps_signal || 0}
                </Text>
                <Text style={styles.telemetryLabel}>GPS Signal</Text>
              </View>
              <View style={styles.telemetryCard}>
                <IconSymbol
                  ios_icon_name="arrow.up"
                  android_material_icon_name="height"
                  size={24}
                  color={colors.primaryDark}
                />
                <Text style={styles.telemetryValue}>
                  {droneStatus.altitude || 0}m
                </Text>
                <Text style={styles.telemetryLabel}>Altitude</Text>
              </View>
              <View style={styles.telemetryCard}>
                <IconSymbol
                  ios_icon_name="speedometer"
                  android_material_icon_name="speed"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.telemetryValue}>
                  {droneStatus.speed || 0} m/s
                </Text>
                <Text style={styles.telemetryLabel}>Speed</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Controls</Text>

          {!droneStatus.connected ? (
            <Button
              onPress={handleConnect}
              loading={isConnecting}
              disabled={isConnecting}
              style={styles.controlButton}
            >
              <View style={styles.buttonContent}>
                <IconSymbol
                  ios_icon_name="antenna.radiowaves.left.and.right"
                  android_material_icon_name="settings_remote"
                  size={24}
                  color={colors.surface}
                />
                <Text style={styles.buttonText}>
                  {isConnecting ? "Connecting..." : "Connect to Drone"}
                </Text>
              </View>
            </Button>
          ) : (
            <React.Fragment>
              {droneStatus.missionActive ? (
                <React.Fragment>
                  <Button
                    onPress={handlePauseMission}
                    style={styles.controlButton}
                  >
                    <View style={styles.buttonContent}>
                      <IconSymbol
                        ios_icon_name="pause.fill"
                        android_material_icon_name="pause"
                        size={24}
                        color={colors.surface}
                      />
                      <Text style={styles.buttonText}>Pause Mission</Text>
                    </View>
                  </Button>
                  <Button
                    onPress={handleStopMission}
                    variant="outline"
                    style={styles.controlButton}
                  >
                    <View style={styles.buttonContent}>
                      <IconSymbol
                        ios_icon_name="stop.fill"
                        android_material_icon_name="stop"
                        size={24}
                        color={colors.error}
                      />
                      <Text style={[styles.buttonText, { color: colors.error }]}>
                        Stop Mission
                      </Text>
                    </View>
                  </Button>
                </React.Fragment>
              ) : (
                <Button
                  onPress={handleResumeMission}
                  style={styles.controlButton}
                >
                  <View style={styles.buttonContent}>
                    <IconSymbol
                      ios_icon_name="play.fill"
                      android_material_icon_name="play_arrow"
                      size={24}
                      color={colors.surface}
                    />
                    <Text style={styles.buttonText}>Resume Mission</Text>
                  </View>
                </Button>
              )}

              <Button
                onPress={handleReturnHome}
                variant="outline"
                style={styles.controlButton}
              >
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="house.fill"
                    android_material_icon_name="home"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={[styles.buttonText, { color: colors.primary }]}>
                    Return Home
                  </Text>
                </View>
              </Button>

              <Button
                onPress={handleDisconnect}
                variant="outline"
                style={styles.controlButton}
              >
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={24}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.buttonText, { color: colors.textSecondary }]}
                  >
                    Disconnect
                  </Text>
                </View>
              </Button>
            </React.Fragment>
          )}
        </View>

        <View style={styles.infoBox}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            Make sure your DJI drone is powered on and in range before connecting.
          </Text>
        </View>
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
  statusCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statusHeader: {
    position: "relative",
    marginBottom: 16,
  },
  statusIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  telemetryContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  telemetryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  telemetryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
  },
  telemetryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  controlsSection: {
    marginBottom: 24,
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
    color: colors.surface,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
