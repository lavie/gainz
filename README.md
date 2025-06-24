# Bitcoin Portfolio Tracker

A sleek, minimal single-page application that visualizes your Bitcoin portfolio performance over time. Track your BTC holdings with real-time pricing and historical data analysis.

## Features

- 📊 **Real-time Bitcoin pricing** with smart caching
- 📈 **Historical portfolio tracking** with 10+ years of price data
- ⚡ **Fast loading** with optimized data storage
- 🌙 **Dark theme** with Bitcoin orange accents
- 📱 **Responsive design** for all devices
- 🔧 **Configurable portfolio size** via URL parameters

### Coming Soon
- 📊 Interactive charts and visualizations
- 📅 Multiple time windows (1d, 7d, 30d, 3mo, 6mo, 1y, 5y, all)
- 💰 Advanced metrics (Total % gained, Total USD gained, CAGR)
- 🔄 Trade tracking with buy/sell dates

## Quick Start

### Option 1: Development Server (Recommended)
```bash
# Clone or download the project
git clone [repository-url]
cd gainz

# Start development server
make dev
```

This will install dependencies and open the app at `http://localhost:8080`

### Option 2: Direct File Access
Simply open `index.html` in your web browser. Note: Some features may not work due to CORS restrictions.

## Usage

### Basic Usage
Open the app to see your 1 BTC portfolio value with current Bitcoin pricing.

### Custom Portfolio Size
Add a `btc` parameter to the URL to specify your portfolio size:
- `?btc=2.5` - Track 2.5 BTC
- `?btc=0.1` - Track 0.1 BTC (100,000 sats)

Examples:
- `http://localhost:8080?btc=2.5`
- `http://localhost:8080?btc=0.05`

## Development

### Available Commands
```bash
make dev           # Start development server
make test          # Run unit tests
make test-watch    # Run tests in watch mode
make test-coverage # Generate test coverage report
make clean         # Clean dependencies
make help          # Show all commands
```

### Project Structure
```
gainz/
├── index.html              # Main application
├── btc-prices.json         # Historical price data
├── js/
│   ├── data/               # Data services
│   ├── business/           # Business logic (coming soon)
│   ├── ui/                 # UI components (coming soon)
│   └── app.js             # Main coordinator
├── css/
│   └── style.css          # Styling
└── tests/                 # Unit tests
```

## Technical Details

- **Pure JavaScript** with ES6 modules
- **No build step required** for production
- **CoinGecko API** for real-time and historical Bitcoin prices
- **Smart caching** (1-minute cache for current prices)
- **Optimized data format** (75% smaller than standard JSON)
- **Comprehensive test coverage** with Jest

## Data Sources

- **Current prices**: CoinGecko API (free tier, no authentication required)
- **Historical data**: Pre-loaded JSON file updated daily via GitHub Actions
- **Price history**: Daily closing prices from 2014 to present

## Browser Support

Modern browsers with ES6 module support:
- Chrome 61+
- Firefox 60+
- Safari 10.1+
- Edge 16+

## Contributing

For development details and technical documentation, see [CLAUDE.md](CLAUDE.md).

## License

MIT License - see project files for details.
