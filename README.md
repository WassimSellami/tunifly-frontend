# TuniFly Frontend

The React-based web frontend for **TuniFly** — a flight tracking and price monitoring app for Tunisia. It provides an interactive dashboard to search flights, visualize price history charts, and manage price alert subscriptions.

**Live website:** [tunifly.me](https://tunifly.onrender.com)

## Features

- **Flight Search** – Search and filter flights by date and route
- **Price History Charts** – Interactive Chart.js graphs showing price trends over time
- **Date Range Picker & Slider** – Filter data with intuitive date and range controls
- **Subscription Management** – Subscribe to price alerts for specific flights

## Tech Stack

- **React 19** (Create React App)
- **Chart.js** + react-chartjs-2 – Data visualization
- **react-datepicker** + rc-slider – Date and range UI components
- **date-fns** – Date formatting and utilities

## Getting Started

### Prerequisites

- Node.js 18+
- The [TuniFly Backend](https://github.com/WassimSellami/tunifly-backend) running and accessible

### Installation

```bash
git clone https://github.com/WassimSellami/tunifly-Frontend.git
cd tunifly-frontend
npm install
```
### Run

```bash
npm start
```

The app will be available at `http://localhost:3000`.

## Backend

This frontend requires the TuniFly backend API to function. See the backend repository for setup instructions:
[https://github.com/WassimSellami/tunifly-backend](https://github.com/WassimSellami/tunifly-backend)
