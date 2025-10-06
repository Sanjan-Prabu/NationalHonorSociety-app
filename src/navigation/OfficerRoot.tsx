import React from 'react';
import { OfficerRootProps } from '../types/navigation';
import OfficerBottomNavigator from './OfficerBottomNavigator';

interface OfficerRootComponentProps extends OfficerRootProps {}

export default function OfficerRoot({}: OfficerRootComponentProps) {
  return <OfficerBottomNavigator />;
}