// Security configuration for the chat system
export const SECURITY_CONFIG = {
  // SQL Injection prevention patterns
  DANGEROUS_SQL_KEYWORDS: [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE',
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'xp_', 'sp_', '--', '/*', '*/',
    'UNION', 'INFORMATION_SCHEMA', 'sys.', 'master.', 'tempdb.'
  ],
  
  DANGEROUS_SQL_PATTERNS: [
    /DROP\s+/i, /DELETE\s+/i, /INSERT\s+/i, /UPDATE\s+/i, /ALTER\s+/i, /CREATE\s+/i,
    /TRUNCATE\s+/i, /GRANT\s+/i, /REVOKE\s+/i, /EXEC\s+/i, /EXECUTE\s+/i,
    /xp_/i, /sp_/i, /--/, /\/\*/, /\*\//, /UNION\s+ALL/i, /UNION\s+SELECT/i
  ],
  
  // XSS prevention patterns
  SUSPICIOUS_CONTENT_PATTERNS: [
    /script/i, /javascript:/i, /data:/i, /vbscript:/i, /onload/i, /onerror/i,
    /<iframe/i, /<object/i, /<embed/i, /<link/i, /<meta/i
  ],
  
  // Rate limiting settings
  RATE_LIMITS: {
    MAX_MESSAGES_PER_REQUEST: 50,
    MAX_MESSAGE_LENGTH: 10000,
    MAX_REQUESTS_PER_MINUTE: 100,
    MAX_REQUESTS_PER_HOUR: 1000
  },
  
  // Model safety settings
  MODEL_SAFETY: {
    MAX_STEPS: 5,
    TEMPERATURE: 0.5,
    MAX_TOKENS: 4000
  },
  
  // Database access restrictions
  DATABASE_RESTRICTIONS: {
    MAX_QUERY_RESULTS: 1000,
    FORBIDDEN_TABLES: ['sqlite_master', 'sqlite_temp_master', 'information_schema'],
    ALLOWED_QUERY_TYPES: ['SELECT']
  }
};

// Security utility functions
export const SecurityUtils = {
  // Validate SQL query safety
  validateSqlQuery: (query: string): { isValid: boolean; reason?: string } => {
    const upperQuery = query.toUpperCase().trim();
    
    // Check if it's a SELECT query
    if (!upperQuery.startsWith('SELECT')) {
      return { isValid: false, reason: 'Only SELECT queries are allowed' };
    }
    
    // Check for dangerous keywords
    for (const keyword of SECURITY_CONFIG.DANGEROUS_SQL_KEYWORDS) {
      if (upperQuery.includes(keyword)) {
        return { isValid: false, reason: `Dangerous keyword detected: ${keyword}` };
      }
    }
    
    // Check for dangerous patterns
    for (const pattern of SECURITY_CONFIG.DANGEROUS_SQL_PATTERNS) {
      if (pattern.test(query)) {
        return { isValid: false, reason: 'Dangerous SQL pattern detected' };
      }
    }
    
    return { isValid: true };
  },
  
  // Sanitize user input
  sanitizeInput: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .trim();
  },
  
  // Validate message content
  validateMessageContent: (content: string): { isValid: boolean; reason?: string } => {
    if (typeof content !== 'string') {
      return { isValid: false, reason: 'Content must be a string' };
    }
    
    if (content.length > SECURITY_CONFIG.RATE_LIMITS.MAX_MESSAGE_LENGTH) {
      return { isValid: false, reason: 'Message too long' };
    }
    
    // Check for suspicious patterns
    for (const pattern of SECURITY_CONFIG.SUSPICIOUS_CONTENT_PATTERNS) {
      if (pattern.test(content)) {
        return { isValid: false, reason: 'Suspicious content detected' };
      }
    }
    
    return { isValid: true };
  }
}; 