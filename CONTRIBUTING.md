# Contributing to auth-pkce

🎉 Thank you for your interest in contributing to auth-pkce! We welcome contributions from the community and are grateful for your support.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- Git
- A GitHub account

### Development Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/alishah730/auth-pkce.git
   cd auth-pkce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Test the CLI locally**
   ```bash
   node dist/cli.js --help
   ```

## How to Contribute

### 🐛 Reporting Bugs

Before creating bug reports, please check the issue list as you might find that you don't need to create one. When creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what behavior you expected**
- **Include screenshots if applicable**
- **Provide your environment details** (OS, Node.js version, etc.)

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the enhancement**
- **Describe the current behavior and explain the behavior you expected**
- **Explain why this enhancement would be useful**

### 🔧 Code Contributions

#### Types of Contributions

- **Bug fixes**: Fix existing issues
- **Features**: Implement new functionality
- **Documentation**: Improve or add documentation
- **Tests**: Add or improve test coverage
- **Performance**: Optimize existing code
- **Refactoring**: Improve code structure without changing functionality

#### Before You Start

1. **Check existing issues** to see if someone is already working on it
2. **Create an issue** to discuss major changes before implementing
3. **Comment on the issue** to let others know you're working on it

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number
```

### 2. Make Your Changes

- Follow the [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 3. Commit Your Changes

We use conventional commits. Please format your commit messages as:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to build process or auxiliary tools

**Examples:**
```bash
git commit -m "feat(auth): add device flow support"
git commit -m "fix(cli): handle missing config file gracefully"
git commit -m "docs(readme): update installation instructions"
```

### 4. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:

- **Clear title and description**
- **Reference any related issues** (e.g., "Fixes #123")
- **Describe what you changed and why**
- **Include screenshots for UI changes**
- **Ensure all checks pass**

### 5. Code Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, your PR will be merged

## Coding Standards

### TypeScript Guidelines

- Use TypeScript strict mode
- Provide type annotations for function parameters and return types
- Use interfaces for object shapes
- Avoid `any` type unless absolutely necessary

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multiline objects/arrays
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### File Organization

```
src/
├── cli.ts              # Main CLI entry point
├── commands/           # Command implementations
│   ├── index.ts        # Export all commands
│   └── login.ts        # Individual command files
├── config/             # Configuration management
├── services/           # Business logic services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── __tests__/          # Test files
```

## Testing Guidelines

### Writing Tests

- Write tests for all new functionality
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test both success and error cases

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- crypto.test.ts
```

### Test Structure

```typescript
describe('Feature Name', () => {
  describe('method name', () => {
    it('should do something when condition', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = methodUnderTest(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments for all public APIs
- Include parameter descriptions and return types
- Provide usage examples for complex functions

### README Updates

- Update README.md for new features
- Add examples for new commands
- Update installation or usage instructions

### Changelog

- Update CHANGELOG.md for all changes
- Follow semantic versioning principles
- Include migration notes for breaking changes

## Community

### Getting Help

- 💬 [GitHub Discussions](https://github.com/alishah730/auth-pkce/discussions) - General questions and discussions
- 🐛 [GitHub Issues](https://github.com/alishah730/auth-pkce/issues) - Bug reports and feature requests
- 📧 Email: support@auth-pkce.dev

### Communication Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the code of conduct

## Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- GitHub contributors page

## Questions?

Don't hesitate to ask questions! We're here to help:

- Open a [Discussion](https://github.com/alishah730/auth-pkce/discussions)
- Comment on relevant issues
- Reach out to maintainers

Thank you for contributing to auth-pkce! 🚀
