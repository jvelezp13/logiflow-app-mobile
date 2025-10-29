/**
 * Input Component
 *
 * Reusable text input with label and error state.
 */

import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { styles } from './Input.styles';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: object;
};

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  ...textInputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor="#9ca3af"
        {...textInputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
