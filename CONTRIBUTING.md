# Contributing to Solid Resources Catalog

Thank you for your interest in contributing to the Solid Resources Catalog! This document provides guidelines and instructions for contributing to this project.

## How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs or suggest new features
- Before creating a new issue, please check if a similar issue already exists
- When reporting bugs, please include:
  - A clear description of the problem
  - Steps to reproduce the issue
  - Expected behavior
  - Actual behavior
  - Any relevant error messages

### Making Changes

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes
4. Ensure your changes follow our commit message conventions (see below)
5. Submit a pull request

### Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. Commit messages should be structured as follows:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types include:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Pre-commit Hooks

This project uses Husky and commitlint to enforce commit message conventions. When you make a commit, the following checks will run automatically:

1. **Commit Message Validation**: Your commit message will be checked against the Conventional Commits specification. If your message doesn't follow the format, the commit will be rejected with helpful error messages.
2. **RDF Validation**: The test script will run to ensure all RDF files are valid.

To bypass these checks in exceptional cases (not recommended), you can use the `--no-verify` flag with your git commit command. However, please ensure your commit message follows the conventions even when bypassing the checks.

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/solid/catalog.git
   cd catalog
   ```
2. Install dependencies:

   ```bash
   npm install
   ```
3. Build the project:

   ```bash
   npm run build
   ```
4. Run tests:

   ```bash
   npm test
   ```

### RDF Data Guidelines

When contributing RDF data:

1. Follow the SHACL shapes defined in `catalog-shacl.shce`
2. Use the SKOS concepts defined in `catalog-skos.ttl`
3. Ensure all data is valid RDF/Turtle
4. Test your changes using the provided test script:
   ```bash
   npm test
   ```

### Pull Request Process

1. Update the README.md with details of changes if needed
2. Ensure all tests pass
3. The PR will be merged once you have the sign-off of at least one maintainer

## Questions and Discussion

For questions about the public Solid Resources Catalog on solidproject.org

- Join the [Solid Practitioners matrix chat](https://matrix.to/#/#solid-practitioners:matrix.org)

For questions and discussions about the catalog in general:

- Join the [Solid Catalog matrix chat](https://matrix.to/#/#solid_catalog:matrix.org)
- Participate in the [GitHub Discussions](https://github.com/solid/catalog/discussions)

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
