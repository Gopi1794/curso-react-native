import React, { useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const TILE_SIZE = 256;

const buildHTML = ({ lat, lng, interactive, markerColor }) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; overflow:hidden; background:#e8e0d8; }
  #map { position:relative; width:100%; height:100%; overflow:hidden; }
  #tiles { position:absolute; top:0; left:0; will-change:transform; }
  #marker {
    position:absolute;
    width:20px; height:20px;
    background:${markerColor};
    border-radius:50%;
    border:3px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.5);
    transform:translate(-50%,-50%);
    z-index:10;
    pointer-events:none;
    transition: left 0.2s, top 0.2s;
  }
</style>
</head>
<body>
<div id="map">
  <div id="tiles"></div>
  <div id="marker"></div>
</div>
<script>
var TILE_SIZE = ${TILE_SIZE};
var ZOOM = ${interactive ? 15 : 14};
var interactive = ${interactive};
var tilesEl = document.getElementById('tiles');
var markerEl = document.getElementById('marker');
var mapEl = document.getElementById('map');

function deg2tile(lat, lng, z) {
  var n = Math.pow(2, z);
  var x = Math.floor((lng + 180) / 360 * n);
  var sinLat = Math.sin(lat * Math.PI / 180);
  var y = Math.floor((1 - Math.log((sinLat + 1) / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return { x: x, y: y };
}

function latLng2px(lat, lng, tx, ty) {
  var n = Math.pow(2, ZOOM);
  var sinLat = Math.sin(lat * Math.PI / 180);
  var px = ((lng + 180) / 360 * n - tx) * TILE_SIZE;
  var py = ((1 - Math.log((sinLat + 1) / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n - ty) * TILE_SIZE;
  return { px: px, py: py };
}

function px2latLng(px, py, tx, ty) {
  var n = Math.pow(2, ZOOM);
  var lng = (px / TILE_SIZE / n + tx / n) * 360 - 180;
  var yTile = py / TILE_SIZE + ty;
  var latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * yTile / n)));
  return { lat: latRad * 180 / Math.PI, lng: lng };
}

var currentTX = 0, currentTY = 0;

function renderMap(lat, lng) {
  var t = deg2tile(lat, lng, ZOOM);
  currentTX = t.x;
  currentTY = t.y;

  tilesEl.innerHTML = '';
  tilesEl.style.width = (TILE_SIZE * 3) + 'px';
  tilesEl.style.height = (TILE_SIZE * 3) + 'px';

  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      var img = document.createElement('img');
      img.src = 'https://tile.openstreetmap.org/' + ZOOM + '/' + (t.x + dx) + '/' + (t.y + dy) + '.png';
      img.style.cssText = 'position:absolute;width:' + TILE_SIZE + 'px;height:' + TILE_SIZE + 'px;'
        + 'left:' + ((dx + 1) * TILE_SIZE) + 'px;top:' + ((dy + 1) * TILE_SIZE) + 'px;';
      tilesEl.appendChild(img);
    }
  }

  var pos = latLng2px(lat, lng, t.x, t.y);
  var markerLeft = TILE_SIZE + pos.px;
  var markerTop  = TILE_SIZE + pos.py;

  var mapW = mapEl.offsetWidth || 300;
  var mapH = mapEl.offsetHeight || 200;
  var offsetX = markerLeft - mapW / 2;
  var offsetY = markerTop  - mapH / 2;

  tilesEl.style.transform = 'translate(' + (-offsetX) + 'px,' + (-offsetY) + 'px)';
  markerEl.style.left = markerLeft + 'px';
  markerEl.style.top  = markerTop  + 'px';
  markerEl._offsetX = offsetX;
  markerEl._offsetY = offsetY;
}

window.updateMap = function(lat, lng) {
  renderMap(lat, lng);
};

if (interactive) {
  mapEl.addEventListener('click', function(e) {
    var rect = mapEl.getBoundingClientRect();
    var clickX = e.clientX - rect.left + (markerEl._offsetX || 0);
    var clickY = e.clientY - rect.top  + (markerEl._offsetY || 0);
    var coords = px2latLng(clickX, clickY, currentTX, currentTY);
    renderMap(coords.lat, coords.lng);
    window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: coords.lat, longitude: coords.lng }));
  });
}

renderMap(${lat}, ${lng});
</script>
</body>
</html>`;

export default function LeafletMap({
    style,
    latitude = -34.6037,
    longitude = -58.3816,
    interactive = false,
    markerColor = '#ff8000',
    onPress,
}) {
    const webViewRef = useRef(null);
    const initializedRef = useRef(false);
    const htmlRef = useRef(buildHTML({ lat: latitude, lng: longitude, interactive, markerColor }));

    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            return;
        }
        if (webViewRef.current) {
            webViewRef.current.injectJavaScript(
                `window.updateMap(${latitude}, ${longitude}); true;`
            );
        }
    }, [latitude, longitude]);

    const handleMessage = (event) => {
        if (!onPress) return;
        try {
            const data = JSON.parse(event.nativeEvent.data);
            onPress(data);
        } catch {}
    };

    return (
        <WebView
            ref={webViewRef}
            style={[styles.map, style]}
            source={{ html: htmlRef.current }}
            onMessage={handleMessage}
            scrollEnabled={false}
            javaScriptEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
        />
    );
}

const styles = StyleSheet.create({
    map: { flex: 1 },
});
