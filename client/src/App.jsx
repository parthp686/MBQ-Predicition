import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Fix Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DEFAULT_LOCATION = {
  latitude: 22.770505,
  longitude: 75.908785,
};

const PLACE_CATEGORY_LABELS = {
  schools: "Schools",
  colleges: "Colleges",
  universities: "Universities",
  hospitals: "Hospitals",
  clinics: "Clinics",
  pharmacies: "Pharmacies",
  hotels: "Hotels",
  restaurants: "Restaurants",
  fastFood: "Fast Food",
  cafes: "Cafes",
  foodCourts: "Food Courts",
  supermarkets: "Supermarkets",
  convenienceStores: "Convenience Stores",
  bakeries: "Bakeries",
  departmentStores: "Department Stores",
  busStops: "Bus Stops",
  markets: "Markets",
  gyms: "Gyms",
  offices: "Offices",
  other: "Other",
};

function escapeCsvValue(value) {
  const stringValue =
    value === null || value === undefined
      ? ""
      : String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadProductsCSV(products) {
  const headers = [
    "Product Name",
    "Brand",
    "SKU",
    "Category",
    "Sub Category",
    "MRP",
    "Suggested Quantity",
    "Recommendation Rank",
  ];

  const rows = products.map((product) => [
    product.productName,
    product.brand,
    product.sku,
    product.category,
    product.subCategory,
    product.mrp,
    product.suggestedInitialQuantity,
    product.recommendationRank,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map(escapeCsvValue).join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "recommended-products.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function LocationMarker({ location, setLocation }) {
  useMapEvents({
    click(event) {
      setLocation({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return (
    <Marker
      position={[
        location.latitude,
        location.longitude,
      ]}
    />
  );
}

function App() {
  const [location, setLocation] =
    useState(DEFAULT_LOCATION);

  const [radius, setRadius] = useState(1000);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);

  const [error, setError] = useState("");

  async function analyzeLocation() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      console.log("Sending location to backend:");

      console.log({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: radius,
      });

      const response = await fetch(
        "http://localhost:5000/api/location/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude,
            radius: radius,
          }),
        }
      );

      console.log(
        "Backend response status:",
        response.status
      );

      const data = await response.json();

      console.log(
        "Backend response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          "Location analysis failed"
        );
      }

      setResult(data.data);

    } catch (err) {
      console.error(
        "LOCATION API ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to connect to server"
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Store Location Advisor</h1>
          <p>
            Find products that are likely to
            perform well at your store location.
          </p>
        </div>
      </header>

      <main className="container">

        {/* LOCATION SECTION */}

        <section className="card">
          <h2>Select Store Location</h2>

          <p className="helper">
            Click anywhere on the map to place
            your store.
          </p>

          <div className="map-wrapper">
            <MapContainer
              center={[
                location.latitude,
                location.longitude,
              ]}
              zoom={14}
              scrollWheelZoom={true}
              className="map"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <LocationMarker
                location={location}
                setLocation={setLocation}
              />
            </MapContainer>
          </div>

          {/* LOCATION DETAILS */}

          <div className="location-details">

            <div className="field">
              <label>Latitude</label>

              <input
                type="text"
                value={location.latitude.toFixed(6)}
                readOnly
              />
            </div>

            <div className="field">
              <label>Longitude</label>

              <input
                type="text"
                value={location.longitude.toFixed(6)}
                readOnly
              />
            </div>

          </div>
        </section>

        {/* RADIUS SECTION */}

        <section className="card">

          <h2>Search Radius</h2>

          <p className="helper">
            Choose how far around the store
            location we should analyze.
          </p>

          <div className="radius-value">
            {radius} meters
          </div>

          <input
            className="radius-slider"
            type="range"
            min="500"
            max="3000"
            step="100"
            value={radius}
            onChange={(event) =>
              setRadius(
                Number(event.target.value)
              )
            }
          />

          <div className="radius-labels">
            <span>500m</span>
            <span>3000m</span>
          </div>

        </section>

        {/* ANALYZE BUTTON */}

        <button
          className="analyze-button"
          onClick={analyzeLocation}
          disabled={loading}
        >
          {loading && <span className="spinner" />}
          {loading
            ? "Analyzing Location..."
            : "Analyze Location"}
        </button>

        {/* ERROR */}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* RESULTS */}

        {result && (
          <section className="card results">

            <h2>Analysis Complete</h2>

            <div className="result-grid">

              <div>
                <span>Nearby Places</span>
                <strong>
                  {result.nearbyPlacesCount}
                </strong>
              </div>

              <div>
                <span>Recommended Products</span>
                <strong>
                  {result.recommendedProducts
                    ?.length || 0}
                </strong>
              </div>

            </div>

            <h3>
              Nearby Places Breakdown
            </h3>

            {(() => {
              const categories = Object.entries(
                result.areaAnalysis || {}
              )
                .filter(
                  ([key]) => key !== "totalPlaces"
                )
                .sort(([, a], [, b]) => b - a);

              if (categories.length === 0) {
                return (
                  <p className="helper">
                    No category data available.
                  </p>
                );
              }

              return (
                <div className="breakdown-grid">
                  {categories.map(
                    ([key, count], index) => (
                      <div
                        className={
                          count > 0
                            ? "breakdown-item"
                            : "breakdown-item zero"
                        }
                        key={key}
                        style={{
                          animationDelay: `${
                            index * 0.04
                          }s`,
                        }}
                      >
                        <span>
                          {PLACE_CATEGORY_LABELS[key] ||
                            key}
                        </span>
                        <strong>{count}</strong>
                      </div>
                    )
                  )}
                </div>
              );
            })()}

            <div className="section-header">
              <h3>
                Recommended Store Products
              </h3>

              <button
                className="download-button"
                type="button"
                disabled={
                  !result.recommendedProducts?.length
                }
                onClick={() =>
                  downloadProductsCSV(
                    result.recommendedProducts || []
                  )
                }
              >
                Download CSV
              </button>
            </div>

            <div className="products">

              {result.recommendedProducts?.map(
                (product, index) => (
                  <div
                    className="product"
                    key={product.productId}
                    style={{
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    <div>
                      <strong>
                        {product.productName}
                      </strong>

                      <p>
                        {product.brand}
                      </p>

                      <small>
                        SKU: {product.sku}
                      </small>
                    </div>

                    <div className="price">
                      ₹{product.mrp}
                    </div>
                  </div>
                )
              )}

            </div>

          </section>
        )}

      </main>
    </div>
  );
}

export default App;