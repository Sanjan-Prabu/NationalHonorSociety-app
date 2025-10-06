import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Logging and monitoring interfaces
interface SecurityEvent {
  type: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'RATE_LIMIT_IP' | 'RATE_LIMIT_EMAIL' | 'VALIDATION_ERROR' | 'BLOCKED_REQUEST';
  timestamp: string;
  ip: string;
  userAgent?: string | null;
  email?: string | null;
  userId?: string | null;
  details?: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface PerformanceMetric {
  type: 'REQUEST_DURATION' | 'AUTH_LATENCY' | 'ERROR_RATE';
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

interface AuditEvent {
  type: 'USER_LOGIN' | 'LOGIN_ATTEMPT' | 'SECURITY_VIOLATION' | 'SYSTEM_ERROR';
  timestamp: string;
  userId?: string | null;
  email?: string | null;
  ip: string;
  userAgent?: string | null;
  action: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  details?: Record<string, any>;
}

// Enhanced logging class for structured logging
class SignInLogger {
  private static instance: SignInLogger;
  private requestId: string;

  constructor(requestId?: string) {
    this.requestId = requestId || crypto.randomUUID();
  }

  static getInstance(requestId?: string): SignInLogger {
    if (!SignInLogger.instance || requestId) {
      SignInLogger.instance = new SignInLogger(requestId);
    }
    return SignInLogger.instance;
  }

  // Security event logging
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify({
      level: 'SECURITY',
      requestId: this.requestId,
      event: securityEvent,
      component: 'signin-function'
    }));

    // Additional alerting for critical events
    if (event.severity === 'CRITICAL') {
      console.error(JSON.stringify({
        level: 'ALERT',
        requestId: this.requestId,
        message: 'CRITICAL SECURITY EVENT',
        event: securityEvent
      }));
    }
  }

  // Performance monitoring
  logPerformanceMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const performanceMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify({
      level: 'PERFORMANCE',
      requestId: this.requestId,
      metric: performanceMetric,
      component: 'signin-function'
    }));
  }

  // Audit logging for compliance
  logAuditEvent(event: Omit<AuditEvent, 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify({
      level: 'AUDIT',
      requestId: this.requestId,
      event: auditEvent,
      component: 'signin-function'
    }));
  }

  // Error tracking with context
  logError(error: Error | string, context?: Record<string, any>): void {
    const errorDetails = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString()
    };

    console.error(JSON.stringify({
      level: 'ERROR',
      requestId: this.requestId,
      error: errorDetails,
      component: 'signin-function'
    }));
  }

  // General info logging
  logInfo(message: string, metadata?: Record<string, any>): void {
    console.log(JSON.stringify({
      level: 'INFO',
      requestId: this.requestId,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      component: 'signin-function'
    }));
  }

  // Debug logging (only in development)
  logDebug(message: string, data?: any): void {
    const isDevelopment = Deno.env.get('ENVIRONMENT') !== 'production';
    if (isDevelopment) {
      console.log(JSON.stringify({
        level: 'DEBUG',
        requestId: this.requestId,
        message,
        data,
        timestamp: new Date().toISOString(),
        component: 'signin-function'
      }));
    }
  }
}

// Performance monitoring utilities
class PerformanceMonitor {
  private startTime: number;
  private logger: SignInLogger;

  constructor(logger: SignInLogger) {
    this.startTime = Date.now();
    this.logger = logger;
  }

  // Mark checkpoint and log duration
  checkpoint(name: string, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    this.logger.logPerformanceMetric({
      type: 'REQUEST_DURATION',
      value: duration,
      metadata: { checkpoint: name, ...metadata }
    });
  }

  // End monitoring and log total duration
  end(metadata?: Record<string, any>): number {
    const totalDuration = Date.now() - this.startTime;
    this.logger.logPerformanceMetric({
      type: 'REQUEST_DURATION',
      value: totalDuration,
      metadata: { phase: 'complete', ...metadata }
    });
    return totalDuration;
  }
}

// Rate limiting metrics tracking
interface RateLimitMetrics {
  ipBlocks: number;
  emailBlocks: number;
  totalRequests: number;
  blockedRequests: number;
}

const rateLimitMetrics: RateLimitMetrics = {
  ipBlocks: 0,
  emailBlocks: 0,
  totalRequests: 0,
  blockedRequests: 0
};

// Enhanced monitoring and alerting system
interface AlertThresholds {
  errorRate: number;           // 5% error rate threshold
  responseTime: number;        // 2000ms response time threshold
  rateLimitRate: number;       // 100 rate limits per hour threshold
  authFailureRate: number;     // 90% auth success rate threshold
}

const ALERT_THRESHOLDS: AlertThresholds = {
  errorRate: 0.05,
  responseTime: 2000,
  rateLimitRate: 100,
  authFailureRate: 0.10
};

// Extended metrics tracking
interface ExtendedMetrics extends RateLimitMetrics {
  authSuccesses: number;
  authFailures: number;
  totalResponseTime: number;
  requestCount: number;
  errors: number;
}

const extendedMetrics: ExtendedMetrics = {
  ipBlocks: 0,
  emailBlocks: 0,
  totalRequests: 0,
  blockedRequests: 0,
  authSuccesses: 0,
  authFailures: 0,
  totalResponseTime: 0,
  requestCount: 0,
  errors: 0
};

// Function to check alert conditions and log alerts
function checkAlertConditions(logger: SignInLogger): void {
  const metrics = extendedMetrics;
  
  if (metrics.requestCount === 0) return;

  // Calculate rates
  const errorRate = metrics.errors / metrics.requestCount;
  const avgResponseTime = metrics.totalResponseTime / metrics.requestCount;
  const authFailureRate = metrics.authFailures / Math.max(metrics.authSuccesses + metrics.authFailures, 1);
  const rateLimitRate = (metrics.ipBlocks + metrics.emailBlocks);

  // Check error rate threshold
  if (errorRate > ALERT_THRESHOLDS.errorRate) {
    logger.logSecurityEvent({
      type: 'BLOCKED_REQUEST',
      ip: 'system',
      severity: 'CRITICAL',
      details: {
        alertType: 'HIGH_ERROR_RATE',
        currentRate: errorRate,
        threshold: ALERT_THRESHOLDS.errorRate,
        period: '5min',
        errorCount: metrics.errors,
        totalRequests: metrics.requestCount
      }
    });
  }

  // Check response time threshold
  if (avgResponseTime > ALERT_THRESHOLDS.responseTime) {
    logger.logPerformanceMetric({
      type: 'REQUEST_DURATION',
      value: avgResponseTime,
      metadata: {
        alertType: 'HIGH_RESPONSE_TIME',
        threshold: ALERT_THRESHOLDS.responseTime,
        period: '5min',
        requestCount: metrics.requestCount
      }
    });
  }

  // Check authentication failure rate
  if (authFailureRate > ALERT_THRESHOLDS.authFailureRate) {
    logger.logSecurityEvent({
      type: 'AUTH_FAILURE',
      ip: 'system',
      severity: 'HIGH',
      details: {
        alertType: 'HIGH_AUTH_FAILURE_RATE',
        currentRate: authFailureRate,
        threshold: ALERT_THRESHOLDS.authFailureRate,
        period: '5min',
        authFailures: metrics.authFailures,
        authSuccesses: metrics.authSuccesses
      }
    });
  }

  // Check rate limiting frequency
  if (rateLimitRate > ALERT_THRESHOLDS.rateLimitRate) {
    logger.logSecurityEvent({
      type: 'RATE_LIMIT_IP',
      ip: 'system',
      severity: 'HIGH',
      details: {
        alertType: 'HIGH_RATE_LIMIT_FREQUENCY',
        currentRate: rateLimitRate,
        threshold: ALERT_THRESHOLDS.rateLimitRate,
        period: '5min',
        ipBlocks: metrics.ipBlocks,
        emailBlocks: metrics.emailBlocks
      }
    });
  }
}

// Log comprehensive metrics periodically (every 5 minutes)
setInterval(() => {
  const logger = SignInLogger.getInstance();
  
  // Log current metrics
  logger.logPerformanceMetric({
    type: 'ERROR_RATE',
    value: extendedMetrics.errors / Math.max(extendedMetrics.requestCount, 1),
    metadata: {
      ...extendedMetrics,
      period: '5min',
      avgResponseTime: extendedMetrics.totalResponseTime / Math.max(extendedMetrics.requestCount, 1),
      authSuccessRate: extendedMetrics.authSuccesses / Math.max(extendedMetrics.authSuccesses + extendedMetrics.authFailures, 1)
    }
  });

  // Check for alert conditions
  checkAlertConditions(logger);

  // Log system health summary
  logger.logInfo('System health summary', {
    period: '5min',
    metrics: {
      totalRequests: extendedMetrics.requestCount,
      errorRate: extendedMetrics.errors / Math.max(extendedMetrics.requestCount, 1),
      avgResponseTime: extendedMetrics.totalResponseTime / Math.max(extendedMetrics.requestCount, 1),
      authSuccessRate: extendedMetrics.authSuccesses / Math.max(extendedMetrics.authSuccesses + extendedMetrics.authFailures, 1),
      rateLimitBlocks: extendedMetrics.ipBlocks + extendedMetrics.emailBlocks,
      memoryUsage: {
        ipRateLimitEntries: ipRateLimit.size,
        emailRateLimitEntries: emailRateLimit.size
      }
    }
  });
  
  // Reset counters
  Object.keys(extendedMetrics).forEach(key => {
    (extendedMetrics as any)[key] = 0;
  });
}, 5 * 60 * 1000);

// Function to update metrics (to be called from main handler)
function updateMetrics(type: 'request' | 'auth_success' | 'auth_failure' | 'error' | 'rate_limit_ip' | 'rate_limit_email', value?: number): void {
  switch (type) {
    case 'request':
      extendedMetrics.requestCount++;
      if (value) extendedMetrics.totalResponseTime += value;
      break;
    case 'auth_success':
      extendedMetrics.authSuccesses++;
      break;
    case 'auth_failure':
      extendedMetrics.authFailures++;
      break;
    case 'error':
      extendedMetrics.errors++;
      break;
    case 'rate_limit_ip':
      extendedMetrics.ipBlocks++;
      break;
    case 'rate_limit_email':
      extendedMetrics.emailBlocks++;
      break;
  }
}

// Initialize Supabase client with anon key for authentication
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize service role client for profile operations (RLS bypass)
const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Rate limiting storage (in-memory for Edge Functions)
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockUntil?: number;
}

const ipRateLimit = new Map<string, RateLimitEntry>();
const emailRateLimit = new Map<string, RateLimitEntry>();

// Rate limiting configuration
const RATE_LIMITS = {
  IP: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 15 * 60 * 1000, // 15 minutes block after violations
  },
  EMAIL: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 60 * 60 * 1000, // 1 hour block after violations
  }
};

// Cleanup function to prevent memory leaks
function cleanupExpiredEntries() {
  const now = Date.now();
  
  // Clean IP rate limit entries
  for (const [key, entry] of ipRateLimit.entries()) {
    if (now > entry.resetTime && (!entry.blockUntil || now > entry.blockUntil)) {
      ipRateLimit.delete(key);
    }
  }
  
  // Clean email rate limit entries
  for (const [key, entry] of emailRateLimit.entries()) {
    if (now > entry.resetTime && (!entry.blockUntil || now > entry.blockUntil)) {
      emailRateLimit.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

// Types for request and response
interface SignInRequest {
  email: string;
  password: string;
  clientType?: 'mobile' | 'web'; // Optional client type for token strategy
}

interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
}

interface MinimalSessionData {
  expires_at: number;
  expires_in: number;
  token_type: string;
}

interface SignInResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role?: string;
    organization?: string;
  };
  error?: string;
  session?: SessionData | MinimalSessionData;
}

// Profile data interface for database operations
interface UserProfile {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  organization?: string | null;
  role?: string | null;
  is_verified?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Cookie configuration for secure session handling
interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

// Email validation regex - more comprehensive
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Input sanitization functions
function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[<>'"&]/g, '');
}

function sanitizeString(input: string): string {
  return input.trim().replace(/[<>'"&]/g, '');
}

// Secure cookie configuration
function getSecureCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true, // Requires HTTPS
    sameSite: 'strict',
    maxAge: 3600, // 1 hour (matches access token expiry)
    path: '/',
    // domain: '.yourdomain.com' // Set in production for subdomain sharing
  };
}

// Cookie utility functions
function formatCookie(name: string, value: string, options: CookieOptions): string {
  let cookie = `${name}=${value}`;
  
  if (options.maxAge) {
    cookie += `; Max-Age=${options.maxAge}`;
  }
  
  if (options.path) {
    cookie += `; Path=${options.path}`;
  }
  
  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }
  
  if (options.secure) {
    cookie += '; Secure';
  }
  
  if (options.httpOnly) {
    cookie += '; HttpOnly';
  }
  
  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }
  
  return cookie;
}

// Token handling strategy based on client type
function determineTokenStrategy(req: Request, body: any): 'cookie' | 'response' {
  // Check explicit client type in request
  if (body.clientType === 'mobile') {
    return 'response';
  }
  
  if (body.clientType === 'web') {
    return 'cookie';
  }
  
  // Auto-detect based on User-Agent
  const userAgent = req.headers.get('user-agent')?.toLowerCase() || '';
  
  // Mobile app indicators
  const mobileIndicators = [
    'expo',
    'react-native',
    'mobile',
    'android',
    'ios',
    'iphone',
    'ipad'
  ];
  
  const isMobile = mobileIndicators.some(indicator => userAgent.includes(indicator));
  
  return isMobile ? 'response' : 'cookie';
}

// Enhanced session data formatting
function formatSessionData(session: any, includeTokens: boolean = true): SessionData | MinimalSessionData {
  const baseSessionData = {
    expires_at: session.expires_at || 0,
    expires_in: session.expires_in || 3600,
    token_type: session.token_type || 'bearer'
  };
  
  // For cookie strategy, we might not include tokens in response
  if (!includeTokens) {
    return baseSessionData;
  }
  
  // For response strategy, include full token data
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    ...baseSessionData
  };
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Restrict to app domains in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Enhanced rate limiting functions with comprehensive logging
function checkRateLimit(
  identifier: string, 
  config: typeof RATE_LIMITS.IP, 
  storage: Map<string, RateLimitEntry>,
  logger: SignInLogger,
  type: 'IP' | 'EMAIL'
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = storage.get(identifier);

  // Update metrics
  rateLimitMetrics.totalRequests++;

  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    storage.delete(identifier);
    logger.logDebug(`Rate limit entry expired for ${type}`, { identifier: type === 'EMAIL' ? identifier : '[REDACTED]' });
  }

  // Check if currently blocked
  if (entry?.blocked && entry.blockUntil && now < entry.blockUntil) {
    rateLimitMetrics.blockedRequests++;
    
    logger.logSecurityEvent({
      type: type === 'IP' ? 'RATE_LIMIT_IP' : 'RATE_LIMIT_EMAIL',
      ip: type === 'IP' ? identifier : 'unknown',
      email: type === 'EMAIL' ? identifier : undefined,
      severity: 'MEDIUM',
      details: {
        remainingBlockTime: entry.blockUntil - now,
        attemptCount: entry.count,
        type: 'BLOCKED_REQUEST'
      }
    });

    return { allowed: false, retryAfter: Math.ceil((entry.blockUntil - now) / 1000) };
  }

  // Get or create entry
  const currentEntry = storage.get(identifier) || { count: 0, resetTime: now + config.windowMs };

  // Reset if window expired
  if (now > currentEntry.resetTime) {
    if (currentEntry.count > 0) {
      logger.logDebug(`Rate limit window reset for ${type}`, { 
        identifier: type === 'EMAIL' ? identifier : '[REDACTED]',
        previousCount: currentEntry.count 
      });
    }
    
    currentEntry.count = 0;
    currentEntry.resetTime = now + config.windowMs;
    currentEntry.blocked = false;
    delete currentEntry.blockUntil;
  }

  // Increment counter
  currentEntry.count++;

  // Check if limit exceeded
  if (currentEntry.count > config.maxRequests) {
    currentEntry.blocked = true;
    currentEntry.blockUntil = now + config.blockDurationMs;
    storage.set(identifier, currentEntry);
    
    // Update metrics
    rateLimitMetrics.blockedRequests++;
    if (type === 'IP') {
      rateLimitMetrics.ipBlocks++;
    } else {
      rateLimitMetrics.emailBlocks++;
    }

    // Log security event
    logger.logSecurityEvent({
      type: type === 'IP' ? 'RATE_LIMIT_IP' : 'RATE_LIMIT_EMAIL',
      ip: type === 'IP' ? identifier : 'unknown',
      email: type === 'EMAIL' ? identifier : undefined,
      severity: currentEntry.count > config.maxRequests * 2 ? 'HIGH' : 'MEDIUM',
      details: {
        attemptCount: currentEntry.count,
        blockDuration: config.blockDurationMs,
        type: 'RATE_LIMIT_EXCEEDED'
      }
    });

    // Log audit event for compliance
    logger.logAuditEvent({
      type: 'SECURITY_VIOLATION',
      ip: type === 'IP' ? identifier : 'unknown',
      email: type === 'EMAIL' ? identifier : undefined,
      action: 'RATE_LIMIT_BLOCK',
      result: 'BLOCKED',
      details: {
        limitType: type,
        attemptCount: currentEntry.count,
        maxAllowed: config.maxRequests
      }
    });

    return { allowed: false, retryAfter: Math.ceil(config.blockDurationMs / 1000) };
  }

  // Log warning if approaching limit
  if (currentEntry.count > config.maxRequests * 0.8) {
    logger.logSecurityEvent({
      type: type === 'IP' ? 'RATE_LIMIT_IP' : 'RATE_LIMIT_EMAIL',
      ip: type === 'IP' ? identifier : 'unknown',
      email: type === 'EMAIL' ? identifier : undefined,
      severity: 'LOW',
      details: {
        attemptCount: currentEntry.count,
        maxAllowed: config.maxRequests,
        type: 'APPROACHING_LIMIT'
      }
    });
  }

  storage.set(identifier, currentEntry);
  return { allowed: true };
}

function getClientIP(req: Request): string {
  // Try various headers for IP detection
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  return 'unknown';
}

// Enhanced input validation function
function validateSignInRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if body exists and is an object
  if (!body || typeof body !== 'object') {
    errors.push('Invalid request format');
    return { isValid: false, errors };
  }

  // Validate email
  if (!body.email) {
    errors.push('Email is required');
  } else if (typeof body.email !== 'string') {
    errors.push('Email must be a string');
  } else {
    const sanitizedEmail = sanitizeEmail(body.email);
    if (!sanitizedEmail) {
      errors.push('Email cannot be empty');
    } else if (sanitizedEmail.length > 254) {
      errors.push('Email is too long');
    } else if (!EMAIL_REGEX.test(sanitizedEmail)) {
      errors.push('Invalid email format');
    }
  }

  // Validate password
  if (!body.password) {
    errors.push('Password is required');
  } else if (typeof body.password !== 'string') {
    errors.push('Password must be a string');
  } else if (body.password.length < 1) {
    errors.push('Password cannot be empty');
  } else if (body.password.length > 1000) {
    errors.push('Password is too long');
  }

  // Validate optional clientType
  if (body.clientType && !['mobile', 'web'].includes(body.clientType)) {
    errors.push('Invalid client type');
  }

  // Check for unexpected fields (prevent injection)
  const allowedFields = ['email', 'password', 'clientType'];
  const bodyKeys = Object.keys(body);
  const unexpectedFields = bodyKeys.filter(key => !allowedFields.includes(key));
  if (unexpectedFields.length > 0) {
    errors.push('Invalid request fields');
  }

  return { isValid: errors.length === 0, errors };
}

// Profile data retrieval with RLS enforcement
async function fetchUserProfile(
  userId: string, 
  logger: SignInLogger
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    logger.logDebug('Fetching user profile data', { userId });
    
    const profileStartTime = Date.now();
    
    // Use service role client to fetch profile data
    // RLS policies ensure only legitimate access even with service role
    const { data: profile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('id, email, first_name, last_name, organization, role, is_verified, created_at, updated_at')
      .eq('id', userId)
      .single();
    
    const profileDuration = Date.now() - profileStartTime;
    
    // Log profile fetch performance
    logger.logPerformanceMetric({
      type: 'REQUEST_DURATION',
      value: profileDuration,
      metadata: { 
        operation: 'profile_fetch',
        userId,
        success: !profileError
      }
    });
    
    if (profileError) {
      logger.logError('Profile fetch failed', {
        userId,
        error: profileError.message,
        code: profileError.code,
        details: profileError.details,
        duration: profileDuration
      });
      
      // Log security event for profile access failure
      logger.logSecurityEvent({
        type: 'BLOCKED_REQUEST',
        ip: 'service_role',
        userId,
        severity: 'MEDIUM',
        details: {
          operation: 'PROFILE_FETCH_FAILED',
          error: profileError.message,
          code: profileError.code
        }
      });
      
      return { profile: null, error: 'Failed to retrieve user profile' };
    }
    
    if (!profile) {
      logger.logSecurityEvent({
        type: 'BLOCKED_REQUEST',
        ip: 'service_role',
        userId,
        severity: 'HIGH',
        details: {
          operation: 'PROFILE_NOT_FOUND',
          reason: 'User authenticated but profile missing'
        }
      });
      
      return { profile: null, error: 'User profile not found' };
    }
    
    // Log successful profile retrieval
    logger.logInfo('Profile data retrieved successfully', {
      userId,
      hasOrganization: !!profile.organization,
      hasRole: !!profile.role,
      isVerified: profile.is_verified,
      duration: profileDuration
    });
    
    // Log audit event for profile access
    logger.logAuditEvent({
      type: 'USER_LOGIN',
      userId,
      email: profile.email,
      ip: 'service_role',
      action: 'PROFILE_DATA_ACCESS',
      result: 'SUCCESS',
      details: {
        operation: 'profile_fetch',
        duration: profileDuration,
        dataFields: ['id', 'email', 'organization', 'role', 'is_verified']
      }
    });
    
    return { profile, error: null };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.logError('Profile fetch exception', {
      userId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    logger.logSecurityEvent({
      type: 'BLOCKED_REQUEST',
      ip: 'service_role',
      userId,
      severity: 'HIGH',
      details: {
        operation: 'PROFILE_FETCH_EXCEPTION',
        error: errorMessage
      }
    });
    
    return { profile: null, error: 'Internal error retrieving profile' };
  }
}

// Enhanced error response with comprehensive logging
function createErrorResponse(
  message: string, 
  status: number, 
  logger: SignInLogger,
  req?: Request, 
  additionalInfo?: any
): Response {
  const response: SignInResponse = {
    success: false,
    error: message
  };

  const clientIP = req ? getClientIP(req) : 'unknown';
  const userAgent = req?.headers.get('user-agent');

  // Log different types of errors with appropriate severity
  if (status === 401) {
    // Authentication failure
    logger.logSecurityEvent({
      type: 'AUTH_FAILURE',
      ip: clientIP,
      userAgent,
      email: additionalInfo?.email,
      severity: 'MEDIUM',
      details: {
        reason: 'INVALID_CREDENTIALS',
        ...additionalInfo
      }
    });

    logger.logAuditEvent({
      type: 'LOGIN_ATTEMPT',
      ip: clientIP,
      userAgent,
      email: additionalInfo?.email,
      action: 'AUTHENTICATION',
      result: 'FAILURE',
      details: { errorCode: status, message }
    });

  } else if (status === 429) {
    // Rate limiting
    logger.logSecurityEvent({
      type: additionalInfo?.type === 'EMAIL_RATE_LIMIT' ? 'RATE_LIMIT_EMAIL' : 'RATE_LIMIT_IP',
      ip: clientIP,
      userAgent,
      email: additionalInfo?.email,
      severity: 'HIGH',
      details: {
        retryAfter: additionalInfo?.retryAfter,
        limitType: additionalInfo?.type,
        ...additionalInfo
      }
    });

  } else if (status === 400) {
    // Validation errors
    logger.logSecurityEvent({
      type: 'VALIDATION_ERROR',
      ip: clientIP,
      userAgent,
      severity: 'LOW',
      details: {
        errorType: 'INPUT_VALIDATION',
        message,
        ...additionalInfo
      }
    });

  } else if (status >= 500) {
    // Server errors
    logger.logError(`Server error: ${message}`, {
      status,
      ip: clientIP,
      userAgent,
      ...additionalInfo
    });

    logger.logAuditEvent({
      type: 'SYSTEM_ERROR',
      ip: clientIP,
      userAgent,
      action: 'REQUEST_PROCESSING',
      result: 'FAILURE',
      details: { errorCode: status, message }
    });
  }

  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  // Add retry-after header for rate limiting
  if (status === 429 && additionalInfo?.retryAfter) {
    headers['Retry-After'] = additionalInfo.retryAfter.toString();
  }

  return new Response(
    JSON.stringify(response),
    {
      status,
      headers
    }
  );
}

// Main function handler with comprehensive logging and monitoring
serve(async (req) => {
  // Initialize logging and performance monitoring for this request
  const requestId = crypto.randomUUID();
  const logger = SignInLogger.getInstance(requestId);
  const performanceMonitor = new PerformanceMonitor(logger);
  
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || undefined;
  
  // Log incoming request
  logger.logInfo('Incoming signin request', {
    method: req.method,
    ip: clientIP,
    userAgent,
    url: req.url
  });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    logger.logInfo('CORS preflight request handled', { ip: clientIP });
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    });
  }

  // Only allow POST requests for authentication
  if (req.method !== 'POST') {
    logger.logSecurityEvent({
      type: 'BLOCKED_REQUEST',
      ip: clientIP,
      userAgent,
      severity: 'LOW',
      details: { reason: 'INVALID_METHOD', method: req.method }
    });
    updateMetrics('error');
    updateMetrics('request', 0); // No processing time for invalid method
    return createErrorResponse('Method not allowed', 405, logger, req);
  }

  try {
    performanceMonitor.checkpoint('request_start');

    // Check IP-based rate limiting first
    const ipRateCheck = checkRateLimit(clientIP, RATE_LIMITS.IP, ipRateLimit, logger, 'IP');
    if (!ipRateCheck.allowed) {
      updateMetrics('rate_limit_ip');
      const totalDuration = performanceMonitor.end({ result: 'rate_limited_ip' });
      updateMetrics('request', totalDuration);
      return createErrorResponse(
        'Too many requests. Please try again later.',
        429,
        logger,
        req,
        { retryAfter: ipRateCheck.retryAfter, type: 'IP_RATE_LIMIT' }
      );
    }

    performanceMonitor.checkpoint('rate_limit_check');

    // Parse request body with size limit
    let body: any;
    try {
      const text = await req.text();
      if (text.length > 10000) { // 10KB limit
        logger.logSecurityEvent({
          type: 'BLOCKED_REQUEST',
          ip: clientIP,
          userAgent,
          severity: 'MEDIUM',
          details: { reason: 'REQUEST_TOO_LARGE', size: text.length }
        });
        updateMetrics('error');
        const totalDuration = performanceMonitor.end({ result: 'request_too_large' });
        updateMetrics('request', totalDuration);
        return createErrorResponse('Request body too large', 413, logger, req);
      }
      body = JSON.parse(text);
    } catch (error) {
      logger.logSecurityEvent({
        type: 'VALIDATION_ERROR',
        ip: clientIP,
        userAgent,
        severity: 'LOW',
        details: { reason: 'INVALID_JSON', error: error instanceof Error ? error.message : 'Unknown' }
      });
      updateMetrics('error');
      const totalDuration = performanceMonitor.end({ result: 'invalid_json' });
      updateMetrics('request', totalDuration);
      return createErrorResponse('Invalid JSON in request body', 400, logger, req);
    }

    performanceMonitor.checkpoint('body_parsing');

    // Validate input
    const validation = validateSignInRequest(body);
    if (!validation.isValid) {
      logger.logSecurityEvent({
        type: 'VALIDATION_ERROR',
        ip: clientIP,
        userAgent,
        severity: 'LOW',
        details: { reason: 'INPUT_VALIDATION', errors: validation.errors }
      });
      updateMetrics('error');
      const totalDuration = performanceMonitor.end({ result: 'validation_failed' });
      updateMetrics('request', totalDuration);
      return createErrorResponse('Invalid request format', 400, logger, req, { errors: validation.errors });
    }

    // Extract and sanitize inputs
    const email = sanitizeEmail(body.email);
    const password = sanitizeString(body.password);

    performanceMonitor.checkpoint('input_validation');

    // Check email-based rate limiting
    const emailRateCheck = checkRateLimit(email, RATE_LIMITS.EMAIL, emailRateLimit, logger, 'EMAIL');
    if (!emailRateCheck.allowed) {
      updateMetrics('rate_limit_email');
      const totalDuration = performanceMonitor.end({ result: 'rate_limited_email' });
      updateMetrics('request', totalDuration);
      return createErrorResponse(
        'Too many login attempts for this email. Please try again later.',
        429,
        logger,
        req,
        { retryAfter: emailRateCheck.retryAfter, type: 'EMAIL_RATE_LIMIT', email }
      );
    }

    performanceMonitor.checkpoint('email_rate_limit_check');

    // Log authentication attempt
    logger.logAuditEvent({
      type: 'LOGIN_ATTEMPT',
      ip: clientIP,
      userAgent,
      email,
      action: 'AUTHENTICATION_START',
      result: 'SUCCESS'
    });

    // Attempt authentication using Supabase Auth
    const authStartTime = Date.now();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    const authDuration = Date.now() - authStartTime;

    // Log authentication latency
    logger.logPerformanceMetric({
      type: 'AUTH_LATENCY',
      value: authDuration,
      metadata: { email, success: !authError }
    });

    performanceMonitor.checkpoint('authentication');

    // Handle authentication failure
    if (authError || !authData.user || !authData.session) {
      updateMetrics('auth_failure');
      
      logger.logSecurityEvent({
        type: 'AUTH_FAILURE',
        ip: clientIP,
        userAgent,
        email,
        severity: 'MEDIUM',
        details: {
          error: authError?.message,
          errorCode: authError?.status,
          authDuration
        }
      });

      logger.logAuditEvent({
        type: 'LOGIN_ATTEMPT',
        ip: clientIP,
        userAgent,
        email,
        action: 'AUTHENTICATION',
        result: 'FAILURE',
        details: { 
          errorCode: authError?.status,
          errorMessage: authError?.message,
          duration: authDuration
        }
      });
      
      const totalDuration = performanceMonitor.end({ result: 'auth_failed' });
      updateMetrics('request', totalDuration);
      
      // Return generic error message to prevent information disclosure
      return createErrorResponse('Invalid credentials', 401, logger, req, { email });
    }

    // Authentication successful - prepare response
    const user = authData.user;
    const session = authData.session;
    
    updateMetrics('auth_success');

    // Determine token handling strategy
    const tokenStrategy = determineTokenStrategy(req, body);

    performanceMonitor.checkpoint('token_strategy');

    // Log successful authentication
    logger.logSecurityEvent({
      type: 'AUTH_SUCCESS',
      ip: clientIP,
      userAgent,
      email: user.email || email,
      userId: user.id,
      severity: 'LOW',
      details: {
        tokenStrategy,
        authDuration,
        userConfirmed: user.email_confirmed_at ? true : false
      }
    });

    logger.logAuditEvent({
      type: 'USER_LOGIN',
      userId: user.id,
      email: user.email || email,
      ip: clientIP,
      userAgent,
      action: 'SUCCESSFUL_LOGIN',
      result: 'SUCCESS',
      details: {
        tokenStrategy,
        authDuration,
        sessionExpiresAt: session.expires_at
      }
    });

    // Prepare response headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': 'application/json'
    };

    // Fetch user profile data using service role client
    performanceMonitor.checkpoint('profile_fetch_start');
    
    const { profile, error: profileError } = await fetchUserProfile(user.id, logger);
    
    performanceMonitor.checkpoint('profile_fetch_complete');
    
    // Create base response with user data including profile information
    const response: SignInResponse = {
      success: true,
      user: {
        id: user.id,
        email: user.email || email,
        role: profile?.role || undefined,
        organization: profile?.organization || undefined
      }
    };
    
    // Log profile data inclusion in response
    if (profile) {
      logger.logInfo('Profile data included in signin response', {
        userId: user.id,
        hasRole: !!profile.role,
        hasOrganization: !!profile.organization,
        isVerified: profile.is_verified
      });
    } else if (profileError) {
      // Log warning if profile fetch failed but continue with basic user data
      logger.logSecurityEvent({
        type: 'BLOCKED_REQUEST',
        ip: clientIP,
        userId: user.id,
        severity: 'MEDIUM',
        details: {
          operation: 'SIGNIN_WITH_PROFILE_ERROR',
          profileError,
          fallbackToBasicData: true
        }
      });
    }

    // Handle token strategy
    if (tokenStrategy === 'cookie') {
      // Web client: Set secure HttpOnly cookies
      const cookieOptions = getSecureCookieOptions();
      
      // Set access token cookie
      const accessTokenCookie = formatCookie(
        'sb-access-token',
        session.access_token,
        cookieOptions
      );
      
      // Set refresh token cookie with longer expiry
      const refreshTokenCookie = formatCookie(
        'sb-refresh-token',
        session.refresh_token,
        {
          ...cookieOptions,
          maxAge: 30 * 24 * 3600 // 30 days for refresh token
        }
      );

      // Add cookies to response headers
      responseHeaders['Set-Cookie'] = [accessTokenCookie, refreshTokenCookie].join(', ');
      
      // Include minimal session info in response (no tokens)
      response.session = formatSessionData(session, false);
      
      logger.logInfo('Tokens set as secure cookies', { userId: user.id });
      
    } else {
      // Mobile client: Return tokens in response body with security guidance
      response.session = formatSessionData(session, true);
      
      // Add security headers for mobile clients
      responseHeaders['X-Token-Security'] = 'Store tokens securely using platform keychain/keystore';
      responseHeaders['X-Token-Expiry'] = session.expires_at?.toString() || '0';
      
      logger.logInfo('Tokens returned in response body', { userId: user.id });
    }

    const totalDuration = performanceMonitor.end({ 
      result: 'success', 
      userId: user.id,
      tokenStrategy 
    });
    
    updateMetrics('request', totalDuration);

    logger.logInfo('Signin request completed successfully', {
      userId: user.id,
      email: user.email,
      totalDuration,
      tokenStrategy
    });

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: responseHeaders
      }
    );

  } catch (error) {
    const totalDuration = performanceMonitor.end({ result: 'error' });
    updateMetrics('error');
    updateMetrics('request', totalDuration);
    
    // Log detailed error for debugging
    logger.logError(error instanceof Error ? error : 'Unknown error', {
      ip: clientIP,
      userAgent,
      totalDuration,
      stack: error instanceof Error ? error.stack : undefined
    });

    logger.logAuditEvent({
      type: 'SYSTEM_ERROR',
      ip: clientIP,
      userAgent,
      action: 'REQUEST_PROCESSING',
      result: 'FAILURE',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: totalDuration
      }
    });
    
    // Return generic error to prevent information disclosure
    return createErrorResponse('Internal server error', 500, logger, req);
  }
});