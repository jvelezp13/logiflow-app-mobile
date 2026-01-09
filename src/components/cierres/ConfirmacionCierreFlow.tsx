/**
 * ConfirmacionCierreFlow Component
 *
 * Orchestrates the confirmation flow: Selfie → Signature → Processing → Success
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
import { SignatureCapture } from '@/components/Signature';
import { COLORS, FONT_SIZES, SPACING } from '@/constants/theme';

type FlowStep = 'idle' | 'selfie' | 'firma' | 'procesando';

export type ConfirmacionCierreFlowProps = {
  visible: boolean;
  cierreId: string;
  cedula: string;
  onClose: () => void;
  onConfirm: (fotoBase64: string, firmaBase64: string) => Promise<boolean>;
};

export const ConfirmacionCierreFlow: React.FC<ConfirmacionCierreFlowProps> = ({
  visible,
  cierreId,
  cedula,
  onClose,
  onConfirm,
}) => {
  const [step, setStep] = useState<FlowStep>('idle');
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);

  /**
   * Start the flow when modal becomes visible
   */
  React.useEffect(() => {
    if (visible) {
      setStep('selfie');
      setSelfieBase64(null);
    } else {
      setStep('idle');
      setSelfieBase64(null);
    }
  }, [visible]);

  /**
   * Handle selfie captured
   */
  const handleSelfieCapture = useCallback((_uri: string, base64: string) => {
    setSelfieBase64(base64);
    setStep('firma');
  }, []);

  /**
   * Handle signature captured
   */
  const handleSignatureCapture = useCallback(
    async (firmaBase64: string) => {
      if (!selfieBase64) {
        console.error('[ConfirmacionCierreFlow] No selfie data');
        return;
      }

      setStep('procesando');

      try {
        const success = await onConfirm(selfieBase64, firmaBase64);

        if (success) {
          // Success is handled by parent
          onClose();
        } else {
          // Error is shown by parent via Alert
          setStep('selfie');
          setSelfieBase64(null);
        }
      } catch (error) {
        console.error('[ConfirmacionCierreFlow] Error:', error);
        setStep('selfie');
        setSelfieBase64(null);
      }
    },
    [selfieBase64, onConfirm, onClose]
  );

  /**
   * Handle close at any step
   */
  const handleClose = useCallback(() => {
    setStep('idle');
    setSelfieBase64(null);
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

      {/* Step 2: Signature */}
      <SignatureCapture
        visible={step === 'firma'}
        onClose={handleClose}
        onCapture={handleSignatureCapture}
        title="Tu Firma"
      />

      {/* Step 3: Processing */}
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
              Subiendo foto y firma
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
