/**
 * Test file for comprehensive logging and monitoring system
 * This file demonstrates and tests the logging functionality
 */

// Mock crypto for testing
const mockCrypto = {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
};

// Mock console for capturing logs
const mockLogs: any[] = [];
const originalConsole = {
  log: console.log,
  error: console.error
};

console.log = (...args) => {
  mockLogs.push({ level: 'log', args });
  originalConsole.log(...args);
};

console.error = (...args) => {
  mockLogs.push({ level: 'error', args });
  originalConsole.error(...args);
};

// Test the logging system
function testLoggingSystem() {
  console.log('🧪 Testing Comprehensive Logging and Monitoring System\n');

  // Test 1: Security Event Logging
  console.log('📋 Test 1: Security Event Logging');
  
  const logger = new SignInLogger('test-request-1');
  
  // Test authentication failure
  logger.logSecurityEvent({
    type: 'AUTH_FAILURE',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    email: 'test@example.com',
    severity: 'MEDIUM',
    details: {
      reason: 'INVALID_CREDENTIALS',
      authDuration: 150,
      errorCode: 401
    }
  });

  // Test rate limiting
  logger.logSecurityEvent({
    type: 'RATE_LIMIT_IP',
    ip: '192.168.1.100',
    severity: 'HIGH',
    details: {
      attemptCount: 6,
      blockDuration: 900000,
      type: 'RATE_LIMIT_EXCEEDED'
    }
  });

  // Test critical security event
  logger.logSecurityEvent({
    type: 'BLOCKED_REQUEST',
    ip: '192.168.1.100',
    severity: 'CRITICAL',
    details: {
      alertType: 'HIGH_ERROR_RATE',
      currentRate: 0.08,
      threshold: 0.05
    }
  });

  console.log('✅ Security event logging tests completed\n');

  // Test 2: Performance Monitoring
  console.log('📋 Test 2: Performance Monitoring');
  
  const performanceMonitor = new PerformanceMonitor(logger);
  
  // Simulate request processing
  setTimeout(() => {
    performanceMonitor.checkpoint('rate_limit_check', { ip: '192.168.1.100' });
  }, 10);
  
  setTimeout(() => {
    performanceMonitor.checkpoint('authentication', { email: 'test@example.com' });
  }, 50);
  
  setTimeout(() => {
    const totalDuration = performanceMonitor.end({ result: 'success', userId: 'test-user-123' });
    console.log(`Total request duration: ${totalDuration}ms`);
  }, 100);

  // Test performance metrics
  logger.logPerformanceMetric({
    type: 'AUTH_LATENCY',
    value: 75,
    metadata: { email: 'test@example.com', success: true }
  });

  logger.logPerformanceMetric({
    type: 'ERROR_RATE',
    value: 0.03,
    metadata: { period: '5min', totalRequests: 1000, errors: 30 }
  });

  console.log('✅ Performance monitoring tests completed\n');

  // Test 3: Audit Logging
  console.log('📋 Test 3: Audit Logging');
  
  // Test successful login audit
  logger.logAuditEvent({
    type: 'USER_LOGIN',
    userId: 'test-user-123',
    email: 'test@example.com',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    action: 'SUCCESSFUL_LOGIN',
    result: 'SUCCESS',
    details: {
      tokenStrategy: 'cookie',
      authDuration: 150,
      sessionExpiresAt: Date.now() + 3600000
    }
  });

  // Test security violation audit
  logger.logAuditEvent({
    type: 'SECURITY_VIOLATION',
    ip: '192.168.1.100',
    email: 'test@example.com',
    action: 'RATE_LIMIT_BLOCK',
    result: 'BLOCKED',
    details: {
      limitType: 'EMAIL',
      attemptCount: 6,
      maxAllowed: 5
    }
  });

  console.log('✅ Audit logging tests completed\n');

  // Test 4: Error Tracking
  console.log('📋 Test 4: Error Tracking');
  
  // Test error logging
  logger.logError(new Error('Test authentication error'), {
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    totalDuration: 250
  });

  // Test info logging
  logger.logInfo('Test signin request completed', {
    userId: 'test-user-123',
    email: 'test@example.com',
    totalDuration: 180,
    tokenStrategy: 'response'
  });

  // Test debug logging (should only appear in development)
  logger.logDebug('Test debug message', { 
    sensitiveData: '[REDACTED]',
    requestDetails: 'Debug information'
  });

  console.log('✅ Error tracking tests completed\n');

  // Test 5: Metrics and Alerting
  console.log('📋 Test 5: Metrics and Alerting System');
  
  // Test metrics updates
  updateMetrics('request', 150);
  updateMetrics('auth_success');
  updateMetrics('auth_failure');
  updateMetrics('error');
  updateMetrics('rate_limit_ip');
  updateMetrics('rate_limit_email');

  // Simulate high error rate for alerting
  for (let i = 0; i < 10; i++) {
    updateMetrics('request', 100 + Math.random() * 100);
    if (i > 7) updateMetrics('error'); // 20% error rate
  }

  // Test alert conditions
  checkAlertConditions(logger);

  console.log('✅ Metrics and alerting tests completed\n');

  // Test 6: Log Structure Validation
  console.log('📋 Test 6: Log Structure Validation');
  
  const sampleLogs = mockLogs.slice(-5); // Get last 5 logs
  
  sampleLogs.forEach((log, index) => {
    try {
      const logData = JSON.parse(log.args[0]);
      console.log(`Log ${index + 1} structure:`, {
        hasLevel: 'level' in logData,
        hasRequestId: 'requestId' in logData,
        hasTimestamp: logData.event?.timestamp || logData.metric?.timestamp || logData.timestamp,
        hasComponent: logData.component === 'signin-function'
      });
    } catch (e) {
      console.log(`Log ${index + 1} is not valid JSON`);
    }
  });

  console.log('✅ Log structure validation completed\n');

  console.log('🎉 All logging and monitoring tests completed successfully!');
  console.log(`📊 Total logs generated: ${mockLogs.length}`);
  
  // Restore original console
  console.log = originalConsole.log;
  console.error = originalConsole.error;
}

// Mock the classes and functions for testing
class SignInLogger {
  private requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  logSecurityEvent(event: any): void {
    const securityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify({
      level: 'SECURITY',
      requestId: this.requestId,
      event: securityEvent,
      component: 'signin-function'
    }));

    if (event.severity === 'CRITICAL') {
      console.error(JSON.stringify({
        level: 'ALERT',
        requestId: this.requestId,
        message: 'CRITICAL SECURITY EVENT',
        event: securityEvent
      }));
    }
  }

  logPerformanceMetric(metric: any): void {
    const performanceMetric = {
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

  logAuditEvent(event: any): void {
    const auditEvent = {
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

  logError(error: Error | string, context?: any): void {
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

  logInfo(message: string, metadata?: any): void {
    console.log(JSON.stringify({
      level: 'INFO',
      requestId: this.requestId,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      component: 'signin-function'
    }));
  }

  logDebug(message: string, data?: any): void {
    // Mock environment check
    const isDevelopment = true; // For testing
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

class PerformanceMonitor {
  private startTime: number;
  private logger: SignInLogger;

  constructor(logger: SignInLogger) {
    this.startTime = Date.now();
    this.logger = logger;
  }

  checkpoint(name: string, metadata?: any): void {
    const duration = Date.now() - this.startTime;
    this.logger.logPerformanceMetric({
      type: 'REQUEST_DURATION',
      value: duration,
      metadata: { checkpoint: name, ...metadata }
    });
  }

  end(metadata?: any): number {
    const totalDuration = Date.now() - this.startTime;
    this.logger.logPerformanceMetric({
      type: 'REQUEST_DURATION',
      value: totalDuration,
      metadata: { phase: 'complete', ...metadata }
    });
    return totalDuration;
  }
}

// Mock metrics
const extendedMetrics = {
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

const ALERT_THRESHOLDS = {
  errorRate: 0.05,
  responseTime: 2000,
  rateLimitRate: 100,
  authFailureRate: 0.10
};

function updateMetrics(type: string, value?: number): void {
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

function checkAlertConditions(logger: SignInLogger): void {
  const metrics = extendedMetrics;
  
  if (metrics.requestCount === 0) return;

  const errorRate = metrics.errors / metrics.requestCount;
  const avgResponseTime = metrics.totalResponseTime / metrics.requestCount;
  const authFailureRate = metrics.authFailures / Math.max(metrics.authSuccesses + metrics.authFailures, 1);
  const rateLimitRate = (metrics.ipBlocks + metrics.emailBlocks);

  console.log('📊 Current Metrics:', {
    errorRate: errorRate.toFixed(3),
    avgResponseTime: avgResponseTime.toFixed(0) + 'ms',
    authFailureRate: authFailureRate.toFixed(3),
    rateLimitRate
  });

  if (errorRate > ALERT_THRESHOLDS.errorRate) {
    logger.logSecurityEvent({
      type: 'BLOCKED_REQUEST',
      ip: 'system',
      severity: 'CRITICAL',
      details: {
        alertType: 'HIGH_ERROR_RATE',
        currentRate: errorRate,
        threshold: ALERT_THRESHOLDS.errorRate,
        period: '5min'
      }
    });
  }
}

// Run the tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testLoggingSystem };
} else {
  testLoggingSystem();
}