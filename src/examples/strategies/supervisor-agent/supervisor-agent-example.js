import { providerUtils } from '../../../config.js';
import { SupervisorAgent, WorkerAgent, createDefaultSupervisor } from './supervisor-agent.js';

/**
 * Supervisor Agent Example
 * Demonstrates hierarchical multi-agent systems with supervisor-worker patterns
 *
 * Patterns demonstrated:
 * 1. Basic Supervisor-Worker delegation
 * 2. Parallel vs Sequential execution
 * 3. Result aggregation
 * 4. Specialized worker teams
 */

async function supervisorAgentExample() {
  console.log('=== Supervisor Agent Example ===');
  console.log('Hierarchical multi-agent systems with task delegation\n');

  const provider = providerUtils.isProviderAvailable('openai') ? 'openai' : 'claude';
  console.log(`Using ${provider.toUpperCase()} provider\n`);

  try {
    // Example 1: Basic Supervisor with Default Workers
    console.log('1️⃣ Basic Supervisor-Worker Delegation');
    console.log('─'.repeat(60));

    const supervisor = createDefaultSupervisor(provider, { verbose: true });

    console.log('\n📋 Registered Workers:');
    for (const [name, worker] of supervisor.workers) {
      console.log(`   - ${name}: ${worker.specialty.substring(0, 50)}...`);
    }

    const task1 = 'Create a brief introduction to machine learning for beginners';

    console.log(`\n📝 Task: "${task1}"`);

    const result1 = await supervisor.delegate(task1);

    console.log('\n📊 Results:');
    console.log(`   Workers involved: ${result1.workerResults?.length || 0}`);
    console.log(`   Execution mode: ${result1.routing?.executionMode}`);
    if (result1.finalResult?.result) {
      console.log(`   Final result preview: ${result1.finalResult.result.substring(0, 200)}...`);
    } else if (result1.workerResults?.[0]?.result) {
      console.log(`   Result preview: ${result1.workerResults[0].result.substring(0, 200)}...`);
    }

    console.log('\n');

    // Example 2: Multi-Worker Collaboration (Parallel)
    console.log('2️⃣ Multi-Worker Parallel Collaboration');
    console.log('─'.repeat(60));

    const task2 =
      'Analyze the pros and cons of microservices architecture from both technical and business perspectives';

    console.log(`\n📝 Task: "${task2}"`);
    console.log('(This task benefits from multiple perspectives)\n');

    const result2 = await supervisor.delegate(task2);

    console.log('\n📊 Results:');
    console.log(`   Workers involved: ${result2.workerResults?.length || 0}`);
    for (const wr of result2.workerResults || []) {
      console.log(`   - ${wr.worker}: ${wr.result?.substring(0, 100)}...`);
    }
    if (result2.finalResult?.aggregated) {
      console.log(`\n   Aggregated result: ${result2.finalResult.result?.substring(0, 200)}...`);
    }

    console.log('\n');

    // Example 3: Sequential Worker Chain
    console.log('3️⃣ Sequential Worker Chain');
    console.log('─'.repeat(60));

    const customSupervisor = new SupervisorAgent(provider, { verbose: true });

    // Create a pipeline of workers
    customSupervisor.registerWorker(
      new WorkerAgent(
        'Researcher',
        'Research specialist',
        'Gathering and organizing information',
        provider
      )
    );

    customSupervisor.registerWorker(
      new WorkerAgent(
        'Writer',
        'Content writer',
        'Transforming research into readable content',
        provider
      )
    );

    customSupervisor.registerWorker(
      new WorkerAgent(
        'Editor',
        'Content editor',
        'Improving and polishing written content',
        provider
      )
    );

    const task3 = 'Create a short article about the history of artificial intelligence';

    console.log(`\n📝 Task: "${task3}"`);
    console.log('(Should flow through research → write → edit)\n');

    const result3 = await customSupervisor.delegate(task3);

    console.log('\n📊 Sequential Execution Results:');
    console.log(`   Execution mode: ${result3.routing?.executionMode}`);
    console.log(`   Worker chain:`);
    for (let i = 0; i < (result3.workerResults?.length || 0); i++) {
      const wr = result3.workerResults[i];
      console.log(`      ${i + 1}. ${wr.worker} (${wr.duration}ms)`);
    }

    console.log('\n');

    // Example 4: Specialized Team
    console.log('4️⃣ Specialized Team for Complex Task');
    console.log('─'.repeat(60));

    const devSupervisor = new SupervisorAgent(provider, { verbose: true });

    // Development team
    devSupervisor.registerWorker(
      new WorkerAgent(
        'Architect',
        'Software architect',
        'Designing system architecture and high-level structure',
        provider
      )
    );

    devSupervisor.registerWorker(
      new WorkerAgent('Developer', 'Software developer', 'Implementing code and features', provider)
    );

    devSupervisor.registerWorker(
      new WorkerAgent(
        'Tester',
        'QA engineer',
        'Testing, finding bugs, and ensuring quality',
        provider
      )
    );

    devSupervisor.registerWorker(
      new WorkerAgent(
        'SecurityExpert',
        'Security specialist',
        'Identifying security vulnerabilities and best practices',
        provider
      )
    );

    const task4 = 'Design a secure REST API endpoint for user authentication';

    console.log(`\n📝 Task: "${task4}"`);
    console.log('(Benefits from architecture, security, and development expertise)\n');

    const result4 = await devSupervisor.delegate(task4);

    console.log('\n📊 Team Results:');
    console.log(`   Workers consulted: ${result4.workerResults?.length || 0}`);
    console.log(`   Aggregation needed: ${result4.routing?.aggregationNeeded}`);

    if (result4.finalResult?.aggregated) {
      console.log(`\n   Synthesized recommendation:`);
      console.log(`   ${result4.finalResult.result?.substring(0, 300)}...`);
    }

    console.log('\n');

    // Example 5: Session with Multiple Tasks
    console.log('5️⃣ Supervisor Session with Multiple Tasks');
    console.log('─'.repeat(60));

    const sessionTasks = [
      'What are the best practices for database indexing?',
      'Explain the concept of eventual consistency',
      'How do you implement rate limiting in an API?',
    ];

    console.log('\n📝 Tasks queue:');
    sessionTasks.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));

    console.log('\nProcessing session...\n');

    const sessionResult = await supervisor.session(sessionTasks);

    console.log('\n📊 Session Summary:');
    console.log(`   Total tasks: ${sessionResult.totalTasks}`);
    console.log(`   Completed: ${sessionResult.completedTasks}`);

    // Statistics
    const stats = supervisor.getStats();
    console.log('\n📈 Worker Statistics:');
    for (const ws of stats.workerStats) {
      if (ws.tasksCompleted > 0) {
        console.log(
          `   - ${ws.name}: ${ws.tasksCompleted} tasks, avg ${ws.averageDuration.toFixed(0)}ms`
        );
      }
    }

    console.log('\n');

    // Summary
    console.log('📋 Summary');
    console.log('─'.repeat(60));
    console.log('\n💡 Key Patterns Demonstrated:\n');

    console.log('1. Supervisor-Worker Architecture:');
    console.log('   - Supervisor routes tasks to appropriate workers');
    console.log('   - Workers specialize in specific domains');
    console.log('   - Clear separation of concerns\n');

    console.log('2. Intelligent Routing:');
    console.log('   - Supervisor analyzes task requirements');
    console.log('   - Selects workers based on specialty match');
    console.log('   - Provides specific instructions to each worker\n');

    console.log('3. Execution Modes:');
    console.log('   - Parallel: Independent tasks execute simultaneously');
    console.log('   - Sequential: Results flow from one worker to next');
    console.log('   - Single: Simple tasks go to one worker\n');

    console.log('4. Result Aggregation:');
    console.log('   - Supervisor combines worker results');
    console.log('   - Resolves conflicts between workers');
    console.log('   - Creates unified response\n');

    console.log('🔗 Related Concepts:');
    console.log('   - LangGraph Supervisor Pattern');
    console.log('   - Multi-Agent Conversation (AutoGen)');
    console.log('   - Hierarchical Task Networks (HTN)');
    console.log('   - Crew AI Hierarchical Process');

    console.log('\n✅ Supervisor Agent examples completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the example
supervisorAgentExample().catch(console.error);
