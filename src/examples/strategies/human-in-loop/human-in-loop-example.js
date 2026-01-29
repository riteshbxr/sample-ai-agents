import { providerUtils } from '../../../config.js';
import {
  HumanInLoopAgent,
  HumanInteractionHandler,
  ApprovalWorkflowBuilder,
} from './human-in-loop-agent.js';

/**
 * Human-in-the-Loop Agent Example
 * Demonstrates patterns for involving humans in AI agent execution
 *
 * Patterns demonstrated:
 * 1. Confidence-based escalation
 * 2. Action approval gates
 * 3. Human feedback integration
 * 4. Approval workflows
 *
 * Note: This example uses mock mode by default for demonstration.
 * Set INTERACTIVE_MODE=true environment variable for real human interaction.
 */

async function humanInLoopExample() {
  console.log('=== Human-in-the-Loop Agent Example ===');
  console.log('Patterns for human oversight in AI agent execution\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  // Use mock mode for automated demonstration
  // Set INTERACTIVE_MODE=true for real interaction
  const isInteractive = process.env.INTERACTIVE_MODE === 'true';
  const mode = isInteractive ? 'interactive' : 'mock';

  console.log(`Mode: ${mode.toUpperCase()} (set INTERACTIVE_MODE=true for real interaction)\n`);

  try {
    // Example 1: Confidence-Based Escalation
    console.log('1️⃣ Confidence-Based Escalation');
    console.log('─'.repeat(60));

    const agent1 = new HumanInLoopAgent(provider, {
      verbose: true,
      confidenceThreshold: 0.8, // High threshold triggers more escalations
      humanHandler: {
        mode,
        mockResponses: {
          approved: true,
          feedback: 'Looks good!',
          input: 'Human provided answer',
        },
      },
    });

    // Task that likely triggers escalation (ambiguous question)
    const task1 = 'What is the best programming language?';
    console.log(`\n📝 Task: "${task1}"`);
    console.log('(Subjective question may trigger low confidence)\n');

    const result1 = await agent1.execute(task1);

    console.log('\n📊 Result:');
    console.log(`   Auto-approved: ${result1.autoApproved || false}`);
    console.log(`   Human-approved: ${result1.humanApproved || false}`);
    console.log(`   Human-modified: ${result1.humanModified || false}`);
    console.log(`   Confidence: ${(result1.confidence?.confidence * 100).toFixed(1)}%`);
    console.log(`   Response preview: ${result1.response?.substring(0, 150)}...`);

    console.log('\n');

    // Example 2: Action Approval Gates
    console.log('2️⃣ Action Approval Gates');
    console.log('─'.repeat(60));

    const agent2 = new HumanInLoopAgent(provider, {
      verbose: true,
      approvalRequiredFor: ['delete', 'send', 'modify', 'purchase'],
      alwaysConfirmIrreversible: true,
      humanHandler: {
        mode,
        mockResponses: {
          approved: true,
        },
      },
    });

    const actions = [
      { type: 'read', description: 'Read user profile', data: { userId: 123 } },
      { type: 'modify', description: 'Update user preferences', data: { theme: 'dark' } },
      {
        type: 'delete',
        description: 'Delete old records',
        data: { olderThan: '30d' },
        irreversible: true,
      },
      { type: 'send', description: 'Send notification email', data: { to: 'user@example.com' } },
    ];

    console.log('\n📝 Processing actions:');
    for (const action of actions) {
      console.log(`\n   Action: ${action.type} - ${action.description}`);
      const result = await agent2.executeAction(action);
      console.log(`   Status: ${result.status}`);
      if (result.reason) {
        console.log(`   Reason: ${result.reason}`);
      }
    }

    console.log('\n');

    // Example 3: Human Feedback Integration
    console.log('3️⃣ Human Feedback Integration');
    console.log('─'.repeat(60));

    const handler3 = new HumanInteractionHandler({
      mode,
      mockResponses: {
        input: 'Additional context: The user is a beginner',
        approved: 'modify',
        feedback: 'Please make it more concise and add examples',
        choiceIndex: 1,
      },
    });

    // Demonstrate different interaction types
    console.log('\n📝 Demonstrating interaction types:');

    // Input request
    console.log('\n   🙋 Input Request:');
    const input = await handler3.requestInput('What additional context should we consider?');
    console.log(`   Received: "${input}"`);

    // Choice request
    console.log('\n   🔀 Choice Request:');
    const choice = await handler3.requestChoice('How should we proceed?', [
      { label: 'Quick summary', description: 'Brief overview' },
      { label: 'Detailed explanation', description: 'Comprehensive walkthrough' },
      { label: 'Interactive tutorial', description: 'Step-by-step guide' },
    ]);
    console.log(`   Selected: ${JSON.stringify(choice)}`);

    // Approval request
    console.log('\n   ⚠️ Approval Request:');
    const approval = await handler3.requestApproval('Generate response with selected approach', {
      details: 'Will create a detailed explanation',
      risk: 'low',
    });
    console.log(`   Approved: ${approval.approved}`);
    console.log(`   Feedback: ${approval.feedback || 'None'}`);

    // Notification
    console.log('\n   📢 Notifications:');
    handler3.notify('Task started', 'info');
    handler3.notify('Processing may take longer than usual', 'warning');
    handler3.notify('Task completed successfully', 'success');

    // Show interaction log
    console.log('\n   📋 Interaction Log:');
    const history = handler3.getHistory();
    console.log(`   Total interactions: ${history.length}`);
    for (const interaction of history) {
      console.log(`   - ${interaction.type}: ${interaction.timestamp}`);
    }

    console.log('\n');

    // Example 4: Approval Workflow
    console.log('4️⃣ Approval Workflow Patterns');
    console.log('─'.repeat(60));

    // Document review workflow
    console.log('\n   📄 Document Review Workflow:');
    const docWorkflow = ApprovalWorkflowBuilder.createDocumentReviewWorkflow();
    console.log(`   Stages: ${docWorkflow.map((s) => s.name).join(' → ')}`);
    for (const stage of docWorkflow) {
      console.log(
        `      - ${stage.name}: ${stage.requiresApproval ? 'Requires approval' : 'Auto-approve'}`
      );
    }

    // Code deployment workflow
    console.log('\n   🚀 Code Deployment Workflow:');
    const deployWorkflow = ApprovalWorkflowBuilder.createCodeDeploymentWorkflow();
    console.log(`   Stages: ${deployWorkflow.map((s) => s.name).join(' → ')}`);
    for (const stage of deployWorkflow) {
      const approvers = stage.approvers?.join(', ') || 'N/A';
      console.log(
        `      - ${stage.name}: ${stage.requiresApproval ? `Requires approval from: ${approvers}` : 'Auto-approve'}`
      );
    }

    // Custom workflow
    console.log('\n   🔧 Custom Workflow Builder:');
    const customWorkflow = new ApprovalWorkflowBuilder()
      .addStage('analysis', { autoApprove: true })
      .addStage('recommendation', { requiresApproval: true, approvers: ['analyst'] })
      .addStage('execution', { requiresApproval: true, approvers: ['manager', 'compliance'] })
      .build();
    console.log(`   Stages: ${customWorkflow.map((s) => s.name).join(' → ')}`);

    console.log('\n');

    // Example 5: Session with Mixed Escalation
    console.log('5️⃣ Session with Mixed Escalation');
    console.log('─'.repeat(60));

    const sessionAgent = new HumanInLoopAgent(provider, {
      verbose: true,
      confidenceThreshold: 0.75,
      maxAutoActions: 2, // Force escalation after 2 auto-approvals
      humanHandler: {
        mode,
        mockResponses: {
          approved: true,
          input: 'Session input from human',
        },
      },
    });

    const tasks = [
      'What is 2 + 2?', // High confidence, auto-approve
      'Calculate the square root of 144', // High confidence, auto-approve
      'What will be the stock price of AAPL next year?', // Low confidence, escalate
    ];

    console.log('\n📝 Processing session tasks:');
    for (let i = 0; i < tasks.length; i++) {
      console.log(`\n   Task ${i + 1}: "${tasks[i]}"`);
      const result = await sessionAgent.execute(tasks[i]);
      console.log(`   Auto-approved: ${result.autoApproved || false}`);
      console.log(`   Human involved: ${!result.autoApproved}`);
    }

    console.log('\n');

    // Summary
    console.log('📋 Summary');
    console.log('─'.repeat(60));
    console.log('\n💡 Key Patterns Demonstrated:\n');

    console.log('1. Confidence-Based Escalation:');
    console.log('   - AI assesses confidence in its response');
    console.log('   - Escalates to human when confidence is low');
    console.log('   - Configurable threshold for escalation\n');

    console.log('2. Action Approval Gates:');
    console.log('   - Certain action types require human approval');
    console.log('   - Irreversible actions always need confirmation');
    console.log('   - Maximum auto-actions before requiring human check\n');

    console.log('3. Human Feedback Integration:');
    console.log('   - Input requests for additional information');
    console.log('   - Choice selection from options');
    console.log('   - Approval with modification capability');
    console.log('   - Notifications for status updates\n');

    console.log('4. Approval Workflows:');
    console.log('   - Multi-stage approval processes');
    console.log('   - Role-based approver assignment');
    console.log('   - Workflow templates for common scenarios\n');

    console.log('🔗 Use Cases:');
    console.log('   - Financial transactions requiring approval');
    console.log('   - Content moderation with human review');
    console.log('   - Medical/legal domains with oversight requirements');
    console.log('   - Training data collection and annotation');
    console.log('   - Quality assurance workflows');

    console.log('\n✅ Human-in-the-Loop examples completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
humanInLoopExample().catch(console.error);
