/**
 * ConfirmacionCierreFlow Component
 *
 * Orchestrates the confirmation flow: Selfie → Processing → Success
 * Simplified version without signature (B7 v2)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { CameraCapture } from '@/components/Camera/CameraCapture';
import { COLORS, FONT_SIZES, SPACING } from '@/constants/theme';

type FlowStep = 'idle' | 'selfie' | 'procesando';

export type ConfirmacionCierreFlowProps = {
  visible: boolean;
  cierreId: string;
  cedula: string;
  onClose: () => void;
  onConfirm: (fotoBase64: string) => Promise<boolean>;
};

export const ConfirmacionCierreFlow: React.FC<ConfirmacionCierreFlowProps> = ({
  visible,
  cierreId,
  cedula,
  onClose,
  onConfirm,
}) => {
  const [step, setStep] = useState<FlowStep>('idle');

  /**
   * Start the flow when modal becomes visible
   */
  React.useEffect(() => {
    if (visible) {
      setStep('selfie');
    } else {
      setStep('idle');
    }
  }, [visible]);

  /**
   * Handle selfie captured - directly process confirmation
   */
  const handleSelfieCapture = useCallback(
    async (_uri: string, base64: string) => {
      setStep('procesando');

      try {
        const success = await onConfirm(base64);

        if (success) {
          onClose();
        } else {
          setStep('selfie');
        }
      } catch (error) {
        console.error('[ConfirmacionCierreFlow] Error:', error);
        setStep('selfie');
      }
    },
    [onConfirm, onClose]
  );

  /**
   * Handle close at any step
   */
  const handleClose = useCallback(() => {
    setStep('idle');
    onClose();
  }, [onClose]);

  // Don't render anything if not visible
  if (!visible) return null;

  return (
    <>
      {/* Step 1: Selfie */}
      <CameraCapture
        visible={step === 'selfie'}
        onClose={handleClose}
        onCapture={handleSelfieCapture}
        title="Selfie de Confirmación"
      />

      {/* Step 2: Processing */}
      <Modal
        visible={step === 'procesando'}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingTitle}>Confirmando cierre...</Text>
            <Text style={styles.processingSubtitle}>
              Subiendo foto de confirmación
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  processingTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  processingSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});

export default ConfirmacionCierreFlow;
