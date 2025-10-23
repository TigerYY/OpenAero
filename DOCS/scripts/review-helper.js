#!/usr/bin/env node

/**
 * Review Helper Script
 * Manages review processes for PRD documents and feature modules
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const moment = require('moment');

class ReviewHelper {
  constructor() {
    this.reviewTypes = [
      { name: 'Technical Review', value: 'technical' },
      { name: 'Business Review', value: 'business' },
      { name: 'Architecture Review', value: 'architecture' },
      { name: 'Security Review', value: 'security' },
      { name: 'Final Review', value: 'final' }
    ];
    
    this.reviewStatuses = [
      { name: '📋 Pending', value: 'pending' },
      { name: '🔄 In Progress', value: 'in_progress' },
      { name: '✅ Approved', value: 'approved' },
      { name: '⚠️ Needs Revision', value: 'needs_revision' },
      { name: '❌ Rejected', value: 'rejected' }
    ];
  }

  async createReview(documentPath, reviewType, reviewer) {
    const reviewId = `review-${Date.now()}`;
    const reviewDate = moment().format('YYYY-MM-DD');
    
    const reviewRecord = {
      reviewId,
      documentPath,
      reviewType,
      reviewer,
      status: 'pending',
      createdAt: reviewDate,
      updatedAt: reviewDate,
      comments: [],
      actionItems: []
    };
    
    // Save review record
    const reviewDir = path.join(process.cwd(), 'docs', 'prd', 'reviews');
    await fs.ensureDir(reviewDir);
    
    const reviewFile = path.join(reviewDir, `${reviewId}.json`);
    await fs.writeJson(reviewFile, reviewRecord, { spaces: 2 });
    
    console.log(chalk.green(`✅ Created review ${reviewId} for ${path.basename(documentPath)}`));
    console.log(chalk.blue(`📝 Review file: ${reviewFile}`));
    
    return reviewRecord;
  }

  async updateReviewStatus(reviewId, status, comments = []) {
    const reviewFile = path.join(process.cwd(), 'docs', 'prd', 'reviews', `${reviewId}.json`);
    
    if (!await fs.pathExists(reviewFile)) {
      console.log(chalk.red(`❌ Review ${reviewId} not found`));
      return;
    }
    
    const reviewRecord = await fs.readJson(reviewFile);
    reviewRecord.status = status;
    reviewRecord.updatedAt = moment().format('YYYY-MM-DD');
    
    if (comments.length > 0) {
      reviewRecord.comments.push(...comments);
    }
    
    await fs.writeJson(reviewFile, reviewRecord, { spaces: 2 });
    
    console.log(chalk.green(`✅ Updated review ${reviewId} status to ${status}`));
  }

  async addReviewComment(reviewId, comment, commentType = 'general') {
    const reviewFile = path.join(process.cwd(), 'docs', 'prd', 'reviews', `${reviewId}.json`);
    
    if (!await fs.pathExists(reviewFile)) {
      console.log(chalk.red(`❌ Review ${reviewId} not found`));
      return;
    }
    
    const reviewRecord = await fs.readJson(reviewFile);
    
    const newComment = {
      id: `comment-${Date.now()}`,
      type: commentType,
      comment,
      author: process.env.USER || 'Unknown',
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
    };
    
    reviewRecord.comments.push(newComment);
    reviewRecord.updatedAt = moment().format('YYYY-MM-DD');
    
    await fs.writeJson(reviewFile, reviewRecord, { spaces: 2 });
    
    console.log(chalk.green(`✅ Added comment to review ${reviewId}`));
  }

  async addActionItem(reviewId, actionItem, assignee, dueDate) {
    const reviewFile = path.join(process.cwd(), 'docs', 'prd', 'reviews', `${reviewId}.json`);
    
    if (!await fs.pathExists(reviewFile)) {
      console.log(chalk.red(`❌ Review ${reviewId} not found`));
      return;
    }
    
    const reviewRecord = await fs.readJson(reviewFile);
    
    const newActionItem = {
      id: `action-${Date.now()}`,
      description: actionItem,
      assignee,
      dueDate,
      status: 'pending',
      createdAt: moment().format('YYYY-MM-DD')
    };
    
    reviewRecord.actionItems.push(newActionItem);
    reviewRecord.updatedAt = moment().format('YYYY-MM-DD');
    
    await fs.writeJson(reviewFile, reviewRecord, { spaces: 2 });
    
    console.log(chalk.green(`✅ Added action item to review ${reviewId}`));
  }

  async listReviews(status = null) {
    const reviewDir = path.join(process.cwd(), 'docs', 'prd', 'reviews');
    
    if (!await fs.pathExists(reviewDir)) {
      console.log(chalk.yellow('⚠️  No reviews directory found'));
      return;
    }
    
    const reviewFiles = await fs.readdir(reviewDir);
    const reviews = [];
    
    for (const file of reviewFiles) {
      if (file.endsWith('.json')) {
        const reviewRecord = await fs.readJson(path.join(reviewDir, file));
        if (!status || reviewRecord.status === status) {
          reviews.push(reviewRecord);
        }
      }
    }
    
    if (reviews.length === 0) {
      console.log(chalk.yellow('⚠️  No reviews found'));
      return;
    }
    
    console.log(chalk.blue('📋 Review List'));
    console.log(chalk.blue('=============='));
    
    reviews.forEach(review => {
      const statusDisplay = this.getStatusDisplay(review.status);
      console.log(`\n${statusDisplay} ${review.reviewId}`);
      console.log(`  Document: ${path.basename(review.documentPath)}`);
      console.log(`  Type: ${review.reviewType}`);
      console.log(`  Reviewer: ${review.reviewer}`);
      console.log(`  Created: ${review.createdAt}`);
      console.log(`  Updated: ${review.updatedAt}`);
      
      if (review.comments.length > 0) {
        console.log(`  Comments: ${review.comments.length}`);
      }
      
      if (review.actionItems.length > 0) {
        console.log(`  Action Items: ${review.actionItems.length}`);
      }
    });
  }

  async generateReviewReport() {
    const reviewDir = path.join(process.cwd(), 'docs', 'prd', 'reviews');
    
    if (!await fs.pathExists(reviewDir)) {
      console.log(chalk.yellow('⚠️  No reviews directory found'));
      return;
    }
    
    const reviewFiles = await fs.readdir(reviewDir);
    const reviews = [];
    
    for (const file of reviewFiles) {
      if (file.endsWith('.json')) {
        const reviewRecord = await fs.readJson(path.join(reviewDir, file));
        reviews.push(reviewRecord);
      }
    }
    
    if (reviews.length === 0) {
      console.log(chalk.yellow('⚠️  No reviews found'));
      return;
    }
    
    const statusCounts = {};
    const typeCounts = {};
    const reviewerCounts = {};
    
    reviews.forEach(review => {
      statusCounts[review.status] = (statusCounts[review.status] || 0) + 1;
      typeCounts[review.reviewType] = (typeCounts[review.reviewType] || 0) + 1;
      reviewerCounts[review.reviewer] = (reviewerCounts[review.reviewer] || 0) + 1;
    });
    
    console.log(chalk.blue('📊 Review Report'));
    console.log(chalk.blue('================'));
    
    console.log(`\nTotal Reviews: ${reviews.length}`);
    
    console.log('\nStatus Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = Math.round((count / reviews.length) * 100);
      console.log(`  ${this.getStatusDisplay(status)}: ${count} (${percentage}%)`);
    });
    
    console.log('\nType Distribution:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      const percentage = Math.round((count / reviews.length) * 100);
      console.log(`  ${type}: ${count} (${percentage}%)`);
    });
    
    console.log('\nReviewer Distribution:');
    Object.entries(reviewerCounts).forEach(([reviewer, count]) => {
      const percentage = Math.round((count / reviews.length) * 100);
      console.log(`  ${reviewer}: ${count} (${percentage}%)`);
    });
    
    // Pending action items
    const pendingActionItems = reviews
      .flatMap(review => review.actionItems)
      .filter(item => item.status === 'pending');
    
    if (pendingActionItems.length > 0) {
      console.log('\n⚠️  Pending Action Items:');
      pendingActionItems.forEach(item => {
        console.log(`  - ${item.description} (${item.assignee}, due: ${item.dueDate})`);
      });
    }
  }

  async interactiveReview() {
    console.log(chalk.blue('🔄 Interactive Review'));
    console.log(chalk.blue('===================='));
    
    // Find documents to review
    const documentFiles = [];
    const prdDir = path.join(process.cwd(), 'docs', 'prd');
    
    if (await fs.pathExists(prdDir)) {
      const files = await fs.readdir(prdDir, { recursive: true });
      for (const file of files) {
        if (file.endsWith('.md') && !file.includes('templates')) {
          documentFiles.push(path.join(prdDir, file));
        }
      }
    }
    
    if (documentFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No documents found to review'));
      return;
    }
    
    // Select document
    const documentChoices = documentFiles.map(file => ({
      name: path.relative(prdDir, file),
      value: file
    }));
    
    const { selectedDocument } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedDocument',
        message: 'Select document to review:',
        choices: documentChoices
      }
    ]);
    
    // Select review type
    const { reviewType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'reviewType',
        message: 'Select review type:',
        choices: this.reviewTypes
      }
    ]);
    
    // Get reviewer name
    const { reviewer } = await inquirer.prompt([
      {
        type: 'input',
        name: 'reviewer',
        message: 'Enter reviewer name:',
        default: process.env.USER || 'Unknown'
      }
    ]);
    
    // Create review
    const review = await this.createReview(selectedDocument, reviewType, reviewer);
    
    console.log(chalk.green(`\n✅ Review created successfully!`));
    console.log(chalk.blue(`Review ID: ${review.reviewId}`));
    console.log(chalk.blue(`Document: ${path.basename(selectedDocument)}`));
    console.log(chalk.blue(`Type: ${reviewType}`));
    console.log(chalk.blue(`Reviewer: ${reviewer}`));
  }

  getStatusDisplay(status) {
    const statusMap = {
      'pending': '📋 Pending',
      'in_progress': '🔄 In Progress',
      'approved': '✅ Approved',
      'needs_revision': '⚠️ Needs Revision',
      'rejected': '❌ Rejected'
    };
    return statusMap[status] || status;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const helper = new ReviewHelper();
  
  switch (command) {
    case 'create':
      const documentPath = args[1];
      const reviewType = args[2];
      const reviewer = args[3];
      
      if (!documentPath || !reviewType || !reviewer) {
        console.log(chalk.red('❌ Usage: node review-helper.js create <document-path> <review-type> <reviewer>'));
        return;
      }
      
      await helper.createReview(documentPath, reviewType, reviewer);
      break;
      
    case 'update':
      const reviewId = args[1];
      const status = args[2];
      
      if (!reviewId || !status) {
        console.log(chalk.red('❌ Usage: node review-helper.js update <review-id> <status>'));
        return;
      }
      
      await helper.updateReviewStatus(reviewId, status);
      break;
      
    case 'comment':
      const commentReviewId = args[1];
      const comment = args[2];
      
      if (!commentReviewId || !comment) {
        console.log(chalk.red('❌ Usage: node review-helper.js comment <review-id> <comment>'));
        return;
      }
      
      await helper.addReviewComment(commentReviewId, comment);
      break;
      
    case 'action':
      const actionReviewId = args[1];
      const actionItem = args[2];
      const assignee = args[3];
      const dueDate = args[4];
      
      if (!actionReviewId || !actionItem || !assignee || !dueDate) {
        console.log(chalk.red('❌ Usage: node review-helper.js action <review-id> <action-item> <assignee> <due-date>'));
        return;
      }
      
      await helper.addActionItem(actionReviewId, actionItem, assignee, dueDate);
      break;
      
    case 'list':
      const status = args[1];
      await helper.listReviews(status);
      break;
      
    case 'report':
      await helper.generateReviewReport();
      break;
      
    case 'interactive':
      await helper.interactiveReview();
      break;
      
    default:
      console.log(chalk.blue('Review Helper Usage:'));
      console.log('  node review-helper.js create <document-path> <review-type> <reviewer>');
      console.log('  node review-helper.js update <review-id> <status>');
      console.log('  node review-helper.js comment <review-id> <comment>');
      console.log('  node review-helper.js action <review-id> <action-item> <assignee> <due-date>');
      console.log('  node review-helper.js list [status]');
      console.log('  node review-helper.js report');
      console.log('  node review-helper.js interactive');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ReviewHelper;
