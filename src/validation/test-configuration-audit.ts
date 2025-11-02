/**
 * Simple test script for Configuration Audit Engine
 */

import { ConfigurationAuditEngine } from './engines/ConfigurationAuditEngine';

async function testConfigurationAudit(): Promise<void> {
  console.log('🔧 Testing Configuration Audit Engine...\n');

  try {
    // Initialize the Configuration Audit Engine
    const configAuditEngine = new ConfigurationAuditEngine();
    
    console.log('📋 Initializing Configuration Audit Engine...');
    await configAuditEngine.initialize();
    
    // Run the comprehensive configuration audit
    console.log('🔍 Running comprehensive configuration audit...\n');
    const auditResult = await configAuditEngine.validate();
    
    // Display basic results
    console.log('📊 Configuration Audit Results:');
    console.log('================================');
    console.log(`Phase: ${auditResult.phaseName}`);
    console.log(`Status: ${auditResult.status}`);
    console.log(`Duration: ${auditResult.duration}ms`);
    console.log(`Total Checks: ${auditResult.results.length}`);
    console.log(`Critical Issues: ${auditResult.criticalIssues.length}`);
    console.log(`Summary: ${auditResult.summary}\n`);
    
    // Display results by status
    const passed = auditResult.results.filter(r => r.status === 'PASS').length;
    const failed = auditResult.results.filter(r => r.status === 'FAIL').length;
    const conditional = auditResult.results.filter(r => r.status === 'CONDITIONAL').length;
    
    console.log('📈 Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Conditional: ${conditional}\n`);
    
    // Show first few issues if any
    const issues = auditResult.results.filter(r => r.status !== 'PASS').slice(0, 5);
    if (issues.length > 0) {
      console.log('🔍 Sample Issues:');
      issues.forEach((issue, index) => {
        const icon = issue.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${index + 1}. ${icon} ${issue.name}: ${issue.message}`);
      });
      console.log('');
    }
    
    // Cleanup
    await configAuditEngine.cleanup();
    
    console.log('✅ Configuration audit test completed successfully!');
    
  } catch (error) {
    console.error('❌ Configuration audit test failed:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error);
  }
}

// Run the test
if (require.main === module) {
  testConfigurationAudit().catch(console.error);
}

export { testConfigurationAudit };