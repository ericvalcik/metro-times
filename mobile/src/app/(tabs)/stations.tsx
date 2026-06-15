import { FlashList } from '@shopify/flash-list';
import React, { FC, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LineTag } from '@/components/Tag';
import { allStops, CompactPlatform, CompactStop } from '@/data/stops';
import {
  GroupSelectionState,
  useSelectedStops,
} from '@/hooks/use-selected-stops';

// Diacritic-insensitive search so "namesti" matches "Náměstí".
const CZ_DIACRITICS: Record<string, string> = {
  á: 'a', č: 'c', ď: 'd', é: 'e', ě: 'e', í: 'i', ň: 'n',
  ó: 'o', ř: 'r', š: 's', ť: 't', ú: 'u', ů: 'u', ý: 'y', ž: 'z',
};
const normalize = (s: string): string =>
  s.toLowerCase().replace(/[áčďéěíňóřšťúůýž]/g, (c) => CZ_DIACRITICS[c] ?? c);

type Row =
  | { kind: 'group'; group: CompactStop }
  | { kind: 'platform'; group: CompactStop; platform: CompactPlatform };

export default function StationsScreen() {
  const [query, setQuery] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { isGroupSelected } = useSelectedStops();

  const filteredGroups = useMemo(() => {
    const q = normalize(query.trim());
    return allStops.filter((group) => {
      if (q && !normalize(group.name).includes(q)) return false;
      if (showSelectedOnly && isGroupSelected(group.id) === 'none') return false;
      return true;
    });
  }, [query, showSelectedOnly, isGroupSelected]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const group of filteredGroups) {
      out.push({ kind: 'group', group });
      if (expanded.has(group.id)) {
        for (const platform of group.stops) {
          out.push({ kind: 'platform', group, platform });
        }
      }
    }
    return out;
  }, [filteredGroups, expanded]);

  const toggleExpand = (groupId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Stations</Text>
        <TextInput
          style={styles.search}
          placeholder="Search stops"
          placeholderTextColor="#666666"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Selected only</Text>
          <Switch
            value={showSelectedOnly}
            onValueChange={setShowSelectedOnly}
            trackColor={{ false: '#333333', true: '#50AF32' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <FlashList
        data={rows}
        keyExtractor={(item) =>
          item.kind === 'group'
            ? `g:${item.group.id}`
            : `p:${item.group.id}:${item.platform.id}`
        }
        getItemType={(item) => item.kind}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) =>
          item.kind === 'group' ? (
            <StopGroupRow
              group={item.group}
              expanded={expanded.has(item.group.id)}
              onToggleExpand={() => toggleExpand(item.group.id)}
            />
          ) : (
            <PlatformRow group={item.group} platform={item.platform} />
          )
        }
        ListEmptyComponent={<Text style={styles.empty}>No stops found.</Text>}
      />
    </SafeAreaView>
  );
}

const StopGroupRow: FC<{
  group: CompactStop;
  expanded: boolean;
  onToggleExpand: () => void;
}> = ({ group, expanded, onToggleExpand }) => {
  const { isGroupSelected, toggleGroup } = useSelectedStops();
  const state = isGroupSelected(group.id);

  return (
    <Pressable
      style={styles.groupRow}
      onPress={onToggleExpand}
      accessibilityRole="button">
      <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      <Pressable
        onPress={() => toggleGroup(group.id)}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state === 'all' }}>
        <Checkbox state={state} />
      </Pressable>
      <Text style={styles.groupName} numberOfLines={1}>
        {group.name}
      </Text>
    </Pressable>
  );
};

const PlatformRow: FC<{ group: CompactStop; platform: CompactPlatform }> = ({
  group,
  platform,
}) => {
  const { isPlatformSelected, togglePlatform } = useSelectedStops();
  const checked = isPlatformSelected(group.id, platform.id);

  return (
    <Pressable
      style={styles.platformRow}
      onPress={() => togglePlatform(group.id, platform.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}>
      <Checkbox state={checked ? 'all' : 'none'} />
      <Text style={styles.platformLabel}>Platform {platform.platform}</Text>
      <View style={styles.lineTags}>
        {platform.lines.map((line) => (
          <LineTag key={line} name={line} platformType={platform.type} />
        ))}
      </View>
    </Pressable>
  );
};

const Checkbox: FC<{ state: GroupSelectionState }> = ({ state }) => (
  <View style={[styles.checkbox, state === 'all' && styles.checkboxFilled]}>
    {state === 'all' && <Text style={styles.checkboxCheck}>✓</Text>}
    {state === 'some' && <View style={styles.checkboxDash} />}
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'IBMPlexMono_700Bold',
  },
  search: {
    backgroundColor: '#131313',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'IBMPlexMono_400Regular',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'IBMPlexMono_400Regular',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222222',
  },
  chevron: {
    color: '#888888',
    fontSize: 14,
    width: 14,
    textAlign: 'center',
  },
  groupName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'IBMPlexMono_500Medium',
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 42,
    backgroundColor: '#0A0A0A',
  },
  platformLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'IBMPlexMono_400Regular',
  },
  lineTags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#555555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxFilled: {
    backgroundColor: '#50AF32',
    borderColor: '#50AF32',
  },
  checkboxCheck: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  checkboxDash: {
    width: 10,
    height: 2,
    backgroundColor: '#888888',
  },
  empty: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 32,
    fontFamily: 'IBMPlexMono_400Regular',
  },
});
