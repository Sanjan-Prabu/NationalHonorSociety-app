import React from 'react';
import { MemberRootProps } from '../types/navigation';
import MemberStack from './MemberStack';

interface MemberRootComponentProps extends MemberRootProps {}

export default function MemberRoot({}: MemberRootComponentProps) {
  return <MemberStack />;
}