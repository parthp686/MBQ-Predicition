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
        `http://localhost:5000/api/location/analyze?lat=${location.latitude}&lon=${location.longitude}&radius=${radius}`
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
              Recommended Store Products
            </h3>

            <div className="products">

              {result.recommendedProducts?.map(
                (product) => (
                  <div
                    className="product"
                    key={product.productId}
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