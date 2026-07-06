// Leaflet type declarations for Vercel build compatibility
declare module "leaflet" {
  const L: any;
  export default L;
  export const Map: any;
  export const TileLayer: any;
  export const Marker: any;
  export const DivIcon: any;
  export const latLngBounds: any;
  export const DomUtil: any;
}
