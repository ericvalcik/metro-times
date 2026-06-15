import { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type MetroTagProps = {
  type: `metro${'A' | 'B' | 'C'}`;
};

export const typeToColor: Record<MetroTagProps['type'], string> = {
  metroA: '#50AF32',
  metroB: '#FFD500',
  metroC: '#E63024',
};

const metroLineColor: Record<string, string> = {
  A: '#50AF32',
  B: '#FFD500',
  C: '#E63024',
};

const NEUTRAL_LINE_COLOR = '#9A9A9A';

/** Color for a single line tag, given the platform's traffic type. */
export const lineColor = (platformType: string, lineName: string): string => {
  if (platformType.startsWith('metro')) {
    return metroLineColor[lineName] ?? '#FFFFFF';
  }
  return NEUTRAL_LINE_COLOR;
};

const typeToName: Record<MetroTagProps['type'], string> = {
  metroA: 'Metro A',
  metroB: 'Metro B',
  metroC: 'Metro C',
};

export const MetroTag: FC<MetroTagProps> = ({ type }) => {
  const name = typeToName[type];
  const color = typeToColor[type];

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{name}</Text>
    </View>
  );
};

/** Compact line pill used on the Stations screen under each platform. */
export const LineTag: FC<{ name: string; platformType: string }> = ({
  name,
  platformType,
}) => {
  const color = lineColor(platformType, name);
  return (
    <View style={[lineTagStyles.tag, { borderColor: color }]}>
      <Text style={[lineTagStyles.label, { color }]}>{name}</Text>
    </View>
  );
};

const lineTagStyles = StyleSheet.create({
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'IBMPlexMono_600SemiBold',
  },
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 9999,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
});
