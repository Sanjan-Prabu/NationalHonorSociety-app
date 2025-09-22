import { AuthSessionMissingError } from '@supabase/supabase-js';
import 'dotenv/config';

interface ExpoConfig {
  name: string;
  slug: string;
  version: string;
  owner?: string;
  githubUrl?: string;
  scheme: string;
  extra?: { [key: string]: any };
}

export default ({ config }: { config: ExpoConfig }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    },
  };
};