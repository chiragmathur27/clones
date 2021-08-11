import React, { useState } from "react";
import ReactMapGL, { Marker, Popup } from "react-map-gl";
import { getCenter } from "geolib";

function Map({ searchResults }) {
  const [selected, setSelected] = useState({});
  //Transform  the search results into the required object

  const coord = searchResults.map((searchResult) => ({
    longitude: searchResult.long,
    latitude: searchResult.lat,
  }));

  const center = getCenter(coord);
  const [viewport, setViewport] = useState({
    width: "100%",
    height: "100%",
    latitude: center.latitude,
    longitude: center.longitude,
    zoom: 11,
  });
  return (
    <ReactMapGL
      mapStyle="mapbox://styles/chiragm2702/cks6ds74g269i17n39kw8kp0g"
      mapboxApiAccessToken={process.env.mapbox_key}
      {...viewport}
      onViewportChange={(nextViewport) => setViewport(nextViewport)}
    >
      {searchResults.map((res) => (
        <div key={res.lat}>
          <Marker
            longitude={res.long}
            latitude={res.lat}
            offsetLeft={-20}
            offsetTop={-10}
          >
            <p
              role="img"
              onClick={() => setSelected(res)}
              className="cursor-pointer text-2xl animate-bounce"
              aria-label="pin"
            >
              📍
            </p>
          </Marker>
          {selected.long === res.lat && (
            <Popup
              onClose={() => setSelected({})}
              closeOnClick={true}
              latitude={res.lat}
              longitude={res.long}
            >
              {res.title}
            </Popup>
          )}
        </div>
      ))}
    </ReactMapGL>
  );
}

export default Map;
