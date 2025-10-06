# Comprehensive Logging and Monitoring System

## Overview

The signin function implements a comprehensive logging and monitoring system that provides security event tracking, performance monitoring, audit logging for compliance, and real-time alerting capabilities.

## Logging Architecture

### 1. Structured Logging

All logs are output in structured JSON format with the following structure:

```json
{
  "level": "SECURITY|PERFORMANCE|AUDIT|ERROR|INFO|DEBUG",
  "requestId": "uuid-v4",
  "timestamp": "ISO-8601-timestamp",
  "component": "signin-function",
  "event|metric|error|message": {...}
}
```

### 2. Log Levels

- **SECURITY**: Security-related events (auth attempts, rate limiting, blocked requests)
- **PERFORMANCE**: Performance metrics and monitoring data
- **AUDIT**: Compliance and audit trail events
- **ERROR**: Error conditions and exceptions
- **INFO**: General informational messages
- **DEBUG**: Debug information (development only)
- **ALERT**: Critical events requiring immediate attention

## Security Event Logging

### Event Types

1. **AUTH_SUCCESS**: Successful authentication
2. **AUTH_FAILURE**: Failed authentication attempts
3. **RATE_LIMIT_IP**: IP-based rate limiting triggered
4. **RATE_LIMIT_EMAIL**: Email-based rate limiting triggered
5. **VALIDATION_ERROR**: Input validation failures
6. **BLOCKED_REQUEST**: Requests blocked for security reasons

### Security Event Structure

```json
{
  "type": "AUTH_FAILURE",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "email": "user@example.com",
  "userId": "uuid",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "details": {
    "reason": "INVALID_CREDENTIALS",
    "authDuration": 150,
    "errorCode": 401
  }
}
```

### Severity Levels

- **LOW**: Normal security events (successful auth, minor validation errors)
- **MEDIUM**: Concerning events (auth failures, rate limiting)
- **HIGH**: Serious security events (repeated failures, high rate limiting)
- **CRITICAL**: Immediate attention required (system-wide issues)

## Performance Monitoring

### Metrics Tracked

1. **REQUEST_DURATION**: Total request processing time
2. **AUTH_LATENCY**: Supabase authentication call duration
3. **ERROR_RATE**: Percentage of failed requests

### Performance Checkpoints

The system tracks performance at key checkpoints:
- `request_start`: Request received
- `rate_limit_check`: Rate limiting validation complete
- `body_parsing`: Request body parsed and validated
- `input_validation`: Input validation complete
- `email_rate_limit_check`: Email rate limiting complete
- `authentication`: Supabase auth call complete
- `token_strategy`: Token handling strategy determined

### Performance Metrics Structure

```json
{
  "type": "REQUEST_DURATION",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "value": 250,
  "metadata": {
    "checkpoint": "authentication",
    "userId": "uuid",
    "result": "success"
  }
}
```

## Audit Logging for Compliance

### Audit Event Types

1. **USER_LOGIN**: Successful user login
2. **LOGIN_ATTEMPT**: Authentication attempt (success/failure)
3. **SECURITY_VIOLATION**: Security policy violations
4. **SYSTEM_ERROR**: System-level errors

### Audit Event Structure

```json
{
  "type": "USER_LOGIN",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "userId": "uuid",
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "action": "SUCCESSFUL_LOGIN",
  "result": "SUCCESS|FAILURE|BLOCKED",
  "details": {
    "tokenStrategy": "cookie",
    "authDuration": 150,
    "sessionExpiresAt": 1704110400
  }
}
```

## Real-Time Monitoring and Alerting

### Alert Thresholds

```typescript
const ALERT_THRESHOLDS = {
  errorRate: 0.05,           // 5% error rate
  responseTime: 2000,        // 2000ms response time
  rateLimitRate: 100,        // 100 rate limits per hour
  authFailureRate: 0.10      // 10% auth failure rate
};
```

### Monitored Metrics (5-minute windows)

1. **Error Rate**: Percentage of requests resulting in errors
2. **Average Response Time**: Mean request processing time
3. **Authentication Failure Rate**: Percentage of failed auth attempts
4. **Rate Limiting Frequency**: Number of rate limit blocks

### Alert Conditions

When thresholds are exceeded, the system logs CRITICAL severity events:

```json
{
  "level": "SECURITY",
  "event": {
    "type": "BLOCKED_REQUEST",
    "severity": "CRITICAL",
    "details": {
      "alertType": "HIGH_ERROR_RATE",
      "currentRate": 0.08,
      "threshold": 0.05,
      "period": "5min"
    }
  }
}
```

## System Health Monitoring

### Health Summary (Every 5 minutes)

```json
{
  "level": "INFO",
  "message": "System health summary",
  "metadata": {
    "period": "5min",
    "metrics": {
      "totalRequests": 1250,
      "errorRate": 0.02,
      "avgResponseTime": 180,
      "authSuccessRate": 0.95,
      "rateLimitBlocks": 15,
      "memoryUsage": {
        "ipRateLimitEntries": 45,
        "emailRateLimitEntries": 23
      }
    }
  }
}
```

## Log Analysis and Monitoring Setup

### Recommended Log Aggregation

1. **Supabase Dashboard**: Built-in function logs
2. **External SIEM**: Forward logs to security information and event management systems
3. **Monitoring Tools**: Integrate with Datadog, New Relic, or similar platforms

### Key Queries for Monitoring

#### Security Events
```bash
# Failed authentication attempts by IP
grep '"type":"AUTH_FAILURE"' logs | jq -r '.event.ip' | sort | uniq -c | sort -nr

# Rate limiting events
grep '"type":"RATE_LIMIT"' logs | jq -r '.event.details.limitType' | sort | uniq -c

# Critical security events
grep '"severity":"CRITICAL"' logs | jq '.event'
```

#### Performance Monitoring
```bash
# Average response times
grep '"type":"REQUEST_DURATION"' logs | jq -r '.metric.value' | awk '{sum+=$1; count++} END {print sum/count}'

# Error rates
grep '"level":"ERROR"' logs | wc -l
```

#### Audit Trail
```bash
# Successful logins by user
grep '"type":"USER_LOGIN"' logs | jq -r '.event.email' | sort | uniq -c

# Security violations
grep '"type":"SECURITY_VIOLATION"' logs | jq '.event'
```

## Compliance and Data Retention

### Data Sensitivity

- **PII Handling**: Email addresses are logged for audit purposes
- **IP Addresses**: Logged for security monitoring
- **Passwords**: Never logged (sanitized in input validation)
- **Tokens**: Never logged in plain text

### Retention Recommendations

- **Security Logs**: 90 days minimum for incident investigation
- **Audit Logs**: 1 year minimum for compliance requirements
- **Performance Logs**: 30 days for operational monitoring
- **Debug Logs**: 7 days (development environments only)

## Integration with External Systems

### SIEM Integration

Forward logs to SIEM systems using structured JSON format:

```bash
# Example: Forward to Splunk
curl -X POST "https://splunk.example.com/services/collector" \
  -H "Authorization: Splunk <token>" \
  -d '{"event": <log-json>}'
```

### Alerting Integration

Set up webhooks for critical events:

```typescript
// Example: Slack webhook for critical alerts
if (event.severity === 'CRITICAL') {
  await fetch('https://hooks.slack.com/webhook', {
    method: 'POST',
    body: JSON.stringify({
      text: `🚨 Critical Security Event: ${event.type}`,
      attachments: [{ text: JSON.stringify(event.details) }]
    })
  });
}
```

## Troubleshooting and Debugging

### Common Log Patterns

1. **High Error Rate**: Look for validation errors or system errors
2. **Slow Response Times**: Check authentication latency and rate limiting
3. **Security Issues**: Monitor failed auth attempts and rate limiting patterns
4. **System Health**: Review periodic health summaries

### Debug Mode

Enable debug logging in development:

```bash
export ENVIRONMENT=development
```

This enables additional debug logs with sensitive data redacted.

## Performance Impact

### Logging Overhead

- **Structured Logging**: ~1-2ms per request
- **Performance Monitoring**: ~0.5ms per checkpoint
- **Metrics Collection**: ~0.1ms per metric update
- **Total Overhead**: ~5-10ms per request (2-5% of typical request time)

### Memory Usage

- **Rate Limit Storage**: ~100 bytes per IP/email entry
- **Metrics Storage**: ~1KB for 5-minute window
- **Log Buffers**: Minimal (direct console output)

## Security Considerations

### Log Security

1. **Access Control**: Restrict log access to authorized personnel
2. **Encryption**: Encrypt logs in transit and at rest
3. **Sanitization**: Sensitive data is redacted or hashed
4. **Audit Trail**: Log access is monitored and audited

### Privacy Compliance

- **GDPR**: Email addresses can be purged on user request
- **CCPA**: User data access includes relevant log entries
- **Data Minimization**: Only necessary data is logged
- **Consent**: Logging is covered in privacy policy

This comprehensive logging and monitoring system provides full visibility into the signin function's security, performance, and compliance posture while maintaining user privacy and system security.