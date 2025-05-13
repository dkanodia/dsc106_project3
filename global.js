// global.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

// SVG canvas dimensions and margins
export const WIDTH       = 960;
export const HEIGHT      = 600;
export const MARGIN      = { top: 30, right: 20, bottom: 50, left: 60 };
export const innerWidth  = WIDTH  - MARGIN.left - MARGIN.right;
export const innerHeight = HEIGHT - MARGIN.top  - MARGIN.bottom;

// Time formatter for tooltips (“HH:MM”)
export const formatTime = d3.timeFormat("%H:%M");

// Color scale for sex (“M” vs “F”)
export const colorSex = d3.scaleOrdinal()
  .domain(["M", "F"])
  .range(["steelblue", "tomato"]);
