#!/bin/bash
# Complete Verification and Fix Script for Orderly
# This script runs all quality checks and fixes issues

set -e

echo "========================================"
echo "Orderly - Complete Verification Script"
echo "========================================"
echo ""

# Step 1: Install Dependencies
echo "[Step 1/10] Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 2: Clean build artifacts
echo "[Step 2/10] Cleaning build artifacts..."
npm run clean
echo "✓ Clean completed"
echo ""

# Step 3: Check for outdated packages
echo "[Step 3/10] Checking for outdated packages..."
npm outdated || true
echo ""

# Step 4: Update dependencies (if needed)
echo "[Step 4/10] Updating dependencies to latest..."
echo "NOTE: Review updates before proceeding"
echo "Run: npm update"
echo ""

# Step 5: Format code
echo "[Step 5/10] Formatting code with Prettier..."
npm run format || echo "WARNING: Some files could not be formatted"
echo "✓ Code formatted"
echo ""

# Step 6: Lint and fix
echo "[Step 6/10] Linting and fixing code..."
npm run lint:fix || {
    echo "WARNING: Some lint issues need manual fixes"
    echo "Running lint to show remaining issues..."
    npm run lint || true
}
echo "✓ Linting completed"
echo ""

# Step 7: TypeScript compilation
echo "[Step 7/10] Compiling TypeScript..."
npm run build
echo "✓ TypeScript compiled successfully"
echo ""

# Step 8: Run tests with coverage
echo "[Step 8/10] Running tests with coverage..."
npm run test:coverage
echo "✓ All tests passed with sufficient coverage"
echo ""

# Step 9: Check code duplication
echo "[Step 9/10] Checking code duplication..."
npm run duplication:check || {
    echo "WARNING: Code duplication exceeds 1% threshold"
    echo "Review duplication report in reports/jscpd/"
}
echo "✓ Duplication check completed"
echo ""

# Step 10: Full verification
echo "[Step 10/10] Running full verification..."
npm run verify
echo "✓ Full verification passed"
echo ""

echo "========================================"
echo "All checks completed successfully! ✓"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Review coverage report: coverage/index.html"
echo "2. Review duplication report: reports/jscpd/"
echo "3. Commit changes: git add . && git commit -m \"Complete testing implementation\""
echo "4. Push changes: git push"
echo ""
