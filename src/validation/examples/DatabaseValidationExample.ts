/**
 * Example demonstrating database integration and security validation
 * This shows how to use the DatabaseSimulationEngine and its analyzers
 */

import { DatabaseSimulationEngine } from '../engines/DatabaseSimulationEngine';
import { ValidationConfig } from '../types/ValidationTypes';

export class DatabaseValidationExample {
    private engine: DatabaseSimulationEngine;

    constructor() {
        this.engine = new DatabaseSimulationEngine();
    }

    async runDatabaseValidationExample(): Promise<void> {
        console.log('🔍 Starting Database Integration and Security Validation Example');

        try {
            // Initialize the database simulation engine
            console.log('📋 Initializing database simulation engine...');
            await this.engine.initialize();

            // Run comprehensive database validation
            console.log('🔧 Running database function validation...');
            const functionResults = await this.engine.validateDatabaseFunctions();
            console.log(`✅ Function validation completed: ${functionResults.length} checks performed`);

            // Run end-to-end flow simulation
            console.log('🔄 Running end-to-end flow simulation...');
            const flowResults = await this.engine.simulateEndToEndFlows();
            console.log(`✅ Flow simulation completed: ${flowResults.length} scenarios tested`);

            // Run concurrent operations testing
            console.log('⚡ Testing concurrent operations (150 users)...');
            const concurrencyResults = await this.engine.testConcurrentOperations(150);
            console.log(`✅ Concurrency testing completed: ${concurrencyResults.length} tests performed`);

            // Run data integrity validation
            console.log('🛡️ Validating data integrity...');
            const integrityResults = await this.engine.validateDataIntegrity();
            console.log(`✅ Data integrity validation completed: ${integrityResults.length} checks performed`);

            // Run complete validation phase
            console.log('🎯 Running complete database validation phase...');
            const phaseResult = await this.engine.validate();

            // Display results summary
            console.log('\n📊 Database Validation Results Summary:');
            console.log(`Phase: ${phaseResult.phaseName}`);
            console.log(`Status: ${phaseResult.status}`);
            console.log(`Duration: ${phaseResult.duration}ms`);
            console.log(`Total Results: ${phaseResult.results.length}`);
            console.log(`Critical Issues: ${phaseResult.criticalIssues.length}`);
            console.log(`Summary: ${phaseResult.summary}`);

            // Display critical issues if any
            if (phaseResult.criticalIssues.length > 0) {
                console.log('\n🚨 Critical Issues Found:');
                phaseResult.criticalIssues.forEach((issue, index) => {
                    console.log(`${index + 1}. ${issue.name}: ${issue.message}`);
                });
            }

            // Display recommendations
            if (phaseResult.recommendations.length > 0) {
                console.log('\n💡 Recommendations:');
                phaseResult.recommendations.forEach((rec, index) => {
                    console.log(`${index + 1}. ${rec}`);
                });
            }

            // Cleanup
            await this.engine.cleanup();
            console.log('✨ Database validation example completed successfully!');

        } catch (error) {
            console.error('❌ Database validation example failed:', error);
            await this.engine.cleanup();
        }
    }

    async runSpecificValidationExample(): Promise<void> {
        console.log('🎯 Running Specific Database Function Validation Example');

        try {
            await this.engine.initialize();

            // Example: Validate specific database functions
            console.log('🔍 Validating create_session_secure function...');
            const functionResults = await this.engine.validateDatabaseFunctions();

            // Filter results for create_session_secure
            const createSessionResults = functionResults.filter(r =>
                r.id.includes('create-session-secure')
            );

            console.log(`Found ${createSessionResults.length} validation results for create_session_secure:`);
            createSessionResults.forEach(result => {
                console.log(`- ${result.name}: ${result.status} (${result.severity})`);
                console.log(`  Message: ${result.message}`);
                if (result.details) {
                    console.log(`  Details: ${result.details}`);
                }
            });

            await this.engine.cleanup();

        } catch (error) {
            console.error('❌ Specific validation example failed:', error);
            await this.engine.cleanup();
        }
    }

    async runSecurityAuditExample(): Promise<void> {
        console.log('🔒 Running Security Audit Example');

        try {
            await this.engine.initialize();

            // Get the security auditor from the engine (this would need to be exposed)
            // For now, we'll simulate the security audit results
            console.log('🛡️ Running comprehensive security audit...');

            // This would call the security audit methods
            const phaseResult = await this.engine.validate();

            // Filter security-related results
            const securityResults = phaseResult.results.filter(r =>
                r.category === 'SECURITY' || r.id.includes('security')
            );

            console.log(`\n🔒 Security Audit Results (${securityResults.length} checks):`);
            securityResults.forEach(result => {
                const icon = result.status === 'PASS' ? '✅' :
                    result.status === 'FAIL' ? '❌' : '⚠️';
                console.log(`${icon} ${result.name}: ${result.message}`);
            });

            await this.engine.cleanup();

        } catch (error) {
            console.error('❌ Security audit example failed:', error);
            await this.engine.cleanup();
        }
    }

    async runPerformanceValidationExample(): Promise<void> {
        console.log('⚡ Running Performance Validation Example');

        try {
            await this.engine.initialize();

            console.log('📈 Testing database performance with concurrent operations...');

            // Test different user loads
            const userLoads = [10, 50, 100, 150];

            for (const userCount of userLoads) {
                console.log(`\n🔄 Testing with ${userCount} concurrent users...`);
                const results = await this.engine.testConcurrentOperations(userCount);

                const performanceResults = results.filter(r =>
                    r.message.includes('concurrent') || r.message.includes('performance')
                );

                performanceResults.forEach(result => {
                    const icon = result.status === 'PASS' ? '✅' :
                        result.status === 'FAIL' ? '❌' : '⚠️';
                    console.log(`  ${icon} ${result.message}`);
                });
            }

            await this.engine.cleanup();

        } catch (error) {
            console.error('❌ Performance validation example failed:', error);
            await this.engine.cleanup();
        }
    }
}

// Example usage
export async function runDatabaseValidationExamples(): Promise<void> {
    const example = new DatabaseValidationExample();

    console.log('🚀 Starting Database Validation Examples\n');

    // Run comprehensive validation
    await example.runDatabaseValidationExample();

    console.log('\n' + '='.repeat(60) + '\n');

    // Run specific function validation
    await example.runSpecificValidationExample();

    console.log('\n' + '='.repeat(60) + '\n');

    // Run security audit
    await example.runSecurityAuditExample();

    console.log('\n' + '='.repeat(60) + '\n');

    // Run performance validation
    await example.runPerformanceValidationExample();

    console.log('\n✨ All database validation examples completed!');
}

// Export for use in other examples
export { DatabaseValidationExample };