import React from 'react';
import { OfficerRootProps } from '../types/navigation';
import OfficerStack from './OfficerStack';

interface OfficerRootComponentProps extends OfficerRootProps {}

export default function OfficerRoot({}: OfficerRootComponentProps) {
  return <OfficerStack />;
}