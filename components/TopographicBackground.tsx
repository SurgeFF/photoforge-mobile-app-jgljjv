
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

export default function TopographicBackground() {
  // Generate topographic-style contour lines with more organic patterns
  const generateContourPath = (yOffset: number, amplitude: number, frequency: number, phase: number = 0) => {
    const points = [];
    const steps = 80;
    
    for (let i = 0; i <= steps; i++) {
      const x = (width / steps) * i;
      const t = i / steps;
      // Create more complex wave patterns
      const wave1 = Math.sin((t * Math.PI * frequency) + phase) * amplitude;
      const wave2 = Math.sin((t * Math.PI * frequency * 2) + phase * 1.5) * (amplitude * 0.3);
      const y = yOffset + wave1 + wave2;
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    
    return points.join(' ');
  };

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} style={styles.svg}>
        <Defs>
          {/* Main background gradient - warm tones */}
          <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.backgroundLight} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.backgroundWarm} stopOpacity="1" />
          </LinearGradient>
          
          {/* Subtle overlay gradient */}
          <LinearGradient id="overlayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.backgroundLight} stopOpacity="0.3" />
            <Stop offset="50%" stopColor={colors.backgroundWarm} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={colors.backgroundLight} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>
        
        {/* Background gradient fill */}
        <Path
          d={`M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`}
          fill="url(#bgGrad)"
        />
        
        {/* Topographic contour lines - primary layer */}
        {[...Array(20)].map((_, index) => {
          const yOffset = (height / 19) * index;
          const amplitude = 15 + Math.sin(index * 0.4) * 10;
          const frequency = 2.5 + Math.cos(index * 0.3) * 0.8;
          const phase = index * 0.5;
          
          return (
            <Path
              key={`contour-${index}`}
              d={generateContourPath(yOffset, amplitude, frequency, phase)}
              stroke={colors.accentBorder}
              strokeWidth={index % 3 === 0 ? 1.5 : 0.8}
              strokeOpacity={index % 3 === 0 ? 0.25 : 0.15}
              fill="none"
            />
          );
        })}
        
        {/* Secondary contour lines - offset pattern */}
        {[...Array(15)].map((_, index) => {
          const yOffset = (height / 14) * index + 25;
          const amplitude = 20 + Math.cos(index * 0.6) * 12;
          const frequency = 3 + Math.sin(index * 0.4) * 1;
          const phase = index * 0.7 + Math.PI / 4;
          
          return (
            <Path
              key={`contour-sec-${index}`}
              d={generateContourPath(yOffset, amplitude, frequency, phase)}
              stroke={colors.primary}
              strokeWidth={0.5}
              strokeOpacity={0.08}
              fill="none"
            />
          );
        })}
        
        {/* Tertiary fine detail lines */}
        {[...Array(25)].map((_, index) => {
          const yOffset = (height / 24) * index + 10;
          const amplitude = 8 + Math.sin(index * 0.8) * 5;
          const frequency = 4 + Math.cos(index * 0.5) * 1.5;
          const phase = index * 0.3;
          
          return (
            <Path
              key={`detail-${index}`}
              d={generateContourPath(yOffset, amplitude, frequency, phase)}
              stroke={colors.textSecondary}
              strokeWidth={0.3}
              strokeOpacity={0.06}
              fill="none"
            />
          );
        })}
        
        {/* Subtle elevation markers (dots) */}
        {[...Array(30)].map((_, index) => {
          const x = (Math.random() * width);
          const y = (Math.random() * height);
          const size = Math.random() * 2 + 0.5;
          
          return (
            <Circle
              key={`marker-${index}`}
              cx={x}
              cy={y}
              r={size}
              fill={colors.accentBorder}
              opacity={0.1}
            />
          );
        })}
        
        {/* Overlay gradient for depth */}
        <Path
          d={`M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`}
          fill="url(#overlayGrad)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  svg: {
    position: 'absolute',
  },
});
