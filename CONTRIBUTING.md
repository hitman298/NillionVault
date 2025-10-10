# Contributing to NillionVault

Thank you for your interest in contributing to NillionVault! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Basic understanding of blockchain and privacy-preserving technologies

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/NillionVault.git`
3. Install dependencies: `./scripts/setup.sh`
4. Follow the setup guide in [GETTING-STARTED.md](GETTING-STARTED.md)

## 📋 How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs or request features
- Provide clear, detailed descriptions
- Include steps to reproduce for bugs
- Add relevant labels

### Code Contributions
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Add tests if applicable
4. Ensure code follows our style guidelines
5. Commit with clear messages
6. Push to your fork
7. Create a Pull Request

### Code Style Guidelines
- Use TypeScript for new code
- Follow existing code patterns
- Add JSDoc comments for functions
- Use meaningful variable and function names
- Keep functions small and focused

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Integration tests
cd backend && node test-nillion-integration.js
```

### Test Coverage
- Aim for >80% test coverage
- Test both success and error cases
- Include integration tests for critical paths

## 📚 Documentation

### Documentation Standards
- Update README.md for significant changes
- Add JSDoc comments for new functions
- Update API documentation for backend changes
- Include examples in documentation

### Documentation Files
- `README.md` - Main project overview
- `GETTING-STARTED.md` - Setup instructions
- `docs/` - Detailed documentation
- `CONTRIBUTING.md` - This file

## 🔒 Security

### Security Guidelines
- Never commit secrets or API keys
- Use environment variables for sensitive data
- Follow secure coding practices
- Report security vulnerabilities privately

### Reporting Security Issues
- Email security issues to: [your-email]
- Do not create public issues for security vulnerabilities
- Include detailed reproduction steps

## 🎯 Areas for Contribution

### High Priority
- Real Nillion SecretVaults SDK integration
- nilChain testnet transaction improvements
- Enhanced error handling and logging
- Performance optimizations

### Medium Priority
- Additional file format support
- Batch anchoring with Merkle trees
- Advanced verification features
- UI/UX improvements

### Low Priority
- Additional deployment options
- Documentation improvements
- Test coverage improvements
- Code refactoring

## 📝 Pull Request Process

### Before Submitting
1. Ensure all tests pass
2. Update documentation if needed
3. Add/update tests for new features
4. Follow the code style guidelines
5. Update CHANGELOG.md if applicable

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow GitHub's Community Guidelines

### Communication
- Use GitHub Discussions for questions
- Be patient with responses
- Provide clear, detailed information
- Help others when you can

## 📄 License

By contributing to NillionVault, you agree that your contributions will be licensed under the MIT License.

## 🆘 Getting Help

### Resources
- [Nillion Documentation](https://docs.nillion.com)
- [GitHub Discussions](https://github.com/hitman298/NillionVault/discussions)
- [Issues](https://github.com/hitman298/NillionVault/issues)

### Contact
- Create an issue for technical questions
- Use Discussions for general questions
- Email for security issues

Thank you for contributing to NillionVault! 🎉
