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
