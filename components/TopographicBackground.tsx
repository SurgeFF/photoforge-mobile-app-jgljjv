
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function TopographicBackground() {
  // Generate topographic-style contour lines
  const generateContourPath = (yOffset: number, amplitude: number, frequency: number) => {
    const points = [];
    const steps = 50;
    
    for (let i = 0; i <= steps; i++) {
      const x = (width / steps) * i;
      const y = yOffset + Math.sin((i / steps) * Math.PI * frequency) * amplitude;
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    
    return points.join(' ');
  };

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} style={styles.svg}>
        <Defs>
          <LinearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#1a1f3a" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0f1419" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* Background gradient */}
        <Path
          d={`M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`}
          fill="url(#grad1)"
        />
        
        {/* Topographic contour lines */}
        {[...Array(15)].map((_, index) => {
          const yOffset = (height / 14) * index;
          const amplitude = 20 + Math.sin(index * 0.5) * 15;
          const frequency = 2 + Math.cos(index * 0.3) * 1;
          
          return (
            <Path
              key={index}
              d={generateContourPath(yOffset, amplitude, frequency)}
              stroke={`rgba(100, 181, 246, ${0.05 + (index % 3) * 0.02})`}
              strokeWidth={1 + (index % 2)}
              fill="none"
            />
          );
        })}
        
        {/* Additional decorative lines */}
        {[...Array(8)].map((_, index) => {
          const yOffset = (height / 7) * index + 30;
          const amplitude = 30 + Math.cos(index * 0.7) * 20;
          const frequency = 3 + Math.sin(index * 0.4) * 1.5;
          
          return (
            <Path
              key={`dec-${index}`}
              d={generateContourPath(yOffset, amplitude, frequency)}
              stroke={`rgba(25, 60, 184, ${0.03 + (index % 2) * 0.02})`}
              strokeWidth={0.5}
              fill="none"
            />
          );
        })}
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
