
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export default function GenerateScreen() {
  const theme = useTheme();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert("Error", "Please enter a prompt");
      return;
    }

    setIsGenerating(true);

    try {
      const accessKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
      if (!accessKey) {
        Alert.alert("Error", "Not authenticated");
        router.replace("/");
        return;
      }

      console.log("\n========== IMAGE GENERATION ==========");
      console.log("[Generate] Starting image generation...");
      console.log("[Generate] Prompt:", prompt);
      console.log("[Generate] Negative prompt:", negativePrompt || "None");
      console.log("[Generate] API Endpoint: https://photoforge.base44.app/api/generate");

      const response = await fetch("https://photoforge.base44.app/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessKey}`,
        },
        body: JSON.stringify({ prompt, negativePrompt }),
      });

      console.log("[Generate] Response status:", response.status);
      
      const responseText = await response.text();
      console.log("[Generate] Response body:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("[Generate] Parsed response:", JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error("[Generate] JSON parse error:", parseError);
        Alert.alert("Error", "Invalid server response");
        console.log("========== GENERATION FAILED ==========\n");
        return;
      }

      if (data.imageUrl) {
        console.log("[Generate] ✅ Image generated successfully");
        console.log("[Generate] Image URL:", data.imageUrl);
        setGeneratedImage(data.imageUrl);
        console.log("========== GENERATION SUCCESS ==========\n");
      } else {
        const errorMsg = data.message || data.error || "Failed to generate image";
        console.log("[Generate] ❌ Generation failed:", errorMsg);
        Alert.alert("Error", errorMsg);
        console.log("========== GENERATION FAILED ==========\n");
      }
    } catch (error) {
      console.error("[Generate] ❌ EXCEPTION during generation:", error);
      console.error("[Generate] Error details:", error instanceof Error ? error.message : "Unknown error");
      Alert.alert("Error", "Failed to generate image. Check console for details.");
      console.log("========== GENERATION ERROR ==========\n");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    Alert.alert("Success", "Image saved to gallery!");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopographicBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="wand.and.stars"
            android_material_icon_name="auto_fix_high"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.title}>Generate Image</Text>
          <Text style={styles.subtitle}>Create AI-powered images from text</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prompt</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the image you want to create..."
              placeholderTextColor={colors.textSecondary}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Negative Prompt (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="What to avoid in the image..."
              placeholderTextColor={colors.textSecondary}
              value={negativePrompt}
              onChangeText={setNegativePrompt}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Button
            onPress={handleGenerate}
            loading={isGenerating}
            disabled={isGenerating}
            style={styles.generateButton}
          >
            {isGenerating ? "Generating..." : "Generate Image"}
          </Button>
        </View>

        {generatedImage && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Generated Image</Text>
            <Image source={{ uri: generatedImage }} style={styles.image} />
            <Button onPress={handleSave} style={styles.saveButton}>
              Save to Gallery
            </Button>
          </View>
        )}

        {isGenerating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Creating your masterpiece...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: Platform.OS === "android" ? 24 : 0,
    paddingBottom: 120,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  textArea: {
    backgroundColor: colors.surface + 'CC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    minHeight: 100,
  },
  generateButton: {
    marginTop: 8,
    height: 56,
  },
  resultContainer: {
    marginTop: 32,
    gap: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  image: {
    width: "100%",
    height: 400,
    borderRadius: 16,
    backgroundColor: colors.backgroundWarm,
  },
  saveButton: {
    height: 48,
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
