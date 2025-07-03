declare module 'react-simple-maps' {
  import * as React from 'react';

  export interface ComposableMapProps {
    width?: number;
    height?: number;
    projection?: string;
    projectionConfig?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface GeographiesProps {
    geography: string | any;
    children: (props: { geographies: any[] }) => React.ReactNode;
    parseGeographies?: (features: any) => any[];
    [key: string]: any;
  }

  export interface GeographyProps {
    geography: any;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    [key: string]: any;
  }

  export interface MarkerProps {
    coordinates: [number, number];
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    moveBy?: {
      x: number;
      y: number;
    };
    onMoveStart?: () => void;
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void;
    onZoomStart?: () => void;
    onZoomEnd?: (position: { coordinates: [number, number]; zoom: number }) => void;
    children?: React.ReactNode;
    [key: string]: any;
  }

  export const ComposableMap: React.ComponentType<ComposableMapProps>;
  export const Geographies: React.ComponentType<GeographiesProps>;
  export const Geography: React.ComponentType<GeographyProps>;
  export const Marker: React.ComponentType<MarkerProps>;
  export const ZoomableGroup: React.ComponentType<ZoomableGroupProps>;
} 