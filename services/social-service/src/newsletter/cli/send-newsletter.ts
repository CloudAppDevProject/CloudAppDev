#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { NewsletterService } from '../newsletter.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('NewsletterCLI');

let app: any = null;

/**
 * CLI script for sending newsletters
 * Used by Kubernetes CronJob and manual triggers
 * Exit codes:
 * - 0: Success (all or partial sends successful)
 * - 1: Failure (critical error, no sends completed)
 */
async function bootstrap() {
  const frequency = process.argv[2] || 'weekly';
  const dryRun = process.argv.includes('--dry-run');

  logger.log('====================================================');
  logger.log(`Newsletter Sender - ${frequency.toUpperCase()} MODE`);
  logger.log(`Timestamp: ${new Date().toISOString()}`);
  logger.log(`Dry Run: ${dryRun}`);
  logger.log('====================================================');

  // Handle graceful shutdown on SIGTERM (Kubernetes termination)
  process.on('SIGTERM', async () => {
    logger.warn('Received SIGTERM - gracefully shutting down...');
    if (app) {
      try {
        await app.close();
      } catch (error) {
        logger.error('Error closing app on SIGTERM:', error.message);
      }
    }
    process.exit(0);
  });

  // Handle graceful shutdown on SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    logger.warn('Received SIGINT - gracefully shutting down...');
    if (app) {
      try {
        await app.close();
      } catch (error) {
        logger.error('Error closing app on SIGINT:', error.message);
      }
    }
    process.exit(0);
  });

  try {
    // Create NestJS application context
    logger.log('Initializing NestJS application...');
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const newsletterService = app.get(NewsletterService);

    logger.log(`Starting ${frequency} newsletter send operation...`);
    const startTime = Date.now();

    // Send newsletters
    const result = await newsletterService.sendWeekly();

    const elapsedMs = Date.now() - startTime;
    const elapsedSeconds = (elapsedMs / 1000).toFixed(2);

    // Log results
    logger.log('====================================================');
    logger.log('NEWSLETTER SEND RESULTS');
    logger.log('====================================================');
    logger.log(`Total Attempted: ${result.totalAttempted}`);
    logger.log(`Successfully Sent: ${result.successCount}`);
    logger.log(`Failed: ${result.failureCount}`);

    const successRate = result.totalAttempted > 0
      ? ((result.successCount / result.totalAttempted) * 100).toFixed(2)
      : '0.00';
    logger.log(`Success Rate: ${successRate}%`);
    logger.log(`Duration: ${elapsedSeconds}s`);
    logger.log('====================================================');

    // Determine exit code
    let exitCode = 0;

    if (result.totalAttempted === 0) {
      logger.warn('No subscribers found. This might be normal for new deployments.');
      exitCode = 0; // Success - no work to do
    } else if (result.successCount === 0) {
      logger.error('CRITICAL: No newsletters were sent successfully!');
      exitCode = 1; // Failure - nothing succeeded
    } else if (result.failureCount > 0) {
      logger.warn(
        `${result.failureCount} failures detected. Will retry in next scheduled run.`,
      );
      exitCode = 0; // Partial success - acceptable
    } else {
      logger.log('All newsletters sent successfully! 🎉');
      exitCode = 0; // Complete success
    }

    logger.log(`Exiting with code: ${exitCode}`);
    process.exit(exitCode);

  } catch (error) {
    logger.error('CRITICAL ERROR during newsletter send:', error.message);
    logger.error('Stack:', error.stack);

    logger.log('====================================================');
    logger.log('NEWSLETTER SEND FAILED');
    logger.log('====================================================');
    logger.error(`Error: ${error.message}`);
    logger.log('This error will be reported to monitoring systems.');
    logger.log('====================================================');

    // Cleanup
    if (app) {
      await app.close();
    }

    process.exit(1); // Failure - critical error
  } finally {
    if (app) {
      try {
        await app.close();
        logger.log('Application context closed.');
      } catch (closeError) {
        logger.warn('Error closing application context:', closeError.message);
      }
    }
  }
}

// Execute
bootstrap().catch((error) => {
  console.error('Uncaught error:', error);
  process.exit(1);
});
