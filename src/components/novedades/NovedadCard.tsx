import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NovedadStatusBadge from './NovedadStatusBadge';
import { TIPOS_NOVEDAD_LABELS, type Novedad } from '../../services/novedadesService';

interface NovedadCardProps {
  novedad: Novedad;
  onPress: () => void;
}

const NovedadCard: React.FC<NovedadCardProps> = ({ novedad, onPress }) => {
  const truncateText = (text: string, maxLength: number = 80): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getTipoIcon = (): keyof typeof MaterialCommunityIcons.glyphMap => {
    // Now only ajuste_marcaje is supported
    return 'clock-edit-outline';
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name={getTipoIcon()}
            size={24}
            color="#059669"
          />
          <View style={styles.headerText}>
            <Text style={styles.fecha}>
              {format(parseISO(novedad.fecha), "d 'de' MMMM", { locale: es })}
            </Text>
            <Text style={styles.tipo}>
              {TIPOS_NOVEDAD_LABELS[novedad.tipo_novedad]}
            </Text>
          </View>
        </View>
        <NovedadStatusBadge estado={novedad.estado} />
      </View>

      <Text style={styles.motivo} numberOfLines={2}>
        {truncateText(novedad.motivo)}
      </Text>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
          <Text style={styles.footerText}>
            {format(parseISO(novedad.created_at), "d MMM, HH:mm", { locale: es })}
          </Text>
        </View>

        {/* Location removed - no longer tracked */}
      </View>

      {novedad.comentarios_revision && (
        <View style={styles.comentarios}>
          <MaterialCommunityIcons name="message-text" size={14} color="#059669" />
          <Text style={styles.comentariosText} numberOfLines={1}>
            {truncateText(novedad.comentarios_revision, 60)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  fecha: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tipo: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  motivo: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  comentarios: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  comentariosText: {
    fontSize: 12,
    color: '#059669',
    flex: 1,
  },
});

export default NovedadCard;
