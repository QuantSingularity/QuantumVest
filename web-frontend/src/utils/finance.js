// Shared finance helpers used across Dashboard, Portfolios and Risk Analytics.

// Convert a series of portfolio values into simple daily returns.
export const toDailyReturns = (values = []) => {
  const returns = [];
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1];
    if (prev) returns.push((values[i] - prev) / prev);
  }
  return returns;
};

export const formatCurrency = (value, currency = "USD") => {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: num >= 1000 ? 0 : 2,
  }).format(num);
};

export const formatSignedPercent = (value, decimals = 2) => {
  const num = Number(value);
  if (Number.isNaN(num) || value === null || value === undefined) return "—";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(decimals)}%`;
};

export const formatNumber = (value, decimals = 2) => {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toFixed(decimals);
};

// Green for gains, red for losses, neutral gray at exactly zero.
export const trendClass = (value) => {
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return "trend-neutral";
  return num > 0 ? "trend-up" : "trend-down";
};

export const assetTypeLabel = (type) => {
  const map = {
    stock: "Stock",
    crypto: "Crypto",
    bond: "Bond",
    etf: "ETF",
    commodity: "Commodity",
    forex: "Forex",
    reit: "REIT",
    option: "Option",
    future: "Future",
  };
  return (
    map[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : "Asset")
  );
};
