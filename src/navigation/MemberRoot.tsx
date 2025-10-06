import React from 'react';
import { MemberRootProps } from '../types/navigation';
import MemberBottomNavigator from './MemberBottomNavigator';

interface MemberRootComponentProps extends MemberRootProps {}

export default function MemberRoot({}: MemberRootComponentProps) {
  return <MemberBottomNavigator />;
}