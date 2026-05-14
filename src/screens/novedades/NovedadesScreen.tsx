import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { TabView, TabBar } from 'react-native-tab-view';
import NovedadesList from '../../components/novedades/NovedadesList';
import useNovedades from '../../hooks/useNovedades';
import type {
  AjusteEstado,
  EstadoNovedad,
  InfraccionEstado,
  Novedad,
  TipoNovedad,
} from '../../services/novedadesService';
import type { NovedadesStackParamList } from '../../types/navigation.types';

const initialLayout = { width: Dimensions.get('window').width };

type NovedadesNavigationProp = StackNavigationProp<NovedadesStackParamList, 'NovedadesList'>;

type TabKey = 'solicitudes' | 'infracciones';

const AJUSTE_CHIPS: Array<{ key: AjusteEstado | 'todas'; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'aprobada', label: 'Aprobadas' },
  { key: 'rechazada', label: 'Rechazadas' },
];

const INFRACCION_CHIPS: Array<{ key: InfraccionEstado | 'todas'; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'abierta', label: 'Abiertas' },
  { key: 'revisada', label: 'Revisadas' },
];

const filtrarPorTipo = (novedades: Novedad[], tipo: TipoNovedad): Novedad[] =>
  novedades.filter((n) => n.tipo_novedad === tipo);

const NovedadesScreen: React.FC = () => {
  const navigation = useNavigation<NovedadesNavigationProp>();
  const { novedades, loading, isOffline, estadisticas, cargarNovedades } = useNovedades();

  const [tabIndex, setTabIndex] = useState(0);
  const [chipAjuste, setChipAjuste] = useState<AjusteEstado | 'todas'>('todas');
  const [chipInfraccion, setChipInfraccion] = useState<InfraccionEstado | 'todas'>('todas');

  const routes: Array<{ key: TabKey; title: string }> = [
    { key: 'solicitudes', title: 'Solicitudes' },
    { key: 'infracciones', title: 'Infracciones' },
  ];

  const solicitudes = useMemo(() => filtrarPorTipo(novedades, 'ajuste_marcaje'), [novedades]);
  const infracciones = useMemo(() => filtrarPorTipo(novedades, 'exceso_tope_diario'), [novedades]);

  // Filtrado final por chip (estado). Single source of truth: el screen filtra ambas dimensiones
  // (tipo + estado) y pasa una lista lista para renderizar.
  const solicitudesFiltradas = useMemo(
    () => (chipAjuste === 'todas' ? solicitudes : solicitudes.filter((n) => n.estado === chipAjuste)),
    [solicitudes, chipAjuste],
  );
  const infraccionesFiltradas = useMemo(
    () => (chipInfraccion === 'todas' ? infracciones : infracciones.filter((n) => n.estado === chipInfraccion)),
    [infracciones, chipInfraccion],
  );

  const handleNovedadPress = (novedad: Novedad) => {
    navigation.navigate('DetalleNovedad', { novedadId: novedad.id });
  };

  const handleRefresh = async () => {
    await cargarNovedades();
  };

  const handleCrearNovedad = () => {
    navigation.navigate('CrearNovedad');
  };

  const renderChips = (
    chips: ReadonlyArray<{ key: string; label: string }>,
    selected: string,
    onSelect: (key: string) => void,
  ) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsRow}
    >
      {chips.map((chip) => {
        const isActive = chip.key === selected;
        return (
          <TouchableOpacity
            key={chip.key}
            onPress={() => onSelect(chip.key)}
            style={[styles.chip, isActive && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderScene = ({ route }: { route: { key: string } }) => {
    if (route.key === 'solicitudes') {
      const emptyEstado: EstadoNovedad | undefined = chipAjuste === 'todas' ? undefined : chipAjuste;
      return (
        <View style={styles.sceneContainer}>
          {renderChips(AJUSTE_CHIPS, chipAjuste, (k) => setChipAjuste(k as AjusteEstado | 'todas'))}
          <NovedadesList
            novedades={solicitudesFiltradas}
            onNovedadPress={handleNovedadPress}
            emptyEstado={emptyEstado}
            refreshing={loading}
            onRefresh={handleRefresh}
            loading={loading && solicitudesFiltradas.length === 0}
            isOffline={isOffline}
          />
        </View>
      );
    }

    const emptyEstado: EstadoNovedad | undefined =
      chipInfraccion === 'todas' ? undefined : chipInfraccion;
    return (
      <View style={styles.sceneContainer}>
        {renderChips(INFRACCION_CHIPS, chipInfraccion, (k) =>
          setChipInfraccion(k as InfraccionEstado | 'todas'),
        )}
        <NovedadesList
          novedades={infraccionesFiltradas}
          onNovedadPress={handleNovedadPress}
          emptyEstado={emptyEstado}
          refreshing={loading}
          onRefresh={handleRefresh}
          loading={loading && infraccionesFiltradas.length === 0}
          isOffline={isOffline}
        />
      </View>
    );
  };

  // react-native-tab-view v4 cambio shape de varios props de TabBar;
  // el repo ya usaba any aca y replicamos el patron para mantener consistencia.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      tabStyle={styles.tab}
      labelStyle={styles.tabLabel}
      activeColor="#059669"
      inactiveColor="#374151"
      renderBadge={({ route }: { route: { key: string } }) => {
        const count =
          route.key === 'solicitudes' ? solicitudes.length : infracciones.length;
        if (count === 0) return null;
        return (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        );
      }}
    />
  );

  const enTabSolicitudes = routes[tabIndex]?.key === 'solicitudes';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Mis Novedades</Text>
            <Text style={styles.subtitle}>Solicitudes e infracciones</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="clock-alert" size={20} color="#F59E0B" />
            <View style={styles.statText}>
              <Text style={styles.statValue}>{estadisticas.pendientes}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
            <View style={styles.statText}>
              <Text style={styles.statValue}>{estadisticas.abiertas}</Text>
              <Text style={styles.statLabel}>Abiertas</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="file-document-multiple" size={20} color="#6B7280" />
            <View style={styles.statText}>
              <Text style={styles.statValue}>{estadisticas.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>
      </View>

      <TabView
        navigationState={{ index: tabIndex, routes }}
        renderScene={renderScene}
        onIndexChange={setTabIndex}
        initialLayout={initialLayout}
        renderTabBar={renderTabBar}
        lazy
      />

      {enTabSolicitudes && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCrearNovedad}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  sceneContainer: {
    flex: 1,
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 48,
  },
  tab: {
    width: 'auto',
  },
  tabIndicator: {
    backgroundColor: '#059669',
    height: 3,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'none',
  },
  tabBadge: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginTop: -2,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default NovedadesScreen;
