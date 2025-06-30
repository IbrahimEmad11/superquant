// Security logging utility for tracking potential security incidents
export interface SecurityEvent {
  timestamp: Date;
  eventType: 'SQL_INJECTION_ATTEMPT' | 'XSS_ATTEMPT' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_CONTENT' | 'UNAUTHORIZED_ACCESS';
  userId?: string;
  ipAddress?: string;
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory

  log(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(securityEvent);
    
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console for development
    console.warn(`[SECURITY] ${event.eventType}: ${event.details}`, {
      severity: event.severity,
      userId: event.userId,
      timestamp: securityEvent.timestamp
    });

    // In production, you would send this to a security monitoring service
    // await this.sendToSecurityService(securityEvent);
  }

  getRecentEvents(minutes: number = 60): SecurityEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.events.filter(event => event.timestamp > cutoff);
  }

  getEventsByType(eventType: SecurityEvent['eventType']): SecurityEvent[] {
    return this.events.filter(event => event.eventType === eventType);
  }

  getHighSeverityEvents(): SecurityEvent[] {
    return this.events.filter(event => 
      event.severity === 'HIGH' || event.severity === 'CRITICAL'
    );
  }

  // Method to send events to external security monitoring service
  private async sendToSecurityService(event: SecurityEvent) {
    // Implementation for production security monitoring
    // This could send to services like:
    // - AWS CloudWatch
    // - Datadog
    // - Splunk
    // - Custom security dashboard
  }
}

export const securityLogger = new SecurityLogger();

// Convenience functions for common security events
export const SecurityEvents = {
  logSqlInjectionAttempt: (userId?: string, details?: string) => {
    securityLogger.log({
      eventType: 'SQL_INJECTION_ATTEMPT',
      userId,
      details: details || 'SQL injection attempt detected',
      severity: 'HIGH'
    });
  },

  logXssAttempt: (userId?: string, details?: string) => {
    securityLogger.log({
      eventType: 'XSS_ATTEMPT',
      userId,
      details: details || 'XSS attempt detected',
      severity: 'HIGH'
    });
  },

  logRateLimitExceeded: (userId?: string, details?: string) => {
    securityLogger.log({
      eventType: 'RATE_LIMIT_EXCEEDED',
      userId,
      details: details || 'Rate limit exceeded',
      severity: 'MEDIUM'
    });
  },

  logSuspiciousContent: (userId?: string, details?: string) => {
    securityLogger.log({
      eventType: 'SUSPICIOUS_CONTENT',
      userId,
      details: details || 'Suspicious content detected',
      severity: 'MEDIUM'
    });
  },

  logUnauthorizedAccess: (userId?: string, details?: string) => {
    securityLogger.log({
      eventType: 'UNAUTHORIZED_ACCESS',
      userId,
      details: details || 'Unauthorized access attempt',
      severity: 'CRITICAL'
    });
  }
}; 