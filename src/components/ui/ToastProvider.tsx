import React from 'react';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const Colors = {
  primaryBlue: '#4A90E2',
  solidBlue: '#2B5CE6',
  textDark: '#1A202C',
  textMedium: '#4A5568',
  textLight: '#718096',
  white: '#FFFFFF',
  errorRed: '#E53E3E',
  successGreen: '#38A169',
  warningOrange: '#DD6B20',
  infoBlue: '#3182CE',
};

// Custom toast configuration
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: Colors.successGreen,
        backgroundColor: Colors.white,
        borderRadius: moderateScale(8),
        height: verticalScale(70),
        width: '90%',
      }}
      contentContainerStyle={{
        paddingHorizontal: scale(15),
      }}
      text1Style={{
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: Colors.textDark,
      }}
      text2Style={{
        fontSize: moderateScale(12),
        color: Colors.textMedium,
      }}
    />
  ),

  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: Colors.errorRed,
        backgroundColor: Colors.white,
        borderRadius: moderateScale(8),
        height: verticalScale(70),
        width: '90%',
      }}
      contentContainerStyle={{
        paddingHorizontal: scale(15),
      }}
      text1Style={{
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: Colors.textDark,
      }}
      text2Style={{
        fontSize: moderateScale(12),
        color: Colors.textMedium,
      }}
    />
  ),

  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: Colors.infoBlue,
        backgroundColor: Colors.white,
        borderRadius: moderateScale(8),
        height: verticalScale(70),
        width: '90%',
      }}
      contentContainerStyle={{
        paddingHorizontal: scale(15),
      }}
      text1Style={{
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: Colors.textDark,
      }}
      text2Style={{
        fontSize: moderateScale(12),
        color: Colors.textMedium,
      }}
    />
  ),

  warning: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: Colors.warningOrange,
        backgroundColor: Colors.white,
        borderRadius: moderateScale(8),
        height: verticalScale(70),
        width: '90%',
      }}
      contentContainerStyle={{
        paddingHorizontal: scale(15),
      }}
      text1Style={{
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: Colors.textDark,
      }}
      text2Style={{
        fontSize: moderateScale(12),
        color: Colors.textMedium,
      }}
    />
  ),
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  return (
    <>
      {children}
      <Toast 
        config={toastConfig}
        position="top"
        topOffset={verticalScale(40)}
        visibilityTime={4000}
      />
    </>
  );
};

export const useToast = () => {
  const showSuccess = (title: string, description?: string) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: description,
    });
  };

  const showError = (title: string, description?: string) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: description,
    });
  };

  const showWarning = (title: string, description?: string) => {
    Toast.show({
      type: 'warning',
      text1: title,
      text2: description,
    });
  };

  const showInfo = (title: string, description?: string) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: description,
    });
  };

  const showValidationError = (title: string, description?: string) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: description,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showValidationError,
  };
};

export default ToastProvider;