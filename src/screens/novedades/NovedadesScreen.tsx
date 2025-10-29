import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import NovedadesList from '../../components/novedades/NovedadesList';
import useNovedades from '../../hooks/useNovedades';
import type { Novedad, EstadoNovedad } from '../../services/novedadesService';

const initialLayout = { width: Dimensions.get('window').width };

const NovedadesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { novedades, loading, estadisticas, cargarNovedades } = useNovedades();

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'todas', title: 'Todas' },
    { key: 'pendientes', title: 'Pendientes' },
    { key: 'aprobadas', title: 'Aprobadas' },
    { key: 'rechazadas', title: 'Rechazadas' },
  ]);

  const handleNovedadPress = (novedad: Novedad) => {
    navigation.navigate('DetalleNovedad' as never, { novedadId: novedad.id } as never);
  };

  const handleRefresh = async () => {
    await cargarNovedades();
  };

  const handleCrearNovedad = () => {
    navigation.navigate('CrearNovedad' as never);
  };

  const renderScene = ({ route }: { route: { key: string } }) => {
    let filtro: EstadoNovedad | undefined;

    switch (route.key) {
      case 'pendientes':
        filtro = 'pendiente';
        break;
      case 'aprobadas':
        filtro = 'aprobada';
        break;
      case 'rechazadas':
        filtro = 'rechazada';
        break;
      default:
        filtro = undefined;
    }

    return (
      <NovedadesList
        novedades={novedades}
        onNovedadPress={handleNovedadPress}
        filtroEstado={filtro}
        refreshing={loading}
        onRefresh={handleRefresh}
        loading={loading && novedades.length === 0}
      />
    );
  };

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      tabStyle={styles.tab}
      labelStyle={styles.tabLabel}
      activeColor="#059669"
      inactiveColor="#374151"
      scrollEnabled
      renderBadge={({ route }) => {
        let count = 0;
        switch (route.key) {
          case 'todas':
            count = estadisticas.total;
            break;
          case 'pendientes':
            count = estadisticas.pendientes;
            break;
          case 'aprobadas':
            count = estadisticas.aprobadas;
            break;
          case 'rechazadas':
            count = estadisticas.rechazadas;
            break;
        }

        if (count === 0) return null;

        return (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        );
      }}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header con estadísticas resumidas */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Mis Novedades</Text>
            <Text style={styles.subtitle}>
              Reporta excepciones de horario
            </Text>
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
            <MaterialCommunityIcons name="check-circle" size={20} color="#059669" />
            <View style={styles.statText}>
              <Text style={styles.statValue}>{estadisticas.aprobadas}</Text>
              <Text style={styles.statLabel}>Aprobadas</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
            <View style={styles.statText}>
              <Text style={styles.statValue}>{estadisticas.rechazadas}</Text>
              <Text style={styles.statLabel}>Rechazadas</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs con listas */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={initialLayout}
        renderTabBar={renderTabBar}
      />

      {/* FAB para crear novedad */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCrearNovedad}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
    minWidth: 80,
    paddingHorizontal: 8,
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
  badge: {
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
  badgeText: {
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
