import {
  CheckpointStore,
  StatefulAgent,
  TaskStateManager,
} from '../../../services/state-persistence-service.js';
import { providerUtils } from '../../../config.js';

/**
 * State Persistence / Checkpointing Example
 * Demonstrates the state management pattern used in galactiq
 *
 * In galactiq, PostgresSaver is used for checkpointing agent state.
 * This allows:
 * - Resuming interrupted workflows
 * - State recovery after failures
 * - Long-running task management
 * - Multi-step workflow persistence
 *
 * This example simulates checkpointing using in-memory storage (can be extended to use Postgres)
 */

/**
 * Example workflow steps
 */
function createWorkflowSteps() {
  return [
    {
      name: 'research',
      description: 'Research the topic',
      execute: async () => {
        console.log(`     Executing research...`);
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate work
        return { findings: 'Research findings: Topic is well-documented' };
      },
    },
    {
      name: 'analyze',
      description: 'Analyze the research findings',
      execute: async (state) => {
        console.log(`     Analyzing research...`);
        const { research } = state.results;
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { analysis: `Analysis of: ${research.findings}` };
      },
    },
    {
      name: 'generate',
      description: 'Generate output based on analysis',
      execute: async (state) => {
        console.log(`     Generating output...`);
        const analysis = state.results.analyze;
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { output: `Generated output from: ${analysis.analysis}` };
      },
    },
    {
      name: 'validate',
      description: 'Validate the generated output',
      execute: async (state) => {
        console.log(`     Validating output...`);
        const generated = state.results.generate;
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { validated: true, output: generated.output };
      },
    },
  ];
}

/**
 * Main example function
 */
async function statePersistenceExample() {
  console.log('=== State Persistence / Checkpointing Example ===');
  console.log('State management pattern from galactiq\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  const checkpointStore = new CheckpointStore();

  try {
    // Example 1: Multi-step workflow with checkpointing
    console.log('📝 Example 1: Multi-Step Workflow with Checkpointing');
    console.log('='.repeat(60));

    const agent = new StatefulAgent(provider, checkpointStore);
    const threadId = 'thread_001';
    const steps = createWorkflowSteps();

    console.log(`\n🔄 [Workflow] Starting workflow for thread ${threadId}`);
    console.log(`   Steps: ${steps.length}\n`);

    // Execute workflow
    const result1 = await agent.executeWorkflow(threadId, steps);
    console.log(`\n📤 Final State:`, JSON.stringify(result1, null, 2));

    // Example 2: Resume from checkpoint after interruption
    console.log('\n\n📝 Example 2: Resume from Checkpoint');
    console.log('='.repeat(60));

    const agent2 = new StatefulAgent(provider, checkpointStore);
    const threadId2 = 'thread_002';
    const steps2 = createWorkflowSteps();

    // Make second step simulate interruption
    steps2[1].simulateInterruption = true;

    try {
      await agent2.executeWorkflow(threadId2, steps2);
    } catch (error) {
      console.log(`\n  ⏸️  [Resume] Workflow interrupted, state saved`);
    }

    // Resume workflow
    console.log(`\n  🔄 [Resume] Resuming workflow...`);
    const agent3 = new StatefulAgent(provider, checkpointStore);
    const steps3 = createWorkflowSteps(); // No interruption this time
    const result2 = await agent3.executeWorkflow(threadId2, steps3);
    console.log(`\n📤 Final State:`, JSON.stringify(result2, null, 2));

    // Example 3: Task state management (A2A pattern)
    console.log('\n\n📝 Example 3: Task State Management (A2A Pattern)');
    console.log('='.repeat(60));

    const taskManager = new TaskStateManager(checkpointStore);
    const taskId = 'task_001';
    const contextId = 'context_001';

    // Create task
    const task = taskManager.createTask(taskId, contextId, {
      agentName: 'template_generator',
      userId: 'user_123',
    });
    console.log(`\n  ✅ [Task] Created: ${task.id}, Status: ${task.status.state}`);

    // Update to working
    taskManager.updateTaskStatus(taskId, 'working');
    console.log(`  🔄 [Task] Updated to: working`);

    // Simulate completion check
    const checkpoint = await checkpointStore.getLatest(contextId);
    checkpoint.completed = true;
    await checkpointStore.save(contextId, checkpoint);

    const completedTask = await taskManager.checkTaskCompletion(taskId);
    if (completedTask) {
      console.log(`  ✅ [Task] Completed: ${completedTask.status.state}`);
      console.log(`     Message: ${completedTask.status.message}`);
    }

    // Show checkpoint history
    console.log('\n\n📊 Checkpoint History');
    console.log('='.repeat(60));
    const allCheckpoints = await checkpointStore.getAll(threadId);
    console.log(`Thread ${threadId} has ${allCheckpoints.length} checkpoint(s)`);
    allCheckpoints.forEach((cp, i) => {
      console.log(`  ${i + 1}. ${cp.id} at ${cp.timestamp}`);
    });

    console.log('\n✅ All state persistence examples completed!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  - Checkpoint saving: Save state after each step');
    console.log('  - State restoration: Resume from saved checkpoints');
    console.log('  - Workflow recovery: Handle interruptions gracefully');
    console.log('  - Task state management: Track task lifecycle');
    console.log("  - Pattern matches galactiq's PostgresSaver implementation");
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
statePersistenceExample().catch(console.error);
