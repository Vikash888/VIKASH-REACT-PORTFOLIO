declare module 'd3-scale' {
  export type ScaleLinearRange = Array<number | string>;
  
  export interface ScaleLinear<Range> {
    (value: number): Range;
    domain(domain: Array<number>): this;
    range(range: Array<Range>): this;
  }

  export function scaleLinear<Range = number>(): ScaleLinear<Range>;
} 