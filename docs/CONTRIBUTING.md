# Contributing to QuantumVest

Guidelines for contributing to the QuantumVest project including code style, testing, and development workflow.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Documentation Updates](#documentation-updates)

---

## Getting Started

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/quantsingularity/QuantumVest.git
   cd QuantumVest
   ```

3. Add upstream remote:

   ```bash
   git remote add upstream https://github.com/quantsingularity/QuantumVest.git
   ```

4. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Setup

### Backend Development

```bash
cd code/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install development dependencies
pip install pytest pytest-cov black flake8 mypy

# Run in development mode
FLASK_ENV=development python app.py
```

### Frontend Development

```bash
cd web-frontend
npm install
npm start
```

### Pre-commit Hooks

Install pre-commit hooks to ensure code quality:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

---

## Code Style

### Python Code Style

- Follow **PEP 8** style guide
- Use **Black** for code formatting
- Use **type hints** for function signatures
- Maximum line length: 88 characters (Black default)

**Format code:**

```bash
black code/backend/
```

**Lint code:**

```bash
flake8 code/backend/
```

**Type checking:**

```bash
mypy code/backend/
```

### JavaScript/TypeScript Code Style

- Follow **Airbnb JavaScript Style Guide**
- Use **Prettier** for formatting
- Use **ESLint** for linting

**Format code:**

```bash
cd web-frontend
npm run format
```

**Lint code:**

```bash
npm run lint
```

### Commit Message Format

Use conventional commit format:

```text
type(scope): subject

body (optional)

footer (optional)
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/config changes

**Example:**

```text
feat(api): add portfolio optimization endpoint

Implement Modern Portfolio Theory optimization
using PyPortfolioOpt library.

Closes #123
```

---

## Testing

### Backend Tests

```bash
cd code/backend
source venv/bin/activate

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_endpoints.py

# Run specific test
pytest tests/test_endpoints.py::test_login
```

### Frontend Tests

```bash
cd web-frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Test Requirements

- All new features must include tests
- Maintain minimum 80% code coverage
- Tests must pass before PR approval

---

## Pull Request Process

1. **Sync with upstream:**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure all tests pass:**

   ```bash
   ./scripts/run_all_tests.sh
   ```

3. **Ensure code is formatted:**

   ```bash
   ./scripts/lint-all.sh --fix
   ```

4. **Push to your fork:**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request** on GitHub with:
   - Clear title and description
   - Reference to related issues
   - Screenshots (if UI changes)
   - Test evidence

6. **Address review feedback**

7. **Squash commits** if requested

---

## Documentation Updates

### When to Update Documentation

- New features or API endpoints
- Configuration changes
- Breaking changes
- Deprecated features
- Architecture changes

### Documentation Structure

Documentation resides in `/docs` directory:

```text
docs/
├── README.md                 # Documentation index
├── INSTALLATION.md           # Installation guide
├── USAGE.md                  # Usage examples
├── API.md                    # API reference
├── CLI.md                    # CLI reference
├── CONFIGURATION.md          # Configuration guide
├── FEATURE_MATRIX.md         # Feature catalog
├── ARCHITECTURE.md           # Architecture overview
├── CONTRIBUTING.md           # This file
├── TROUBLESHOOTING.md        # Common issues
├── MIGRATIONS.md             # Migration guides
└── examples/                 # Code examples
    ├── portfolio-management.md
    ├── ai-prediction.md
    └── risk-analysis.md
```

### Documentation Style

- Use **Markdown** format
- Include **code examples** for all features
- Use **tables** for parameters and configuration
- Add **diagrams** where helpful (Mermaid supported)
- Keep language **clear and concise**
- Include **working examples** that can be copy-pasted

### Testing Documentation

```bash
# Check documentation links
markdown-link-check docs/*.md

# Verify code examples
python docs/verify_examples.py
```

---

## Code Review Checklist

### For Contributors

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests pass
- [ ] Code is self-documenting or commented
- [ ] No console.log or debug statements
- [ ] No hardcoded secrets or credentials

### For Reviewers

- [ ] Code is clear and maintainable
- [ ] Tests are comprehensive
- [ ] Documentation is complete
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Breaking changes documented

---

## Security

### Reporting Security Issues

### Security Best Practices

- Never commit secrets, API keys, or passwords
- Use environment variables for configuration
- Validate all user inputs
- Use parameterized SQL queries
- Follow OWASP security guidelines

---

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release branch: `release/vX.Y.Z`
4. Run full test suite
5. Create release tag
6. Deploy to staging
7. Verify staging deployment
8. Deploy to production
9. Create GitHub release

---

## License

By contributing to QuantumVest, you agree that your contributions will be licensed under the MIT License.

---
