# Contributing to NillionVault

Thank you for your interest in contributing to NillionVault! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Git
- GitHub account
- Basic understanding of JavaScript/Node.js

### Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" button on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/NillionVault.git
   cd NillionVault
   ```

2. **Set up development environment**
   ```bash
   # Install backend dependencies
   cd backend && npm install && cd ..
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Configure environment**
   ```bash
   # Copy environment template
   cp backend/env.example backend/.env
   
   # Edit backend/.env with your development credentials
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

## 🎯 Areas for Contribution

### High Priority
- **Nillion Integration**: Improve SecretVaults SDK integration
- **Performance**: Optimize upload and verification speeds
- **Error Handling**: Enhance error messages and recovery
- **Testing**: Add comprehensive test coverage

### Medium Priority
- **UI/UX**: Improve user interface and experience
- **Mobile**: Enhance mobile responsiveness
- **Security**: Add additional security features
- **Monitoring**: Implement analytics and logging

### Low Priority
- **Documentation**: Improve documentation and examples
- **Internationalization**: Add multi-language support
- **Themes**: Add dark mode and theme options

## 📝 Development Guidelines

### Code Style
- Use consistent indentation (2 spaces)
- Follow existing code patterns
- Add comments for complex logic
- Use meaningful variable names

### Git Workflow
1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Test your changes thoroughly
   - Update documentation if needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

### Commit Message Format
Use conventional commits format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Examples:
```
feat: add drag and drop file upload
fix: resolve hash verification issue
docs: update deployment guide
style: improve button styling
```

## 🧪 Testing

### Manual Testing
1. **Upload Testing**
   - Test with various JSON file sizes
   - Test drag & drop functionality
   - Test file validation

2. **Verification Testing**
   - Test hash verification
   - Test with invalid hashes
   - Test error handling

3. **UI Testing**
   - Test on different screen sizes
   - Test with different browsers
   - Test accessibility features

### Automated Testing (Future)
We plan to add:
- Unit tests for backend services
- Integration tests for API endpoints
- Frontend component tests
- End-to-end testing

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - Operating System
   - Node.js version
   - Browser version (if applicable)

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior

3. **Additional Context**
   - Screenshots (if applicable)
   - Error messages
   - Relevant logs

### Bug Report Template
```markdown
**Bug Description**
Brief description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g. Windows 10]
- Node.js: [e.g. 18.17.0]
- Browser: [e.g. Chrome 119]

**Additional Context**
Any other relevant information.
```

## 💡 Feature Requests

When requesting features, please include:

1. **Feature Description**
   - Clear description of the feature
   - Use cases and benefits

2. **Implementation Ideas**
   - How you think it could be implemented
   - Any technical considerations

3. **Alternatives Considered**
   - Other approaches you've considered

### Feature Request Template
```markdown
**Feature Description**
Brief description of the feature.

**Use Case**
Why would this feature be useful?

**Implementation Ideas**
How could this be implemented?

**Additional Context**
Any other relevant information.
```

## 📋 Pull Request Process

### Before Submitting
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Changes tested locally
- [ ] Documentation updated (if needed)
- [ ] No console.log statements left in code

### PR Template
```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] No regressions introduced
- [ ] Cross-browser testing (if applicable)

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
```

## 🤝 Community Guidelines

### Be Respectful
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully

### Be Collaborative
- Help others when possible
- Share knowledge and experience
- Work together toward common goals

### Be Professional
- Stay on topic in discussions
- Keep conversations constructive
- Follow GitHub's code of conduct

## 📞 Getting Help

### Resources
- **Documentation**: Check [docs/](docs/) folder
- **Issues**: Search existing [GitHub Issues](https://github.com/hitman298/NillionVault/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/hitman298/NillionVault/discussions)

### Contact
- **Maintainer**: [@hitman298](https://github.com/hitman298)
- **Nillion Community**: [Nillion Discord](https://discord.gg/nillion)

## 📄 License

By contributing to NillionVault, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributor graphs

Thank you for contributing to NillionVault! 🎉
