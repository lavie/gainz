This project is a single-page HTML visualizer of BTC portfolio worth over time.
It only tracks BTC - no other asset. 
The main display is a line chart showing the value of the portfolio in USD over time. The minimum resolution is days based on the closing price of BTCUSD at that time.
The amount of BTC held is configurable as a URL parameter. No need for local storage.
The design should be sleek and minimal. Dark mode should be the default. The line in the chart should be in bitcoin-orange.
The user can choose the time window: 1d, this week, 7d, This month, 30d, 3 months, 6 months, this year (YTD), 1Y, 5Y, ALL
Based on the time window chosen the page also display in large bold number boxes: Total Percent gained, Total USD gained, CAGR

Phase 1:
Visualizing the portfolio as if the amount of BTC held was purchased on the first day of historical price data. For simplicity's sake.

Phase 2:
User should be able to add trades: purchases and sales of bitcoin at given dates, based on the known price on that date. This should allow to calculate gains more accurately over the portfolio's lifetime.
