
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import Button from "@/components/button";

interface ProcessedModel {
  id: string;
  name: string;
  thumbnail_url?: string;
  format?: string;
  file_size?: number;
  poly_count?: number;
  resolution?: string;
  created_at: string;
  coordinate_system?: string;
  download_urls?: {
    mesh?: string;
    textures?: string;
    point_cloud?: string;
    orthomosaic?: string;
  };
}

interface ModelsListProps {
  models: ProcessedModel[];
  onModelPress?: (model: ProcessedModel) => void;
  onDownload?: (model: ProcessedModel, type: string) => void;
}

export default function ModelsList({
  models,
  onModelPress,
  onDownload,
}: ModelsListProps) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const formatPolyCount = (count?: number) => {
    if (!count) return "N/A";
    if (count > 1000000) {
      return `${(count / 1000000).toFixed(2)}M`;
    }
    if (count > 1000) {
      return `${(count / 1000).toFixed(2)}K`;
    }
    return count.toString();
  };

  const renderModel = ({ item }: { item: ProcessedModel }) => (
    <Pressable
      style={styles.modelCard}
      onPress={() => onModelPress?.(item)}
    >
      <View style={styles.thumbnailContainer}>
        {item.thumbnail_url ? (
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <IconSymbol
              ios_icon_name="cube.fill"
              android_material_icon_name="view_in_ar"
              size={48}
              color={colors.textSecondary}
            />
          </View>
        )}
        {item.format && (
          <View style={styles.formatBadge}>
            <Text style={styles.formatText}>{item.format.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.modelInfo}>
        <Text style={styles.modelName} numberOfLines={1}>
          {item.name}
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <IconSymbol
              ios_icon_name="doc.fill"
              android_material_icon_name="description"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.statText}>{formatFileSize(item.file_size)}</Text>
          </View>
          <View style={styles.stat}>
            <IconSymbol
              ios_icon_name="triangle.fill"
              android_material_icon_name="change_history"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.statText}>{formatPolyCount(item.poly_count)}</Text>
          </View>
          {item.resolution && (
            <View style={styles.stat}>
              <IconSymbol
                ios_icon_name="viewfinder"
                android_material_icon_name="aspect_ratio"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.statText}>{item.resolution}</Text>
            </View>
          )}
        </View>

        {item.coordinate_system && (
          <View style={styles.coordinateRow}>
            <IconSymbol
              ios_icon_name="globe"
              android_material_icon_name="public"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.coordinateText}>
              {item.coordinate_system && item.coordinate_system.toUpperCase ? item.coordinate_system.toUpperCase() : item.coordinate_system}
            </Text>
          </View>
        )}

        {item.download_urls && (
          <View style={styles.downloadButtons}>
            {item.download_urls.mesh && (
              <Pressable
                style={styles.downloadButton}
                onPress={() => onDownload?.(item, "mesh")}
              >
                <IconSymbol
                  ios_icon_name="arrow.down.circle"
                  android_material_icon_name="download"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.downloadText}>Mesh</Text>
              </Pressable>
            )}
            {item.download_urls.textures && (
              <Pressable
                style={styles.downloadButton}
                onPress={() => onDownload?.(item, "textures")}
              >
                <IconSymbol
                  ios_icon_name="arrow.down.circle"
                  android_material_icon_name="download"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.downloadText}>Textures</Text>
              </Pressable>
            )}
            {item.download_urls.point_cloud && (
              <Pressable
                style={styles.downloadButton}
                onPress={() => onDownload?.(item, "point_cloud")}
              >
                <IconSymbol
                  ios_icon_name="arrow.down.circle"
                  android_material_icon_name="download"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.downloadText}>Point Cloud</Text>
              </Pressable>
            )}
            {item.download_urls.orthomosaic && (
              <Pressable
                style={styles.downloadButton}
                onPress={() => onDownload?.(item, "orthomosaic")}
              >
                <IconSymbol
                  ios_icon_name="arrow.down.circle"
                  android_material_icon_name="download"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.downloadText}>Orthomosaic</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );

  if (models.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol
          ios_icon_name="cube.transparent"
          android_material_icon_name="view_in_ar"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>No processed models yet</Text>
        <Text style={styles.emptySubtext}>
          Upload images and start processing to see your 3D models here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Processed Models ({models.length})</Text>
      <FlatList
        data={models}
        renderItem={renderModel}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  listContainer: {
    gap: 16,
  },
  modelCard: {
    backgroundColor: colors.surface + "99",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  thumbnailContainer: {
    width: "100%",
    height: 200,
    backgroundColor: colors.backgroundLight,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  formatBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  formatText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.surface,
  },
  modelInfo: {
    padding: 16,
  },
  modelName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  coordinateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  coordinateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  downloadButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  downloadText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
});
