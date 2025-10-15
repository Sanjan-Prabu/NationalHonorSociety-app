import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useSessionValidation = () => {
  // COMPLETELY DISABLED - WAS CAUSING LOGIN ISSUES
  // This hook was interfering with the login process
  console.log('🚫 Session validation DISABLED to fix login issues');
};