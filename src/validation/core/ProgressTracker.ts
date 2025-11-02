/**
 * Progress tracking system for BLE validation execution
 */

import { ValidationProgress } from '../types/ValidationTypes';

export interface ValidationStep {
  id: string;
  name: string;
  phase: string;
  estimatedDuration: number;
  dependencies?: string[];
  optional?: boolean;
}

export interface PhaseDefinition {
  id: string;
  name: string;
  steps: ValidationStep[];
  estimatedDuration: number;
  dependencies?: string[];
}

export class ProgressTracker {
  private phases: PhaseDefinition[] = [];
  private completedSteps: Set<string> = new Set();
  private currentPhase?: string;
  private currentStep?: string;
  private startTime?: Date;
  private phaseStartTimes: Map<string, Date> = new Map();
  private stepStartTimes: Map<string, Date> = new Map();
  private stepDurations: Map<string, number> = new Map();
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    this.initializePhases();
  }

  private initializePhases(): void {
    this.phases = [
      {
        id: 'static_analysis',
        name: 'Static Code Analysis',
        estimatedDuration: 300000, // 5 minutes
        steps: [
          {
            id: 'analyze_ios_modules',
            name: 'Analyze iOS Native Modules',
            phase: 'static_analysis',
            estimatedDuration: 60000
          },
          {
            id: 'analyze_android_modules',
            name: 'Analyze Android Native Modules',
            phase: 'static_analysis',
            estimatedDuration: 60000
          },
          {
            id: 'analyze_bridge_layer',
            name: 'Analyze JavaScript Bridge Layer',
            phase: 'static_analysis',
            estimatedDuration: 90000
          },
          {
            id: 'validate_interfaces',
            name: 'Validate Module Interfaces',
            phase: 'static_analysis',
            estimatedDuration: 30000
          },
          {
            id: 'check_code_quality',
            name: 'Check Code Quality',
            phase: 'static_analysis',
            estimatedDuration: 60000
          }
        ]
      },
      {
        id: 'database_simulation',
        name: 'Database Simulation & Testing',
        estimatedDuration: 240000, // 4 minutes
        dependencies: ['static_analysis'],
        steps: [
          {
            id: 'validate_db_functions',
            name: 'Validate Database Functions',
            phase: 'database_simulation',
            estimatedDuration: 60000
          },
          {
            id: 'simulate_flows',
            name: 'Simulate End-to-End Flows',
            phase: 'database_simulation',
            estimatedDuration: 90000
          },
          {
            id: 'test_concurrency',
            name: 'Test Concurrent Operations',
            phase: 'database_simulation',
            estimatedDuration: 90000
          }
        ]
      },
      {
        id: 'security_audit',
        name: 'Security Audit',
        estimatedDuration: 180000, // 3 minutes
        steps: [
          {
            id: 'audit_token_security',
            name: 'Audit Token Security',
            phase: 'security_audit',
            estimatedDuration: 60000
          },
          {
            id: 'audit_database_security',
            name: 'Audit Database Security',
            phase: 'security_audit',
            estimatedDuration: 60000
          },
          {
            id: 'audit_ble_security',
            name: 'Audit BLE Payload Security',
            phase: 'security_audit',
            estimatedDuration: 60000
          }
        ]
      },
      {
        id: 'performance_analysis',
        name: 'Performance Analysis',
        estimatedDuration: 300000, // 5 minutes
        dependencies: ['database_simulation'],
        steps: [
          {
            id: 'analyze_scalability',
            name: 'Analyze Scalability',
            phase: 'performance_analysis',
            estimatedDuration: 120000
          },
          {
            id: 'estimate_resources',
            name: 'Estimate Resource Usage',
            phase: 'performance_analysis',
            estimatedDuration: 90000
          },
          {
            id: 'identify_bottlenecks',
            name: 'Identify Performance Bottlenecks',
            phase: 'performance_analysis',
            estimatedDuration: 90000
          }
        ]
      },
      {
        id: 'configuration_audit',
        name: 'Configuration Audit',
        estimatedDuration: 120000, // 2 minutes
        steps: [
          {
            id: 'audit_app_config',
            name: 'Audit App Configuration',
            phase: 'configuration_audit',
            estimatedDuration: 30000
          },
          {
            id: 'audit_build_config',
            name: 'Audit Build Configuration',
            phase: 'configuration_audit',
            estimatedDuration: 30000
          },
          {
            id: 'audit_permissions',
            name: 'Audit Permissions',
            phase: 'configuration_audit',
            estimatedDuration: 30000
          },
          {
            id: 'validate_deployment',
            name: 'Validate Deployment Readiness',
            phase: 'configuration_audit',
            estimatedDuration: 30000
          }
        ]
      }
    ];
  }

  startExecution(): void {
    this.startTime = new Date();
    this.completedSteps.clear();
    this.errors = [];
    this.warnings = [];
  }

  startPhase(phaseId: string): void {
    this.currentPhase = phaseId;
    this.phaseStartTimes.set(phaseId, new Date());
  }

  startStep(stepId: string): void {
    this.currentStep = stepId;
    this.stepStartTimes.set(stepId, new Date());
  }

  completeStep(stepId: string, success: boolean = true): void {
    const startTime = this.stepStartTimes.get(stepId);
    if (startTime) {
      const duration = Date.now() - startTime.getTime();
      this.stepDurations.set(stepId, duration);
    }

    if (success) {
      this.completedSteps.add(stepId);
    }

    if (this.currentStep === stepId) {
      this.currentStep = undefined;
    }
  }

  completePhase(phaseId: string): void {
    if (this.currentPhase === phaseId) {
      this.currentPhase = undefined;
    }
  }

  addError(error: string): void {
    this.errors.push(error);
  }

  addWarning(warning: string): void {
    this.warnings.push(warning);
  }

  getProgress(): ValidationProgress {
    const totalSteps = this.getAllSteps().length;
    const completedSteps = this.completedSteps.size;
    const percentComplete = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    let currentPhase = 'Not Started';
    let currentStep = 'Not Started';

    if (this.currentPhase) {
      const phase = this.phases.find(p => p.id === this.currentPhase);
      currentPhase = phase?.name || this.currentPhase;
    }

    if (this.currentStep) {
      const step = this.getAllSteps().find(s => s.id === this.currentStep);
      currentStep = step?.name || this.currentStep;
    }

    const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining();

    return {
      currentPhase,
      currentStep,
      completedSteps,
      totalSteps,
      percentComplete: Math.round(percentComplete * 100) / 100,
      estimatedTimeRemaining,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  private getAllSteps(): ValidationStep[] {
    return this.phases.flatMap(phase => phase.steps);
  }

  private calculateEstimatedTimeRemaining(): number | undefined {
    if (!this.startTime) {
      return undefined;
    }

    const allSteps = this.getAllSteps();
    const totalEstimatedDuration = allSteps.reduce((sum, step) => sum + step.estimatedDuration, 0);
    const completedSteps = Array.from(this.completedSteps);
    
    let completedDuration = 0;
    completedSteps.forEach(stepId => {
      const actualDuration = this.stepDurations.get(stepId);
      const step = allSteps.find(s => s.id === stepId);
      completedDuration += actualDuration || step?.estimatedDuration || 0;
    });

    const remainingDuration = totalEstimatedDuration - completedDuration;
    return Math.max(0, remainingDuration);
  }

  getPhaseProgress(phaseId: string): {
    phase: PhaseDefinition;
    completedSteps: number;
    totalSteps: number;
    percentComplete: number;
    duration?: number;
  } | undefined {
    const phase = this.phases.find(p => p.id === phaseId);
    if (!phase) {
      return undefined;
    }

    const completedSteps = phase.steps.filter(step => this.completedSteps.has(step.id)).length;
    const totalSteps = phase.steps.length;
    const percentComplete = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    const startTime = this.phaseStartTimes.get(phaseId);
    const duration = startTime ? Date.now() - startTime.getTime() : undefined;

    return {
      phase,
      completedSteps,
      totalSteps,
      percentComplete: Math.round(percentComplete * 100) / 100,
      duration
    };
  }

  getExecutionSummary(): {
    totalDuration?: number;
    phaseSummaries: Array<{
      phaseId: string;
      phaseName: string;
      completed: boolean;
      duration?: number;
      stepCount: number;
      completedSteps: number;
    }>;
    totalErrors: number;
    totalWarnings: number;
  } {
    const totalDuration = this.startTime ? Date.now() - this.startTime.getTime() : undefined;

    const phaseSummaries = this.phases.map(phase => {
      const completedSteps = phase.steps.filter(step => this.completedSteps.has(step.id)).length;
      const completed = completedSteps === phase.steps.length;
      const startTime = this.phaseStartTimes.get(phase.id);
      const duration = startTime ? Date.now() - startTime.getTime() : undefined;

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        completed,
        duration,
        stepCount: phase.steps.length,
        completedSteps
      };
    });

    return {
      totalDuration,
      phaseSummaries,
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length
    };
  }
}