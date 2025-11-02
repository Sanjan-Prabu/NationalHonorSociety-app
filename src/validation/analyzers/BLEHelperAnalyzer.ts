import { readFileSync } from 'fs';
import { BridgeValidationResult, BLEHelperAnalysis, SecurityAnalysis, CollisionAnalysis } from '../types/ValidationTypes';

export class BLEHelperAnalyzer {
  private helperContent: string;
  private filePath: string;

  constructor(helperPath: string) {
    this.filePath = helperPath;
    try {
      this.helperContent = readFileSync(helperPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read BLEHelper file at ${helperPath}: ${error}`);
    }
  }

  /**
   * Perform comprehensive analysis of BLEHelper implementation
   */
  public analyze(): BLEHelperAnalysis {
    return {
      sessionTokenGeneration: this.analyzeSessionTokenGeneration(),
      tokenHashingAlgorithm: this.analyzeTokenHashingAlgorithm(),
      organizationCodeMapping: this.validateOrganizationCodeMapping(),
      uuidValidation: this.validateUUIDHandling(),
      distanceCalculation: this.validateDistanceCalculation(),
      collisionResistance: this.analyzeCollisionResistance(),
      overallSecurity: this.calculateOverallSecurity()
    };
  }

  /**
   * Implement session token generation security validator for cryptographic randomness
   */
  private analyzeSessionTokenGeneration(): SecurityAnalysis {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const vulnerabilities: string[] = [];

    // Check for token generation methods
    const hasTokenGeneration = this.helperContent.includes('generateToken') || 
                              this.helperContent.includes('createSession') ||
                              this.helperContent.includes('sessionToken');

    if (!hasTokenGeneration) {
      issues.push("No token generation methods found in BLEHelper");
      recommendations.push("Implement secure token generation functionality");
    }

    // Check for cryptographic randomness
    const hasCryptoRandom = this.helperContent.includes('crypto.randomBytes') ||
                           this.helperContent.includes('Math.random') ||
                           this.helperContent.includes('uuid') ||
                           this.helperContent.includes('nanoid');

    if (hasTokenGeneration && !hasCryptoRandom) {
      vulnerabilities.push("Token generation without cryptographic randomness");
      recommendations.push("Use cryptographically secure random number generation");
    }

    // Check for weak randomness (Math.random)
    if (this.helperContent.includes('Math.random')) {
      vulnerabilities.push("Using Math.random() for token generation (weak randomness)");
      recommendations.push("Replace Math.random() with crypto.randomBytes() or similar");
    }

    // Check for token length and entropy
    const tokenLengthPattern = /token.*?length.*?(\d+)/gi;
    const lengthMatches = this.helperContent.match(tokenLengthPattern);
    
    if (lengthMatches) {
      const lengths = lengthMatches.map(match => {
        const num = match.match(/\d+/);
        return num ? parseInt(num[0]) : 0;
      });
      
      const minLength = Math.min(...lengths);
      if (minLength < 12) {
        vulnerabilities.push(`Token length too short: ${minLength} characters`);
        recommendations.push("Use minimum 12-character tokens for adequate entropy");
      }
    }

    // Check for token character set
    const hasAlphanumeric = this.helperContent.includes('alphanumeric') ||
                           this.helperContent.includes('0-9a-zA-Z') ||
                           this.helperContent.includes('[A-Z0-9]');

    if (hasTokenGeneration && !hasAlphanumeric) {
      issues.push("Token character set not clearly defined");
      recommendations.push("Use well-defined alphanumeric character set for tokens");
    }

    // Check for token validation
    const hasTokenValidation = this.helperContent.includes('validateToken') ||
                              this.helperContent.includes('isValidToken');

    if (hasTokenGeneration && !hasTokenValidation) {
      issues.push("No token validation methods found");
      recommendations.push("Implement token format validation");
    }

    return {
      passed: vulnerabilities.length === 0 && issues.length === 0,
      issues,
      recommendations,
      vulnerabilities,
      score: Math.max(0, 100 - (vulnerabilities.length * 30) - (issues.length * 15)),
      riskLevel: vulnerabilities.length > 0 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Build token hashing algorithm analyzer for Minor field encoding
   */
  private analyzeTokenHashingAlgorithm(): SecurityAnalysis {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const vulnerabilities: string[] = [];

    // Check for hashing implementation
    const hasHashing = this.helperContent.includes('hash') ||
                      this.helperContent.includes('encode') ||
                      this.helperContent.includes('minor');

    if (!hasHashing) {
      issues.push("No token hashing/encoding methods found");
      recommendations.push("Implement token hashing for Minor field encoding");
    }

    // Check for secure hashing algorithms
    const hasSecureHash = this.helperContent.includes('sha256') ||
                         this.helperContent.includes('sha1') ||
                         this.helperContent.includes('md5') ||
                         this.helperContent.includes('crypto.createHash');

    if (hasHashing && !hasSecureHash) {
      issues.push("No cryptographic hashing algorithm detected");
      recommendations.push("Use cryptographic hash function (SHA-256 recommended)");
    }

    // Check for weak hashing (MD5)
    if (this.helperContent.includes('md5')) {
      vulnerabilities.push("Using MD5 hash algorithm (cryptographically broken)");
      recommendations.push("Replace MD5 with SHA-256 or stronger algorithm");
    }

    // Check for Minor field encoding
    const hasMinorEncoding = this.helperContent.includes('minor') &&
                            (this.helperContent.includes('encode') || this.helperContent.includes('hash'));

    if (!hasMinorEncoding) {
      issues.push("No Minor field encoding implementation found");
      recommendations.push("Implement token-to-Minor field encoding");
    }

    // Check for collision handling
    const hasCollisionHandling = this.helperContent.includes('collision') ||
                                this.helperContent.includes('duplicate') ||
                                this.helperContent.includes('unique');

    if (hasHashing && !hasCollisionHandling) {
      issues.push("No hash collision handling detected");
      recommendations.push("Implement collision detection and handling");
    }

    // Check for hash truncation (for 16-bit Minor field)
    const hasMinorTruncation = this.helperContent.includes('0xFFFF') ||
                              this.helperContent.includes('65535') ||
                              this.helperContent.includes('% 65536');

    if (hasMinorEncoding && !hasMinorTruncation) {
      issues.push("No Minor field truncation for 16-bit limit detected");
      recommendations.push("Implement proper hash truncation for 16-bit Minor field");
    }

    // Check for salt usage
    const hasSalt = this.helperContent.includes('salt') ||
                   this.helperContent.includes('pepper') ||
                   this.helperContent.includes('orgId');

    if (hasHashing && !hasSalt) {
      vulnerabilities.push("Hash function without salt/organization context");
      recommendations.push("Add organization-specific salt to prevent rainbow table attacks");
    }

    return {
      passed: vulnerabilities.length === 0 && issues.length === 0,
      issues,
      recommendations,
      vulnerabilities,
      score: Math.max(0, 100 - (vulnerabilities.length * 25) - (issues.length * 15)),
      riskLevel: vulnerabilities.length > 0 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Create organization code mapping validator for NHS/NHSA differentiation
   */
  private validateOrganizationCodeMapping(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for organization code constants or mapping
    const hasOrgCodes = this.helperContent.includes('NHS') ||
                       this.helperContent.includes('NHSA') ||
                       this.helperContent.includes('orgCode') ||
                       this.helperContent.includes('organizationCode');

    if (!hasOrgCodes) {
      issues.push("No organization code mapping found");
      recommendations.push("Implement NHS/NHSA organization code mapping");
    }

    // Check for Major field organization mapping
    const hasMajorMapping = this.helperContent.includes('major') &&
                           (this.helperContent.includes('org') || this.helperContent.includes('NHS'));

    if (!hasMajorMapping) {
      issues.push("No Major field organization mapping detected");
      recommendations.push("Map organization codes to Major field values");
    }

    // Check for organization validation
    const hasOrgValidation = this.helperContent.includes('validateOrg') ||
                            this.helperContent.includes('isValidOrg') ||
                            this.helperContent.includes('checkOrganization');

    if (hasOrgCodes && !hasOrgValidation) {
      issues.push("No organization code validation found");
      recommendations.push("Implement organization code validation");
    }

    // Check for organization isolation
    const hasOrgIsolation = this.helperContent.includes('isolation') ||
                           this.helperContent.includes('separate') ||
                           this.helperContent.includes('filter');

    if (hasOrgCodes && !hasOrgIsolation) {
      issues.push("No organization isolation logic detected");
      recommendations.push("Implement organization-based filtering and isolation");
    }

    // Check for hardcoded organization values
    const hasHardcodedValues = this.helperContent.includes('= 1') ||
                              this.helperContent.includes('= 2') ||
                              this.helperContent.match(/NHS.*?=.*?\d/);

    if (hasHardcodedValues) {
      issues.push("Hardcoded organization values detected");
      recommendations.push("Use configuration or constants for organization codes");
    }

    // Check for organization context handling
    const hasOrgContext = this.helperContent.includes('getOrgCode') ||
                         this.helperContent.includes('getCurrentOrg') ||
                         this.helperContent.includes('orgContext');

    if (hasOrgCodes && !hasOrgContext) {
      issues.push("No organization context handling found");
      recommendations.push("Implement organization context retrieval");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 20))
    };
  }

  /**
   * Implement UUID validation checker for APP_UUID format compliance
   */
  private validateUUIDHandling(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for UUID usage
    const hasUUID = this.helperContent.includes('UUID') ||
                   this.helperContent.includes('uuid') ||
                   this.helperContent.includes('APP_UUID');

    if (!hasUUID) {
      issues.push("No UUID handling found");
      recommendations.push("Implement APP_UUID configuration and usage");
    }

    // Check for UUID format validation
    const hasUUIDValidation = this.helperContent.includes('validateUUID') ||
                             this.helperContent.includes('isValidUUID') ||
                             this.helperContent.includes('UUID.*format');

    if (hasUUID && !hasUUIDValidation) {
      issues.push("No UUID format validation found");
      recommendations.push("Implement UUID format validation (RFC 4122)");
    }

    // Check for UUID format pattern
    const uuidPattern = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    const hasUUIDPattern = uuidPattern.test(this.helperContent);

    if (hasUUID && !hasUUIDPattern) {
      issues.push("No valid UUID format pattern detected");
      recommendations.push("Ensure UUID follows standard format (8-4-4-4-12 hex digits)");
    }

    // Check for APP_UUID configuration
    const hasAPPUUID = this.helperContent.includes('APP_UUID') ||
                      this.helperContent.includes('Constants.expoConfig');

    if (!hasAPPUUID) {
      issues.push("No APP_UUID configuration found");
      recommendations.push("Configure APP_UUID from app configuration");
    }

    // Check for UUID case handling
    const hasUUIDCase = this.helperContent.includes('toUpperCase') ||
                       this.helperContent.includes('toLowerCase');

    if (hasUUID && !hasUUIDCase) {
      issues.push("No UUID case normalization detected");
      recommendations.push("Normalize UUID case (typically uppercase for BLE)");
    }

    // Check for default UUID handling
    const hasDefaultUUID = this.helperContent.includes('00000000-0000-0000-0000-000000000000') ||
                          this.helperContent.includes('default') && this.helperContent.includes('UUID');

    if (hasAPPUUID && !hasDefaultUUID) {
      issues.push("No default UUID fallback found");
      recommendations.push("Provide default UUID fallback for missing configuration");
    }

    // Check for UUID uniqueness validation
    const hasUniqueValidation = this.helperContent.includes('unique') ||
                               this.helperContent.includes('duplicate') ||
                               this.helperContent.includes('conflict');

    if (hasUUID && !hasUniqueValidation) {
      issues.push("No UUID uniqueness validation found");
      recommendations.push("Validate UUID uniqueness across organizations");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 15))
    };
  }

  /**
   * Add collision resistance calculator for token hash distribution analysis
   */
  private analyzeCollisionResistance(): CollisionAnalysis {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Analyze hash space and collision probability
    const hasMinorField = this.helperContent.includes('minor');
    const has16BitLimit = this.helperContent.includes('0xFFFF') ||
                         this.helperContent.includes('65535') ||
                         this.helperContent.includes('% 65536');

    let hashSpace = 65536; // 16-bit Minor field default
    let expectedCollisions = 0;

    if (hasMinorField && has16BitLimit) {
      // Calculate birthday paradox for 16-bit space
      // For n sessions, probability of collision ≈ n²/(2*hashSpace)
      const maxSessions = 275; // From requirements
      expectedCollisions = (maxSessions * maxSessions) / (2 * hashSpace);
      
      if (expectedCollisions > 0.01) { // 1% collision probability
        issues.push(`High collision probability: ${(expectedCollisions * 100).toFixed(2)}% for ${maxSessions} sessions`);
        recommendations.push("Consider using larger hash space or collision detection");
      }
    }

    // Check for collision detection implementation
    const hasCollisionDetection = this.helperContent.includes('collision') ||
                                 this.helperContent.includes('duplicate') ||
                                 this.helperContent.includes('exists');

    if (!hasCollisionDetection) {
      issues.push("No collision detection mechanism found");
      recommendations.push("Implement hash collision detection and handling");
    }

    // Check for hash distribution quality
    const hasHashDistribution = this.helperContent.includes('distribution') ||
                               this.helperContent.includes('uniform') ||
                               this.helperContent.includes('entropy');

    if (!hasHashDistribution) {
      issues.push("No hash distribution analysis found");
      recommendations.push("Analyze hash function distribution quality");
    }

    // Check for collision resolution strategy
    const hasCollisionResolution = this.helperContent.includes('resolve') ||
                                  this.helperContent.includes('retry') ||
                                  this.helperContent.includes('regenerate');

    if (hasCollisionDetection && !hasCollisionResolution) {
      issues.push("Collision detection without resolution strategy");
      recommendations.push("Implement collision resolution (retry, regenerate, etc.)");
    }

    return {
      hashSpaceSize: hashSpace,
      expectedCollisionRate: expectedCollisions,
      collisionProbability: expectedCollisions,
      maxRecommendedSessions: Math.floor(Math.sqrt(hashSpace * 0.01 * 2)), // 1% collision threshold
      issues,
      recommendations,
      riskLevel: expectedCollisions > 0.05 ? 'HIGH' : expectedCollisions > 0.01 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Build distance calculation validator if RSSI-to-meters conversion exists
   */
  private validateDistanceCalculation(): BridgeValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for distance calculation methods
    const hasDistanceCalc = this.helperContent.includes('distance') ||
                           this.helperContent.includes('RSSI') ||
                           this.helperContent.includes('proximity');

    if (!hasDistanceCalc) {
      // This is optional functionality, so no issues if not present
      return {
        passed: true,
        issues: [],
        recommendations: ["Consider implementing RSSI-based distance estimation if proximity detection is needed"],
        score: 100
      };
    }

    // Check for RSSI handling
    const hasRSSI = this.helperContent.includes('RSSI') ||
                   this.helperContent.includes('rssi') ||
                   this.helperContent.includes('signalStrength');

    if (hasDistanceCalc && !hasRSSI) {
      issues.push("Distance calculation without RSSI input");
      recommendations.push("Use RSSI values for distance estimation");
    }

    // Check for distance formula
    const hasDistanceFormula = this.helperContent.includes('Math.pow') ||
                              this.helperContent.includes('**') ||
                              this.helperContent.includes('log') ||
                              this.helperContent.includes('formula');

    if (hasDistanceCalc && !hasDistanceFormula) {
      issues.push("Distance calculation without proper formula");
      recommendations.push("Implement proper RSSI-to-distance conversion formula");
    }

    // Check for calibration parameters
    const hasCalibration = this.helperContent.includes('calibration') ||
                          this.helperContent.includes('txPower') ||
                          this.helperContent.includes('pathLoss');

    if (hasDistanceCalc && !hasCalibration) {
      issues.push("Distance calculation without calibration parameters");
      recommendations.push("Add device-specific calibration parameters");
    }

    // Check for accuracy considerations
    const hasAccuracyHandling = this.helperContent.includes('accuracy') ||
                               this.helperContent.includes('error') ||
                               this.helperContent.includes('margin');

    if (hasDistanceCalc && !hasAccuracyHandling) {
      issues.push("No distance accuracy considerations found");
      recommendations.push("Document distance estimation accuracy limitations");
    }

    // Check for proximity thresholds
    const hasProximityThreshold = this.helperContent.includes('threshold') ||
                                 this.helperContent.includes('range') ||
                                 this.helperContent.includes('meters');

    if (hasDistanceCalc && !hasProximityThreshold) {
      issues.push("No proximity thresholds defined");
      recommendations.push("Define proximity thresholds for attendance validation");
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      score: Math.max(0, 100 - (issues.length * 20))
    };
  }

  /**
   * Calculate overall security rating based on all analysis results
   */
  private calculateOverallSecurity(): 'SECURE' | 'MODERATE' | 'VULNERABLE' {
    const tokenSecurity = this.analyzeSessionTokenGeneration();
    const hashingSecurity = this.analyzeTokenHashingAlgorithm();
    const collisionAnalysis = this.analyzeCollisionResistance();

    // Count high-risk vulnerabilities
    const highRiskVulnerabilities = 
      (tokenSecurity.vulnerabilities?.length || 0) +
      (hashingSecurity.vulnerabilities?.length || 0) +
      (collisionAnalysis.riskLevel === 'HIGH' ? 1 : 0);

    // Count medium-risk issues
    const mediumRiskIssues = 
      (tokenSecurity.riskLevel === 'MEDIUM' ? 1 : 0) +
      (hashingSecurity.riskLevel === 'MEDIUM' ? 1 : 0) +
      (collisionAnalysis.riskLevel === 'MEDIUM' ? 1 : 0);

    if (highRiskVulnerabilities > 0) {
      return 'VULNERABLE';
    } else if (mediumRiskIssues > 1) {
      return 'MODERATE';
    } else {
      return 'SECURE';
    }
  }
}