# Contributing to AI Agents Demo

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

1. **Fork the repository** and clone your fork locally
2. **Install dependencies**: `npm install`
3. **Set up environment variables**: Copy `env.example` to `.env` and add your API keys
4. **Create a branch** for your changes: `git checkout -b feature/your-feature-name`

## 📋 Development Workflow

### Code Style

- **ESLint**: We use ESLint for code quality. Run `npm run lint` to check for issues
- **Prettier**: We use Prettier for code formatting. Run `npm run format` to format code
- **Validation**: Run `npm run validate` to check both linting and formatting

### Pre-Commit Hooks

**Automatic Checks**: This project uses pre-commit hooks that automatically run before each commit:

- ✅ **Linting**: ESLint automatically fixes issues and validates code quality
- ✅ **Formatting**: Prettier automatically formats your code
- ✅ **Commit Message**: Commitlint validates your commit message format

**What this means:**
- You don't need to manually run linting/formatting before committing
- The hooks will auto-fix issues when possible
- Commits will be rejected if there are unfixable linting errors
- Commits will be rejected if the commit message doesn't follow the conventional format

**To bypass hooks (not recommended):**
```bash
git commit --no-verify
```

### Before Submitting a PR

1. ✅ Ensure all tests pass (if applicable)
2. ✅ Run `npm run lint` and fix any issues
3. ✅ Run `npm run format:check` to ensure code is formatted correctly
4. ✅ Update documentation if you've changed functionality
5. ✅ Test your changes with relevant examples

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) format for commit messages. This helps with automated versioning, changelog generation, and better project history.

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

**Rules:**
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the subject line to 100 characters or less
- Use lowercase for type and scope
- Don't end the subject line with a period
- Reference issues and pull requests in the footer

**Examples:**

```
feat(agents): add streaming support for Claude client

Implements streaming responses for the Claude API client,
matching the functionality already available in the OpenAI client.

Fixes #123
```

```
fix(clients): resolve authentication error with Azure OpenAI

The client was not properly handling expired tokens.
Added automatic token refresh logic.

Closes #456
```

```
docs: update README with new examples

Added documentation for the new multi-agent collaboration feature.
```

```
refactor(utils): simplify token counting logic

Extracted common patterns into reusable functions.
Reduces code duplication by 30%.
```

**Note:** Commit messages are automatically validated using commitlint. If your commit message doesn't follow the format, the commit will be rejected.

## 🔍 Pull Request Process

1. **Update your branch** with the latest changes from the main branch
2. **Fill out the PR template** completely
3. **Ensure CI checks pass** - all GitHub Actions must pass before merge
4. **Request review** from maintainers
5. **Address feedback** promptly and professionally

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if applicable)
- [ ] No new warnings or errors
- [ ] Tests added/updated (if applicable)
- [ ] All CI checks pass

## 🎯 What to Contribute

We welcome contributions in the following areas:

### Code Contributions

- **New Examples**: Add new AI agent examples demonstrating different patterns
- **Bug Fixes**: Fix issues you've discovered
- **Features**: Add new functionality or improve existing features
- **Documentation**: Improve README, add code comments, or create tutorials
- **Performance**: Optimize existing code for better performance
- **Testing**: Add or improve test coverage

### Example Ideas

- New agent patterns or strategies
- Additional AI provider integrations
- UI components or visualizations
- Better error handling patterns
- Additional utility functions
- More comprehensive examples

## 🐛 Reporting Issues

When reporting issues, please include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce the problem
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**: Node.js version, OS, and relevant configuration
- **Screenshots/Logs**: If applicable

## 💡 Feature Requests

For feature requests, please:

- Check if the feature has already been requested
- Provide a clear use case and motivation
- Explain how it would benefit the project
- Consider implementation complexity

## 📝 Code Review Guidelines

- Be respectful and constructive in feedback
- Focus on code quality and maintainability
- Ask questions if something is unclear
- Suggest improvements, not just point out problems
- Appreciate the effort put into contributions

## 🔒 Security

If you discover a security vulnerability, please **do not** open a public issue. Instead, email the maintainers directly with details about the vulnerability.

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

## 🙏 Recognition

Contributors will be recognized in the project's README or contributors file. Thank you for helping make this project better!

## ❓ Questions?

If you have questions about contributing, feel free to:
- Open an issue with the `question` label
- Check existing issues and discussions
- Review the project documentation

---

**Thank you for contributing!** 🎉
