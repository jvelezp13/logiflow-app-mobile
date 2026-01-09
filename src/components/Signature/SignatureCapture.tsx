/**
 * SignatureCapture Component
 *
 * Modal component for capturing digital signatures.
 * Uses react-native-signature-canvas for drawing signatures.
 */

import React, { useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { Button } from '@components/ui/Button';
import { styles } from './SignatureCapture.styles';

export type SignatureCaptureProps = {
  visible: boolean;
  onClose: () => void;
  onCapture: (signatureBase64: string) => void;
  title?: string;
};

export const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  visible,
  onClose,
  onCapture,
  title = 'Tu Firma',
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signatureRef = useRef<any>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handle signature end (user lifted finger)
   */
  const handleEnd = () => {
    setIsSigned(true);
  };

  /**
   * Handle clear signature
   */
  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setIsSigned(false);
  };

  /**
   * Handle confirm signature
   */
  const handleConfirm = () => {
    if (!isSigned) {
      Alert.alert('Firma requerida', 'Por favor firma antes de confirmar.');
      return;
    }
    signatureRef.current?.readSignature();
  };

  /**
   * Handle signature data received
   */
  const handleOK = (signature: string) => {
    try {
      setIsProcessing(true);

      // signature comes as data:image/png;base64,...
      // We pass it directly as base64
      const base64Data = signature.replace('data:image/png;base64,', '');

      onCapture(base64Data);

      // Reset and close
      handleClear();
      onClose();
    } catch (error) {
      console.error('[SignatureCapture] Error processing signature:', error);
      Alert.alert('Error', 'No se pudo procesar la firma');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle empty signature
   */
  const handleEmpty = () => {
    Alert.alert('Firma vacía', 'Por favor dibuja tu firma antes de confirmar.');
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    handleClear();
    onClose();
  };

  // Signature canvas style (inline as required by the library)
  const signatureStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      background-color: #FFFFFF;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      background-color: #FFFFFF;
    }
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            Firma con tu dedo en el recuadro blanco
          </Text>
        </View>

        {/* Signature Canvas */}
        <View style={styles.canvasContainer}>
          <SignatureCanvas
            ref={signatureRef}
            onEnd={handleEnd}
            onOK={handleOK}
            onEmpty={handleEmpty}
            webStyle={signatureStyle}
            backgroundColor="white"
            penColor="black"
            minWidth={2}
            maxWidth={4}
            dotSize={3}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Limpiar"
            onPress={handleClear}
            variant="outline"
            disabled={isProcessing}
            style={styles.actionButton}
          />
          <Button
            title="Confirmar"
            onPress={handleConfirm}
            loading={isProcessing}
            disabled={isProcessing || !isSigned}
            style={styles.actionButton}
          />
        </View>
      </View>
    </Modal>
  );
};

export default SignatureCapture;
