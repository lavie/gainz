# Bitcoin Portfolio Tracker - Development Makefile

.PHONY: help install dev serve test test-watch test-coverage fetch-prices update-prices check-prices convert-s2f clean

# Default target
help:
	@echo "Bitcoin Portfolio Tracker - Available Commands:"
	@echo ""
	@echo "  make install       - Install NPM dependencies"
	@echo "  make dev           - Start development server (http://localhost:8080)"
	@echo "  make serve         - Start development server (alias for dev)"
	@echo "  make test          - Run unit tests"
	@echo "  make test-watch    - Run unit tests in watch mode"
	@echo "  make test-coverage - Run unit tests with coverage report"
	@echo "  make fetch-prices  - Fetch all Bitcoin historical price data (full refresh)"
	@echo "  make update-prices - Update Bitcoin price data (incremental, only missing dates)"
	@echo "  make check-prices  - Check what price data would be updated (dry-run)"
	@echo "  make convert-s2f   - Convert s2f.js historical data to project format"
	@echo "  make clean         - Clean node_modules and package-lock.json"
	@echo ""

# Install NPM dependencies
install:
	@echo "Installing NPM dependencies..."
	npm install

# Start development server
dev: install
	@echo "Starting development server on http://localhost:8080"
	@echo "Press Ctrl+C to stop the server"
	npm run dev

# Alias for dev
serve: dev

# Run unit tests
test: install
	@echo "Running unit tests..."
	npm test

# Run unit tests in watch mode
test-watch: install
	@echo "Running unit tests in watch mode..."
	@echo "Press 'q' to quit, 'a' to run all tests"
	npm run test:watch

# Run unit tests with coverage
test-coverage: install
	@echo "Running unit tests with coverage report..."
	npm run test:coverage

# Fetch Bitcoin historical price data (full refresh)
fetch-prices: install
	@echo "Fetching Bitcoin historical price data from CoinGecko API..."
	@echo "This may take a few seconds due to API rate limits..."
	npm run fetch-prices

# Update Bitcoin price data (incremental)
update-prices: install
	@echo "Updating Bitcoin price data with latest prices..."
	@echo "Checking for missing dates and fetching only new data..."
	node scripts/update-prices.js --verbose

# Check what price data would be updated (dry-run)
check-prices: install
	@echo "Checking Bitcoin price data for missing dates..."
	@echo "This will show what would be updated without making changes..."
	node scripts/update-prices.js --dry-run --verbose

# Convert s2f.js data to project format
convert-s2f: install
	@echo "Converting s2f.js historical data to project format..."
	@echo "This will replace btc-prices.json with historical data from s2f.js..."
	npm run convert-s2f

# Clean dependencies
clean:
	@echo "Cleaning dependencies..."
	rm -rf node_modules
	rm -f package-lock.json
	rm -rf coverage
	@echo "Clean complete"