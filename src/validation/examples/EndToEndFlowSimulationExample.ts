/**
 * Example usage of End-to-End Flow Simulation Engine
 * Demonstrates how to run comprehensive BLE system validation without physical devices
 */

import { EndToEndFlowSimulationEngine } from '../engines/EndToEndFlowSimulationEngine';

export async function runEndToEndFlowSimulationExample() {
  console.log('🔄 Starting End-to-End Flow Simulation Example...\n');

  // Initialize the simulation engine
  const simulationEngine = new EndToEndFlowSimulationEngine();

  try {
    // Initialize with test configuration
    await simulationEngine.initialize({
      testOrgId: 'example-org-id',
      testUserId: 'example-user-id'
    });

    console.log('✅ Simulation engine initialized successfully');

    // Run the complete validation
    console.log('\n🧪 Running end-to-end flow simulation...');
    const validationResult = await simulationEngine.validate();

    // Display results
    console.log('\n📊 Simulation Results:');
    console.log(`Status: ${validationResult.status}`);
    console.log(`Duration: ${validationResult.duration}ms`);
    console.log(`Summary: ${validationResult.summary}`);

    // Show detailed results
    console.log('\n📋 Detailed Results:');
    validationResult.results.forEach((result, index) => {
      const statusIcon = result.status === 'PASS' ? '✅' : 
                        result.status === 'FAIL' ? '❌' : 
                        result.status === 'PENDING' ? '⏳' : '❓';
      
      console.log(`${index + 1}. ${statusIcon} ${result.name}`);
      console.log(`   ${result.message}`);
      if (result.executionTime) {
        console.log(`   Execution time: ${result.executionTime}ms`);
      }
      if (result.details) {
        console.log(`   Details: ${typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}`);
      }
      console.log('');
    });

    // Show critical issues if any
    if (validationResult.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues Found:');
      validationResult.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.name}: ${issue.message}`);
      });
    }

    // Show recommendations
    if (validationResult.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      validationResult.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Show progress information
    const progress = simulationEngine.getProgress();
    console.log('\n📈 Final Progress:');
    console.log(`Phase: ${progress.currentPhase}`);
    console.log(`Completed: ${progress.completedSteps}/${progress.totalSteps} (${progress.percentComplete}%)`);

    if (progress.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      progress.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (progress.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      progress.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    // Cleanup
    await simulationEngine.cleanup();
    console.log('\n🧹 Simulation engine cleaned up');

    return validationResult;

  } catch (error) {
    console.error('\n❌ Simulation failed:', error);
    
    // Attempt cleanup even on error
    try {
      await simulationEngine.cleanup();
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError);
    }
    
    throw error;
  }
}

/**
 * Example of running individual flow simulations
 */
export async function runIndividualFlowExamples() {
  console.log('🔄 Starting Individual Flow Simulation Examples...\n');

  const simulationEngine = new EndToEndFlowSimulationEngine();

  try {
    await simulationEngine.initialize();

    // Example 1: Officer Broadcast Flow
    console.log('1️⃣ Testing Officer Broadcast Flow...');
    const officerFlowResults = await simulationEngine.simulateOfficerBroadcastFlow();
    
    console.log(`Officer flow results: ${officerFlowResults.length} tests`);
    officerFlowResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`   ${icon} ${result.name}: ${result.message}`);
    });

    // Example 2: Member Detection Flow
    console.log('\n2️⃣ Testing Member Detection Flow...');
    const memberFlowResults = await simulationEngine.simulateMemberDetectionFlow();
    
    console.log(`Member flow results: ${memberFlowResults.length} tests`);
    memberFlowResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'PENDING' ? '⏳' : '❌';
      console.log(`   ${icon} ${result.name}: ${result.message}`);
    });

    // Example 3: Error Scenarios
    console.log('\n3️⃣ Testing Error Scenarios...');
    const errorScenarioResults = await simulationEngine.simulateErrorScenarios();
    
    console.log(`Error scenario results: ${errorScenarioResults.length} tests`);
    errorScenarioResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'PENDING' ? '⏳' : '❌';
      console.log(`   ${icon} ${result.name}: ${result.message}`);
    });

    await simulationEngine.cleanup();

  } catch (error) {
    console.error('Individual flow simulation failed:', error);
    await simulationEngine.cleanup();
    throw error;
  }
}

/**
 * Example of monitoring simulation progress
 */
export async function runProgressMonitoringExample() {
  console.log('🔄 Starting Progress Monitoring Example...\n');

  const simulationEngine = new EndToEndFlowSimulationEngine();

  try {
    await simulationEngine.initialize();

    // Monitor progress during validation
    const progressInterval = setInterval(() => {
      const progress = simulationEngine.getProgress();
      console.log(`Progress: ${progress.currentStep} (${progress.percentComplete}%)`);
    }, 1000);

    // Run validation
    const result = await simulationEngine.validate();

    // Stop monitoring
    clearInterval(progressInterval);

    console.log('\n✅ Validation completed');
    console.log(`Final status: ${result.status}`);
    console.log(`Total duration: ${result.duration}ms`);

    await simulationEngine.cleanup();

    return result;

  } catch (error) {
    console.error('Progress monitoring example failed:', error);
    await simulationEngine.cleanup();
    throw error;
  }
}

// Export for use in other examples or tests
export {
  EndToEndFlowSimulationEngine
};