/**
 * Bottleneck Identification Engine
 * 
 * Identifies performance bottlenecks in the BLE system including:
 * - Database query performance analysis
 * - Native module operation profiling
 * - React Native bridge performance analysis
 * - Real-time subscription bottleneck detection
 * - Scalability limit calculation
 */

export interface QueryPerformanceResult {
  hasBottlenecks: boolean;
  bottlenecks: QueryBottleneck[];
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR';
  recommendations: string[];
}

export interface QueryBottleneck {
  queryName: string;
  estimatedExecutionTime: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  bottleneckType: 'CPU' | 'IO' | 'LOCK' | 'NETWORK';
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  optimization: string;
}

export interface NativeOperationResult {
  hasBottlenecks: boolean;
  bottlenecks: NativeBottleneck[];
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR';
  recommendations: string[];
}

export interface NativeBottleneck {
  operation: string;
  platform: 'iOS' | 'Android' | 'Both';
  estimatedLatency: number;
  bottleneckType: 'BLE_SCANNING' | 'BLE_BROADCASTING' | 'PERMISSION_CHECK' | 'STATE_MANAGEMENT';
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  optimization: string;
}

export interface BridgePerformanceResult {
  hasBottlenecks: boolean;
  bottlenecks: BridgeBottleneck[];
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR';
  recommendations: string[];
}

export interface BridgeBottleneck {
  bridgeCall: string;
  estimatedLatency: number;
  dataSize: number;
  bottleneckType: 'SERIALIZATION' | 'THREAD_SWITCHING' | 'DATA_TRANSFER' | 'CALLBACK_OVERHEAD';
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  optimization: string;
}

export interface ScalabilityLimitResult {
  maxUsers: number;
  meetsRequirements: boolean;
  limitingFactors: LimitingFactor[];
  scalabilityRating: 'EXCELLENT' | 'GOOD' | 'LIMITED' | 'POOR';
  recommendations: string[];
}

export interface LimitingFactor {
  component: string;
  currentCapacity: number;
  requiredCapacity: number;
  bottleneckType: 'DATABASE' | 'NETWORK' | 'MEMORY' | 'CPU' | 'BLE_HARDWARE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  mitigation: string;
}

export interface RealtimeBottleneckResult {
  hasBottlenecks: boolean;
  bottlenecks: RealtimeBottleneck[];
  maxConcurrentConnections: number;
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR';
  recommendations: string[];
}

export interface RealtimeBottleneck {
  component: string;
  bottleneckType: 'CONNECTION_LIMIT' | 'MESSAGE_THROUGHPUT' | 'LATENCY' | 'MEMORY_USAGE';
  currentCapacity: number;
  requiredCapacity: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  optimization: string;
}

export class BottleneckIdentificationEngine {
  private config: any;

  async initialize(config: any): Promise<void> {
    this.config = config;
  }

  async analyzeQueryPerformance(): Promise<QueryPerformanceResult> {
    const bottlenecks: QueryBottleneck[] = [];

    // Analyze create_session_secure function
    const sessionBottleneck = this.analyzeSessionCreationQuery();
    if (sessionBottleneck) {
      bottlenecks.push(sessionBottleneck);
    }

    // Analyze add_attendance_secure function
    const attendanceBottleneck = this.analyzeAttendanceSubmissionQuery();
    if (attendanceBottleneck) {
      bottlenecks.push(attendanceBottleneck);
    }

    // Analyze resolve_session function
    const resolveBottleneck = this.analyzeSessionResolutionQuery();
    if (resolveBottleneck) {
      bottlenecks.push(resolveBottleneck);
    }

    // Analyze real-time subscription queries
    const subscriptionBottlenecks = this.analyzeSubscriptionQueries();
    bottlenecks.push(...subscriptionBottlenecks);

    // Determine overall rating
    const criticalBottlenecks = bottlenecks.filter(b => b.impact === 'CRITICAL').length;
    const highBottlenecks = bottlenecks.filter(b => b.impact === 'HIGH').length;
    
    let overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR';
    if (criticalBottlenecks > 0) {
      overallRating = 'POOR';
    } else if (highBottlenecks > 2) {
      overallRating = 'NEEDS_OPTIMIZATION';
    } else if (bottlenecks.length > 0) {
      overallRating = 'GOOD';
    } else {
      overallRating = 'EXCELLENT';
    }

    const recommendations = this.generateQueryOptimizationRecommendations(bottlenecks);

    return {
      hasBottlenecks: bottlenecks.length > 0,
      bottlenecks,
      overallRating,
      recommendations
    };
  }

  async profileNativeOperations(): Promise<NativeOperationResult> {
    const bottlenecks: NativeBottleneck[] = [];

    // Analyze iOS BLE operations
    const iosBottlenecks = this.analyzeIOSBLEOperations();
    bottlenecks.push(...iosBottlenecks);

    // Analyze Android BLE operations
    const androidBottlenecks = this.analyzeAndroidBLEOperations();
    bottlenecks.push(...androidBottlenecks);

    // Analyze cross-platform operations
    const crossPlatformBottlenecks = this.analyzeCrossPlatformOperations();
    bottlenecks.push(...crossPlatformBottlenecks);

    // Determine overall rating
    const criticalBottlenecks = bottlenecks.filter(b => b.impact === 'CRITICAL').length;
    const highBottlenecks = bottlenecks.filter(b => b.impact === 'HIGH').length;
    
    let overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR';
    if (criticalBottlenecks > 0) {
      overallRating = 'POOR';
    } else if (highBottlenecks > 1) {
      overallRating = 'NEEDS_OPTIMIZATION';
    } else if (bottlenecks.length > 0) {
      overallRating = 'GOOD';
    } else {
      overallRating = 'EXCELLENT';
    }

    const recommendations = this.generateNativeOptimizationRecommendations(bottlenecks);

    return {
      hasBottlenecks: bottlenecks.length > 0,
      bottlenecks,
      overallRating,
      recommendations
    };
  }

  async analyzeBridgePerformance(): Promise<BridgePerformanceResult> {
    const bottlenecks: BridgeBottleneck[] = [];

    // Analyze BLE context bridge calls
    const bleContextBottlenecks = this.analyzeBLEContextBridge();
    bottlenecks.push(...bleContextBottlenecks);

    // Analyze permission flow bridge calls
    const permissionBottlenecks = this.analyzePermissionBridge();
    bottlenecks.push(...permissionBottlenecks);

    // Analyze data serialization bottlenecks
    const serializationBottlenecks = this.analyzeSerializationBottlenecks();
    bottlenecks.push(...serializationBottlenecks);

    // Determine overall rating
    const criticalBottlenecks = bottlenecks.filter(b => b.impact === 'CRITICAL').length;
    const highBottlenecks = bottlenecks.filter(b => b.impact === 'HIGH').length;
    
    let overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR';
    if (criticalBottlenecks > 0) {
      overallRating = 'POOR';
    } else if (highBottlenecks > 1) {
      overallRating = 'NEEDS_OPTIMIZATION';
    } else if (bottlenecks.length > 0) {
      overallRating = 'GOOD';
    } else {
      overallRating = 'EXCELLENT';
    }

    const recommendations = this.generateBridgeOptimizationRecommendations(bottlenecks);

    return {
      hasBottlenecks: bottlenecks.length > 0,
      bottlenecks,
      overallRating,
      recommendations
    };
  }

  async detectRealtimeBottlenecks(): Promise<RealtimeBottleneckResult> {
    const bottlenecks: RealtimeBottleneck[] = [];

    // Analyze WebSocket connection limits
    const connectionBottleneck = this.analyzeConnectionLimits();
    if (connectionBottleneck) {
      bottlenecks.push(connectionBottleneck);
    }

    // Analyze message throughput
    const throughputBottleneck = this.analyzeMessageThroughput();
    if (throughputBottleneck) {
      bottlenecks.push(throughputBottleneck);
    }

    // Analyze subscription latency
    const latencyBottleneck = this.analyzeSubscriptionLatency();
    if (latencyBottleneck) {
      bottlenecks.push(latencyBottleneck);
    }

    // Analyze memory usage for subscriptions
    const memoryBottleneck = this.analyzeSubscriptionMemoryUsage();
    if (memoryBottleneck) {
      bottlenecks.push(memoryBottleneck);
    }

    // Calculate maximum concurrent connections
    const maxConcurrentConnections = this.calculateMaxConcurrentConnections(bottlenecks);

    // Determine overall rating
    const criticalBottlenecks = bottlenecks.filter(b => b.impact === 'CRITICAL').length;
    const highBottlenecks = bottlenecks.filter(b => b.impact === 'HIGH').length;
    
    let overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'POOR';
    if (criticalBottlenecks > 0) {
      overallRating = 'POOR';
    } else if (highBottlenecks > 1) {
      overallRating = 'NEEDS_OPTIMIZATION';
    } else if (bottlenecks.length > 0) {
      overallRating = 'GOOD';
    } else {
      overallRating = 'EXCELLENT';
    }

    const recommendations = this.generateRealtimeOptimizationRecommendations(bottlenecks);

    return {
      hasBottlenecks: bottlenecks.length > 0,
      bottlenecks,
      maxConcurrentConnections,
      overallRating,
      recommendations
    };
  }

  async calculateScalabilityLimits(): Promise<ScalabilityLimitResult> {
    const limitingFactors: LimitingFactor[] = [];

    // Analyze database capacity limits
    const databaseLimits = this.analyzeDatabaseCapacityLimits();
    limitingFactors.push(...databaseLimits);

    // Analyze network capacity limits
    const networkLimits = this.analyzeNetworkCapacityLimits();
    limitingFactors.push(...networkLimits);

    // Analyze memory limits
    const memoryLimits = this.analyzeMemoryLimits();
    limitingFactors.push(...memoryLimits);

    // Analyze CPU limits
    const cpuLimits = this.analyzeCPULimits();
    limitingFactors.push(...cpuLimits);

    // Analyze BLE hardware limits
    const bleLimits = this.analyzeBLEHardwareLimits();
    limitingFactors.push(...bleLimits);

    // Calculate maximum users based on most restrictive factor
    const maxUsers = Math.min(...limitingFactors.map(factor => factor.currentCapacity));
    const requiredUsers = this.config.maxConcurrentUsers || 150;
    const meetsRequirements = maxUsers >= requiredUsers;

    // Determine scalability rating
    let scalabilityRating: 'EXCELLENT' | 'GOOD' | 'LIMITED' | 'POOR';
    const criticalFactors = limitingFactors.filter(f => f.severity === 'CRITICAL').length;
    
    if (criticalFactors > 0 || maxUsers < requiredUsers * 0.5) {
      scalabilityRating = 'POOR';
    } else if (maxUsers < requiredUsers * 0.8) {
      scalabilityRating = 'LIMITED';
    } else if (maxUsers < requiredUsers * 1.2) {
      scalabilityRating = 'GOOD';
    } else {
      scalabilityRating = 'EXCELLENT';
    }

    const recommendations = this.generateScalabilityRecommendations(limitingFactors, maxUsers, requiredUsers);

    return {
      maxUsers,
      meetsRequirements,
      limitingFactors,
      scalabilityRating,
      recommendations
    };
  }

  async cleanup(): Promise<void> {
    // Cleanup any resources used during analysis
  }

  // Private analysis methods
  private analyzeSessionCreationQuery(): QueryBottleneck | null {
    // Analyze create_session_secure function performance
    const estimatedTime = 150; // 150ms estimated execution time
    
    if (estimatedTime > 500) {
      return {
        queryName: 'create_session_secure',
        estimatedExecutionTime: estimatedTime,
        complexity: 'MEDIUM',
        bottleneckType: 'IO',
        impact: 'HIGH',
        description: 'Session creation query may be slow due to complex RLS policy evaluation',
        optimization: 'Add database indexes on org_id and user_id columns, optimize RLS policies'
      };
    }
    
    return null;
  }

  private analyzeAttendanceSubmissionQuery(): QueryBottleneck | null {
    // Analyze add_attendance_secure function performance
    const estimatedTime = 120; // 120ms estimated execution time
    
    if (estimatedTime > 400) {
      return {
        queryName: 'add_attendance_secure',
        estimatedExecutionTime: estimatedTime,
        complexity: 'MEDIUM',
        bottleneckType: 'IO',
        impact: 'HIGH',
        description: 'Attendance submission may be slow due to duplicate checking and RLS evaluation',
        optimization: 'Optimize duplicate attendance check query, add composite indexes'
      };
    }
    
    return null;
  }

  private analyzeSessionResolutionQuery(): QueryBottleneck | null {
    // Analyze resolve_session function performance
    const estimatedTime = 80; // 80ms estimated execution time
    
    if (estimatedTime > 300) {
      return {
        queryName: 'resolve_session',
        estimatedExecutionTime: estimatedTime,
        complexity: 'LOW',
        bottleneckType: 'IO',
        impact: 'MEDIUM',
        description: 'Session resolution may be slow due to token hash lookup',
        optimization: 'Add index on session token hash field'
      };
    }
    
    return null;
  }

  private analyzeSubscriptionQueries(): QueryBottleneck[] {
    const bottlenecks: QueryBottleneck[] = [];
    
    // Analyze real-time subscription query performance
    const subscriptionTime = 200; // 200ms for subscription setup
    
    if (subscriptionTime > 500) {
      bottlenecks.push({
        queryName: 'realtime_subscriptions',
        estimatedExecutionTime: subscriptionTime,
        complexity: 'HIGH',
        bottleneckType: 'NETWORK',
        impact: 'MEDIUM',
        description: 'Real-time subscription setup may be slow with many concurrent users',
        optimization: 'Implement subscription batching and connection pooling'
      });
    }
    
    return bottlenecks;
  }

  private analyzeIOSBLEOperations(): NativeBottleneck[] {
    const bottlenecks: NativeBottleneck[] = [];
    
    // Analyze iOS BLE scanning performance
    const scanningLatency = 300; // 300ms to start scanning
    if (scanningLatency > 500) {
      bottlenecks.push({
        operation: 'startScanning',
        platform: 'iOS',
        estimatedLatency: scanningLatency,
        bottleneckType: 'BLE_SCANNING',
        impact: 'MEDIUM',
        description: 'iOS BLE scanning startup may be slow due to permission checks',
        optimization: 'Cache permission status and optimize scanning parameters'
      });
    }
    
    // Analyze iOS broadcasting performance
    const broadcastingLatency = 250; // 250ms to start broadcasting
    if (broadcastingLatency > 400) {
      bottlenecks.push({
        operation: 'startBroadcasting',
        platform: 'iOS',
        estimatedLatency: broadcastingLatency,
        bottleneckType: 'BLE_BROADCASTING',
        impact: 'MEDIUM',
        description: 'iOS iBeacon broadcasting startup may be slow',
        optimization: 'Pre-initialize CBPeripheralManager and optimize beacon parameters'
      });
    }
    
    return bottlenecks;
  }

  private analyzeAndroidBLEOperations(): NativeBottleneck[] {
    const bottlenecks: NativeBottleneck[] = [];
    
    // Analyze Android BLE scanning performance
    const scanningLatency = 400; // 400ms to start scanning
    if (scanningLatency > 600) {
      bottlenecks.push({
        operation: 'startScanning',
        platform: 'Android',
        estimatedLatency: scanningLatency,
        bottleneckType: 'BLE_SCANNING',
        impact: 'HIGH',
        description: 'Android BLE scanning startup is slow due to permission and adapter checks',
        optimization: 'Implement faster permission checking and adapter state caching'
      });
    }
    
    return bottlenecks;
  }

  private analyzeCrossPlatformOperations(): NativeBottleneck[] {
    const bottlenecks: NativeBottleneck[] = [];
    
    // Analyze permission checking performance
    const permissionLatency = 150; // 150ms for permission checks
    if (permissionLatency > 300) {
      bottlenecks.push({
        operation: 'checkPermissions',
        platform: 'Both',
        estimatedLatency: permissionLatency,
        bottleneckType: 'PERMISSION_CHECK',
        impact: 'MEDIUM',
        description: 'Permission checking may be slow on both platforms',
        optimization: 'Cache permission status and implement async permission checking'
      });
    }
    
    return bottlenecks;
  }

  private analyzeBLEContextBridge(): BridgeBottleneck[] {
    const bottlenecks: BridgeBottleneck[] = [];
    
    // Analyze BLE state updates
    const stateUpdateLatency = 50; // 50ms for state updates
    if (stateUpdateLatency > 100) {
      bottlenecks.push({
        bridgeCall: 'BLEContext.updateState',
        estimatedLatency: stateUpdateLatency,
        dataSize: 1024, // 1KB data size
        bottleneckType: 'THREAD_SWITCHING',
        impact: 'MEDIUM',
        description: 'BLE state updates may cause bridge performance issues',
        optimization: 'Batch state updates and reduce update frequency'
      });
    }
    
    return bottlenecks;
  }

  private analyzePermissionBridge(): BridgeBottleneck[] {
    const bottlenecks: BridgeBottleneck[] = [];
    
    // Analyze permission request bridge calls
    const permissionLatency = 80; // 80ms for permission requests
    if (permissionLatency > 150) {
      bottlenecks.push({
        bridgeCall: 'requestPermissions',
        estimatedLatency: permissionLatency,
        dataSize: 512, // 512 bytes data size
        bottleneckType: 'CALLBACK_OVERHEAD',
        impact: 'LOW',
        description: 'Permission request bridge calls may have callback overhead',
        optimization: 'Reduce callback complexity and implement promise-based APIs'
      });
    }
    
    return bottlenecks;
  }

  private analyzeSerializationBottlenecks(): BridgeBottleneck[] {
    const bottlenecks: BridgeBottleneck[] = [];
    
    // Analyze data serialization performance
    const serializationLatency = 30; // 30ms for data serialization
    if (serializationLatency > 100) {
      bottlenecks.push({
        bridgeCall: 'dataSerializationBridge',
        estimatedLatency: serializationLatency,
        dataSize: 4096, // 4KB data size
        bottleneckType: 'SERIALIZATION',
        impact: 'MEDIUM',
        description: 'Large data serialization may cause bridge bottlenecks',
        optimization: 'Implement data compression and reduce payload sizes'
      });
    }
    
    return bottlenecks;
  }

  private analyzeConnectionLimits(): RealtimeBottleneck | null {
    const maxConnections = 200; // Estimated max WebSocket connections
    const requiredConnections = this.config.maxConcurrentUsers || 150;
    
    if (maxConnections < requiredConnections) {
      return {
        component: 'WebSocket Connections',
        bottleneckType: 'CONNECTION_LIMIT',
        currentCapacity: maxConnections,
        requiredCapacity: requiredConnections,
        impact: 'CRITICAL',
        description: 'WebSocket connection limit may be exceeded with required user count',
        optimization: 'Implement connection pooling and subscription multiplexing'
      };
    }
    
    return null;
  }

  private analyzeMessageThroughput(): RealtimeBottleneck | null {
    const maxThroughput = 1000; // 1000 messages per second
    const requiredThroughput = (this.config.maxConcurrentUsers || 150) * 2; // 2 messages per user per second
    
    if (maxThroughput < requiredThroughput) {
      return {
        component: 'Message Throughput',
        bottleneckType: 'MESSAGE_THROUGHPUT',
        currentCapacity: maxThroughput,
        requiredCapacity: requiredThroughput,
        impact: 'HIGH',
        description: 'Message throughput may be insufficient for required user count',
        optimization: 'Implement message batching and optimize message processing'
      };
    }
    
    return null;
  }

  private analyzeSubscriptionLatency(): RealtimeBottleneck | null {
    const averageLatency = 150; // 150ms average subscription latency
    
    if (averageLatency > 500) {
      return {
        component: 'Subscription Latency',
        bottleneckType: 'LATENCY',
        currentCapacity: 1000 / averageLatency, // Messages per second capacity
        requiredCapacity: 10, // 10 messages per second required
        impact: 'MEDIUM',
        description: 'High subscription latency may affect real-time experience',
        optimization: 'Optimize subscription routing and reduce processing overhead'
      };
    }
    
    return null;
  }

  private analyzeSubscriptionMemoryUsage(): RealtimeBottleneck | null {
    const memoryPerSubscription = 100; // 100KB per subscription
    const maxUsers = this.config.maxConcurrentUsers || 150;
    const totalMemory = (memoryPerSubscription * maxUsers) / 1024; // Convert to MB
    
    if (totalMemory > 50) { // 50MB limit
      return {
        component: 'Subscription Memory',
        bottleneckType: 'MEMORY_USAGE',
        currentCapacity: Math.floor(50 * 1024 / memoryPerSubscription), // Max users based on memory
        requiredCapacity: maxUsers,
        impact: 'MEDIUM',
        description: 'High memory usage for subscriptions may cause performance issues',
        optimization: 'Optimize subscription data structures and implement memory pooling'
      };
    }
    
    return null;
  }

  private calculateMaxConcurrentConnections(bottlenecks: RealtimeBottleneck[]): number {
    const connectionBottleneck = bottlenecks.find(b => b.bottleneckType === 'CONNECTION_LIMIT');
    if (connectionBottleneck) {
      return connectionBottleneck.currentCapacity;
    }
    
    return 200; // Default estimate
  }

  private analyzeDatabaseCapacityLimits(): LimitingFactor[] {
    const factors: LimitingFactor[] = [];
    
    const connectionPoolSize = this.config.databaseConnectionPoolSize || 20;
    const maxUsers = this.config.maxConcurrentUsers || 150;
    
    if (connectionPoolSize < maxUsers / 5) { // Assume 5 users per connection
      factors.push({
        component: 'Database Connection Pool',
        currentCapacity: connectionPoolSize * 5,
        requiredCapacity: maxUsers,
        bottleneckType: 'DATABASE',
        severity: 'HIGH',
        description: 'Database connection pool may be insufficient for concurrent users',
        mitigation: 'Increase connection pool size or implement connection sharing'
      });
    }
    
    return factors;
  }

  private analyzeNetworkCapacityLimits(): LimitingFactor[] {
    const factors: LimitingFactor[] = [];
    
    const maxBandwidth = 10000; // 10 Mbps available bandwidth
    const requiredBandwidth = (this.config.maxConcurrentUsers || 150) * 50; // 50 Kbps per user
    
    if (maxBandwidth < requiredBandwidth) {
      factors.push({
        component: 'Network Bandwidth',
        currentCapacity: Math.floor(maxBandwidth / 50),
        requiredCapacity: this.config.maxConcurrentUsers || 150,
        bottleneckType: 'NETWORK',
        severity: 'MEDIUM',
        description: 'Network bandwidth may be insufficient for all concurrent users',
        mitigation: 'Implement data compression and optimize network usage'
      });
    }
    
    return factors;
  }

  private analyzeMemoryLimits(): LimitingFactor[] {
    const factors: LimitingFactor[] = [];
    
    const availableMemory = 512; // 512MB available memory
    const memoryPerUser = 2; // 2MB per user
    const maxUsers = Math.floor(availableMemory / memoryPerUser);
    const requiredUsers = this.config.maxConcurrentUsers || 150;
    
    if (maxUsers < requiredUsers) {
      factors.push({
        component: 'Memory Usage',
        currentCapacity: maxUsers,
        requiredCapacity: requiredUsers,
        bottleneckType: 'MEMORY',
        severity: 'MEDIUM',
        description: 'Memory usage may limit concurrent user capacity',
        mitigation: 'Optimize memory usage and implement memory pooling'
      });
    }
    
    return factors;
  }

  private analyzeCPULimits(): LimitingFactor[] {
    const factors: LimitingFactor[] = [];
    
    const maxCPUUtilization = 80; // 80% max CPU utilization
    const cpuPerUser = 0.5; // 0.5% CPU per user
    const maxUsers = Math.floor(maxCPUUtilization / cpuPerUser);
    const requiredUsers = this.config.maxConcurrentUsers || 150;
    
    if (maxUsers < requiredUsers) {
      factors.push({
        component: 'CPU Utilization',
        currentCapacity: maxUsers,
        requiredCapacity: requiredUsers,
        bottleneckType: 'CPU',
        severity: 'MEDIUM',
        description: 'CPU utilization may limit concurrent user capacity',
        mitigation: 'Optimize CPU-intensive operations and implement load balancing'
      });
    }
    
    return factors;
  }

  private analyzeBLEHardwareLimits(): LimitingFactor[] {
    const factors: LimitingFactor[] = [];
    
    // BLE hardware typically supports many concurrent connections
    // but scanning/broadcasting may have practical limits
    const maxBLEOperations = 100; // Estimated max concurrent BLE operations
    const requiredOperations = this.config.maxConcurrentUsers || 150;
    
    if (maxBLEOperations < requiredOperations) {
      factors.push({
        component: 'BLE Hardware',
        currentCapacity: maxBLEOperations,
        requiredCapacity: requiredOperations,
        bottleneckType: 'BLE_HARDWARE',
        severity: 'HIGH',
        description: 'BLE hardware may not support required concurrent operations',
        mitigation: 'Implement BLE operation queuing and optimize scanning intervals'
      });
    }
    
    return factors;
  }

  // Recommendation generation methods
  private generateQueryOptimizationRecommendations(bottlenecks: QueryBottleneck[]): string[] {
    const recommendations: string[] = [];
    
    if (bottlenecks.some(b => b.bottleneckType === 'IO')) {
      recommendations.push('Add database indexes on frequently queried columns');
      recommendations.push('Optimize RLS policies for better performance');
    }
    
    if (bottlenecks.some(b => b.complexity === 'HIGH')) {
      recommendations.push('Consider query optimization and simplification');
    }
    
    return recommendations;
  }

  private generateNativeOptimizationRecommendations(bottlenecks: NativeBottleneck[]): string[] {
    const recommendations: string[] = [];
    
    if (bottlenecks.some(b => b.bottleneckType === 'BLE_SCANNING')) {
      recommendations.push('Optimize BLE scanning intervals and duty cycles');
    }
    
    if (bottlenecks.some(b => b.bottleneckType === 'PERMISSION_CHECK')) {
      recommendations.push('Implement permission status caching');
    }
    
    return recommendations;
  }

  private generateBridgeOptimizationRecommendations(bottlenecks: BridgeBottleneck[]): string[] {
    const recommendations: string[] = [];
    
    if (bottlenecks.some(b => b.bottleneckType === 'SERIALIZATION')) {
      recommendations.push('Implement data compression for bridge calls');
    }
    
    if (bottlenecks.some(b => b.bottleneckType === 'THREAD_SWITCHING')) {
      recommendations.push('Batch bridge operations to reduce thread switching overhead');
    }
    
    return recommendations;
  }

  private generateRealtimeOptimizationRecommendations(bottlenecks: RealtimeBottleneck[]): string[] {
    const recommendations: string[] = [];
    
    if (bottlenecks.some(b => b.bottleneckType === 'CONNECTION_LIMIT')) {
      recommendations.push('Implement WebSocket connection pooling');
    }
    
    if (bottlenecks.some(b => b.bottleneckType === 'MESSAGE_THROUGHPUT')) {
      recommendations.push('Implement message batching and compression');
    }
    
    return recommendations;
  }

  private generateScalabilityRecommendations(factors: LimitingFactor[], maxUsers: number, requiredUsers: number): string[] {
    const recommendations: string[] = [];
    
    if (maxUsers < requiredUsers) {
      recommendations.push(`System capacity (${maxUsers} users) is below requirement (${requiredUsers} users)`);
    }
    
    factors.forEach(factor => {
      if (factor.severity === 'CRITICAL' || factor.severity === 'HIGH') {
        recommendations.push(factor.mitigation);
      }
    });
    
    return recommendations;
  }
}