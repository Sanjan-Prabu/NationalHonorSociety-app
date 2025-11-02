/**
 * Simple test to verify bridge layer analysis implementation
 */

import { BridgeLayerAnalyzer } from './analyzers/BridgeLayerAnalyzer';

async function testBridgeLayerAnalysis() {
  console.log('Testing Bridge Layer Analysis Implementation...');
  
  try {
    // Test with actual BLE module paths
    const bleContextPath = 'modules/BLE/BLEContext.tsx';
    const bleHelperPath = 'modules/BLE/BLEHelper.tsx';
    const permissionHelperPath = 'modules/BLE/permissionHelper.ts';
    
    console.log('Creating BridgeLayerAnalyzer...');
    const analyzer = new BridgeLayerAnalyzer(
      bleContextPath,
      bleHelperPath,
      permissionHelperPath
    );
    
    console.log('Running analysis...');
    const result = await analyzer.analyze();
    
    console.log('Analysis completed successfully!');
    console.log(`Overall Bridge Quality: ${result.overallBridgeQuality}`);
    console.log(`Critical Issues: ${result.criticalIssues.length}`);
    console.log(`Total Recommendations: ${result.recommendations.length}`);
    
    // Generate summary report
    const summaryReport = analyzer.generateSummaryReport(result);
    console.log('\n--- Summary Report ---');
    console.log(summaryReport);
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testBridgeLayerAnalysis()
    .then((success) => {
      if (success) {
        console.log('\n✅ Bridge layer analysis test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Bridge layer analysis test failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testBridgeLayerAnalysis };