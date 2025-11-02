/**
 * Configuration Audit Engine Example
 * 
 * Demonstrates how to use the Configuration Audit Engine to validate
 * app configuration, EAS build settings, and package dependencies.
 */

import { ConfigurationAuditEngine } from '../engines/ConfigurationAuditEngine';

/**
 * Example: Run comprehensive configuration audit
 */
async function runConfigurationAuditExample(): Promise<void> {
  console.log('🔧 Starting Configuration Audit Example...\n');

  try {
    // Initialize the Configuration Audit Engine
    const configAuditEngine = new ConfigurationAuditEngine();
    
    console.log('📋 Initializing Configuration Audit Engine...');
    await configAuditEngine.initialize();
    
    // Run the comprehensive configuration audit
    console.log('🔍 Running comprehensive configuration audit...\n');
    const auditResult = await configAuditEngine.validate();
    
    // Display results
    console.log('📊 Configuration Audit Results:');
    console.log('================================');
    console.log(`Phase: ${auditResult.phaseName}`);
    console.log(`Status: ${auditResult.status}`);
    console.log(`Duration: ${auditResult.duration}ms`);
    console.log(`Summary: ${auditResult.summary}\n`);
    
    // Display critical issues
    if (auditResult.criticalIssues.length > 0) {
      console.log('🚨 Critical Issues:');
      auditResult.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.name}: ${issue.message}`);
      });
      console.log('');
    }
    
    // Display recommendations
    if (auditResult.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      auditResult.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log('');
    }
    
    // Display detailed results by category
    console.log('📋 Detailed Results by Category:');
    console.log('================================');
    
    const resultsByCategory = auditResult.results.reduce((acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = [];
      }
      acc[result.category].push(result);
      return acc;
    }, {} as Record<string, typeof auditResult.results>);
    
    for (const [category, results] of Object.entries(resultsByCategory)) {
      console.log(`\n${category} (${results.length} checks):`);
      
      const passed = results.filter(r => r.status === 'PASS').length;
      const failed = results.filter(r => r.status === 'FAIL').length;
      const conditional = results.filter(r => r.status === 'CONDITIONAL').length;
      
      console.log(`  ✅ Passed: ${passed}`);
      console.log(`  ❌ Failed: ${failed}`);
      console.log(`  ⚠️  Conditional: ${conditional}`);
      
      // Show failed and conditional results
      const issueResults = results.filter(r => r.status !== 'PASS');
      if (issueResults.length > 0) {
        console.log('  Issues:');
        issueResults.forEach(result => {
          const icon = result.status === 'FAIL' ? '❌' : '⚠️';
          console.log(`    ${icon} ${result.name}: ${result.message}`);
        });
      }
    }
    
    // Cleanup
    await configAuditEngine.cleanup();
    
    console.log('\n✅ Configuration audit completed successfully!');
    
  } catch (error) {
    console.error('❌ Configuration audit failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Example: Run individual audit components
 */
async function runIndividualAuditsExample(): Promise<void> {
  console.log('\n🔧 Running Individual Audits Example...\n');

  try {
    const configAuditEngine = new ConfigurationAuditEngine();
    await configAuditEngine.initialize();
    
    // 1. App Configuration Audit
    console.log('📱 Running App Configuration Audit...');
    const appConfigResults = await configAuditEngine.auditAppConfiguration();
    console.log(`   Found ${appConfigResults.length} configuration checks`);
    console.log(`   Issues: ${appConfigResults.filter(r => r.status !== 'PASS').length}`);
    
    // 2. Build Configuration Audit
    console.log('🏗️  Running Build Configuration Audit...');
    const buildConfigResults = await configAuditEngine.auditBuildConfiguration();
    console.log(`   Found ${buildConfigResults.length} build configuration checks`);
    console.log(`   Issues: ${buildConfigResults.filter(r => r.status !== 'PASS').length}`);
    
    // 3. Permissions Audit (Package Dependencies)
    console.log('📦 Running Package Dependencies Audit...');
    const permissionsResults = await configAuditEngine.auditPermissions();
    console.log(`   Found ${permissionsResults.length} dependency checks`);
    console.log(`   Issues: ${permissionsResults.filter(r => r.status !== 'PASS').length}`);
    
    // 4. Deployment Readiness
    console.log('🚀 Running Deployment Readiness Assessment...');
    const deploymentResults = await configAuditEngine.validateDeploymentReadiness();
    console.log(`   Deployment readiness: ${deploymentResults[0]?.status || 'Unknown'}`);
    
    await configAuditEngine.cleanup();
    
    console.log('\n✅ Individual audits completed successfully!');
    
  } catch (error) {
    console.error('❌ Individual audits failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Example: Monitor audit progress
 */
async function monitorAuditProgressExample(): Promise<void> {
  console.log('\n📊 Monitoring Audit Progress Example...\n');

  try {
    const configAuditEngine = new ConfigurationAuditEngine();
    await configAuditEngine.initialize();
    
    // Start the audit in the background
    const auditPromise = configAuditEngine.validate();
    
    // Monitor progress
    const progressInterval = setInterval(() => {
      const progress = configAuditEngine.getProgress();
      console.log(`Progress: ${progress.percentComplete}% - ${progress.currentStep}`);
      
      if (progress.errors.length > 0) {
        console.log(`Errors: ${progress.errors.join(', ')}`);
      }
      
      if (progress.warnings.length > 0) {
        console.log(`Warnings: ${progress.warnings.join(', ')}`);
      }
    }, 1000);
    
    // Wait for completion
    const result = await auditPromise;
    clearInterval(progressInterval);
    
    console.log(`\n✅ Audit completed with status: ${result.status}`);
    
    await configAuditEngine.cleanup();
    
  } catch (error) {
    console.error('❌ Progress monitoring failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Example: Generate configuration report
 */
async function generateConfigurationReportExample(): Promise<void> {
  console.log('\n📄 Generating Configuration Report Example...\n');

  try {
    const configAuditEngine = new ConfigurationAuditEngine();
    await configAuditEngine.initialize();
    
    const auditResult = await configAuditEngine.validate();
    
    // Generate a simple report
    const report = {
      timestamp: new Date().toISOString(),
      overallStatus: auditResult.status,
      summary: auditResult.summary,
      duration: auditResult.duration,
      statistics: {
        totalChecks: auditResult.results.length,
        passed: auditResult.results.filter(r => r.status === 'PASS').length,
        failed: auditResult.results.filter(r => r.status === 'FAIL').length,
        conditional: auditResult.results.filter(r => r.status === 'CONDITIONAL').length,
        criticalIssues: auditResult.criticalIssues.length
      },
      criticalIssues: auditResult.criticalIssues.map(issue => ({
        name: issue.name,
        message: issue.message,
        severity: issue.severity,
        category: issue.category
      })),
      recommendations: auditResult.recommendations,
      detailedResults: auditResult.results.map(result => ({
        id: result.id,
        name: result.name,
        status: result.status,
        severity: result.severity,
        category: result.category,
        message: result.message
      }))
    };
    
    console.log('📄 Configuration Audit Report:');
    console.log(JSON.stringify(report, null, 2));
    
    await configAuditEngine.cleanup();
    
  } catch (error) {
    console.error('❌ Report generation failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Export examples for use in other files
export {
  runConfigurationAuditExample,
  runIndividualAuditsExample,
  monitorAuditProgressExample,
  generateConfigurationReportExample
};

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    await runConfigurationAuditExample();
    await runIndividualAuditsExample();
    await monitorAuditProgressExample();
    await generateConfigurationReportExample();
  })().catch(console.error);
}