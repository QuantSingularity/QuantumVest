import React, { useEffect, useRef, useState } from "react";
import { assetAPI } from "../../services/api";
import { assetTypeLabel } from "../../utils/finance";
import "../../styles/AssetSearch.css";

// Debounced asset search box. Calls onSelect(asset) when the user picks a
// result. Clears itself after a selection unless `keepQuery` is set.
const AssetSearchBox = ({
  onSelect,
  placeholder = "Search by symbol or name…",
  keepQuery = false,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 1) {
      setResults([]);
      return undefined;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await assetAPI.search(query.trim());
        if (data.success) {
          setResults(data.assets || []);
          setOpen(true);
        }
      } catch (err) {
        setError("Search unavailable right now.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (asset) => {
    onSelect(asset);
    setOpen(false);
    if (!keepQuery) setQuery("");
  };

  return (
    <div className="asset-search" ref={wrapperRef}>
      <div className="input-group">
        <span className="input-group-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          className="input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoFocus={autoFocus}
        />
        {loading && <span className="asset-search-spinner" />}
      </div>

      {open && (
        <div className="asset-search-results">
          {error && <p className="asset-search-empty">{error}</p>}
          {!error && results.length === 0 && !loading && (
            <p className="asset-search-empty">
              No assets found for &quot;{query}&quot;.
            </p>
          )}
          {results.map((asset) => (
            <button
              type="button"
              key={asset.id}
              className="asset-search-result"
              onClick={() => handleSelect(asset)}
            >
              <div>
                <span className="asset-symbol">{asset.symbol}</span>
                <span className="asset-name">{asset.name}</span>
              </div>
              <span className="badge badge-primary">
                {assetTypeLabel(asset.asset_type)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssetSearchBox;
