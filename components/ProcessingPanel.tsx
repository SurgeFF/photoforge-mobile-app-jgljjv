
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import Button from "@/components/button";

interface ProcessingPanelProps {
  jobId?: string;
  status: "idle" | "processing" | "completed" | "failed";
  progress?: number;
  stage?: string;
  estimatedTimeRemaining?: string;
  onStartProcessing?: () => void;
  onViewResults?: () => void;
}

export default function ProcessingPanel({
  jobId,
  status,
  progress = 0,
  stage = "",
  estimatedTimeRemaining,
  onStartProcessing,
  onViewResults,
}: ProcessingPanelProps) {
  const [currentStage, setCurrentStage] = useState(stage);

  useEffect(() => {
    if (stage) {
      setCurrentStage(stage);
    }
  }, [stage]);

  const getStatusIcon = () => {
    switch (status) {
      case "processing":
        return (
          <ActivityIndicator size="large" color={colors.primary} />
        );
      case "completed":
        return (
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check_circle"
            size={48}
            color={colors.success}
          />
        );
      case "failed":
        return (
          <IconSymbol
            ios_icon_name="xmark.circle.fill"
            android_material_icon_name="error"
            size={48}
            color={colors.error}
          />
        );
      default:
        return (
          <IconSymbol
            ios_icon_name="cube.transparent"
            android_material_icon_name="view_in_ar"
            size={48}
            color={colors.primary}
          />
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "processing":
        return "Processing 3D Model";
      case "completed":
        return "Processing Complete!";
      case "failed":
        return "Processing Failed";
      default:
        return "Ready to Process";
    }
  };

  const getStageText = () => {
    const stages: { [key: string]: string } = {
      uploading: "Uploading images to cloud...",
      aligning: "Aligning images...",
      reconstructing: "Reconstructing 3D structure...",
      meshing: "Generating 3D mesh...",
      texturing: "Applying textures...",
      finalizing: "Finalizing output...",
    };
    return stages[currentStage] || currentStage;
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <View style={styles.iconContainer}>{getStatusIcon()}</View>
        
        <Text style={styles.statusText}>{getStatusText()}</Text>

        {status === "processing" && (
          <>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>

            {currentStage && (
              <View style={styles.stageContainer}>
                <IconSymbol
                  ios_icon_name="gearshape.fill"
                  android_material_icon_name="settings"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.stageText}>{getStageText()}</Text>
              </View>
            )}

            {estimatedTimeRemaining && (
              <View style={styles.timeContainer}>
                <IconSymbol
                  ios_icon_name="clock.fill"
                  android_material_icon_name="schedule"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.timeText}>
                  Est. time remaining: {estimatedTimeRemaining}
                </Text>
              </View>
            )}

            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle"
                android_material_icon_name="info"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.infoText}>
                You can leave this page. We&apos;ll notify you when processing is complete.
              </Text>
            </View>
          </>
        )}

        {status === "completed" && (
          <Button onPress={onViewResults} style={styles.actionButton}>
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="eye.fill"
                android_material_icon_name="visibility"
                size={20}
                color={colors.surface}
              />
              <Text style={styles.buttonText}>View Results</Text>
            </View>
          </Button>
        )}

        {status === "failed" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Processing failed. Please try again or contact support.
            </Text>
            <Button
              onPress={onStartProcessing}
              variant="outline"
              style={styles.retryButton}
            >
              Retry Processing
            </Button>
          </View>
        )}

        {status === "idle" && onStartProcessing && (
          <Button onPress={onStartProcessing} style={styles.actionButton}>
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="play.fill"
                android_material_icon_name="play_arrow"
                size={20}
                color={colors.surface}
              />
              <Text style={styles.buttonText}>Start Processing</Text>
            </View>
          </Button>
        )}
      </View>

      {jobId && (
        <View style={styles.jobIdContainer}>
          <Text style={styles.jobIdLabel}>Job ID:</Text>
          <Text style={styles.jobIdText}>{jobId}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  stageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  stageText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorBox: {
    width: "100%",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
    marginBottom: 16,
  },
  actionButton: {
    width: "100%",
  },
  retryButton: {
    width: "100%",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.surface,
  },
  jobIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
  },
  jobIdLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  jobIdText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: colors.textPrimary,
  },
});
