import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
// SVG setup
// SVG setup
const margin = { top: 20, right: 60, bottom: 40, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select("#chart")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load and preprocess data

d3.csv("mice.csv", d => ({
  min:        +d.min_of_day,
  activity:   +d.act,
  temperature:+d.temp,
  light:      d.light === "True"
}))
.then(data => {
  // Aggregate by minute-of-day
  const rolled = Array.from(
    d3.rollup(
      data,
      v => ({
        avgAct:  d3.mean(v, d => d.activity),
        avgTemp: d3.mean(v, d => d.temperature),
        light:   d3.mean(v, d => d.light) > 0.5
      }),
      d => d.min
    ),
    ([min, vals]) => ({ min, ...vals })
  ).sort((a, b) => a.min - b.min);

  // Scales
  const x = d3.scaleLinear()
    .domain([0, 1440])
    .range([0, width]);

  const yAct = d3.scaleLinear()
    .domain([0, d3.max(rolled, d => d.avgAct)]).nice()
    .range([height, 0]);

  const yTemp = d3.scaleLinear()
    .domain(d3.extent(rolled, d => d.avgTemp)).nice()
    .range([height, 0]);

  // Background shading
  const segments = [];
  let segStart = rolled[0].min, segLight = rolled[0].light;
  rolled.forEach((d, i) => {
    if (i > 0 && d.light !== segLight) {
      segments.push({ start: segStart, end: rolled[i].min, light: segLight });
      segStart = d.min;
      segLight = d.light;
    }
  });
  segments.push({ start: segStart, end: 1440, light: segLight });

  svg.selectAll("rect.bg")
    .data(segments)
    .enter().append("rect")
      .attr("class", "bg")
      .attr("x", d => x(d.start))
      .attr("y", 0)
      .attr("width", d => x(d.end) - x(d.start))
      .attr("height", height)
      .attr("fill", d => d.light ? "lightyellow" : "lightgrey")
      .attr("opacity", 0.3);

  // Line generators
  const lineAct = d3.line()
    .x(d => x(d.min))
    .y(d => yAct(d.avgAct));

  const lineTemp = d3.line()
    .x(d => x(d.min))
    .y(d => yTemp(d.avgTemp));

  // Draw lines
  svg.append("path")
    .datum(rolled)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", lineAct);

  svg.append("path")
    .datum(rolled)
    .attr("fill", "none")
    .attr("stroke", "tomato")
    .attr("stroke-width", 1.5)
    .attr("d", lineTemp);

  // Axes
  const xAxis = d3.axisBottom(x)
    .tickValues(d3.range(0, 1441, 120))
    .tickFormat(d => {
      return (d === 0 || d === 1440) ? "midnight"
        : ((d / 60) % 12 || 12) + ((d / 60) >= 12 ? "pm" : "am");
    });

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .append("text")
      .attr("x", width / 2)
      .attr("y", 35)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text("Time of Day");

  // Left y-axis (Activity)
  svg.append("g")
    .call(d3.axisLeft(yAct))
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text("Average Activity Level");

  // Right y-axis (Temperature)
  svg.append("g")
    .attr("transform", `translate(${width},0)`)   
    .call(d3.axisRight(yTemp))
    .append("text")
      .attr("transform", "rotate(180)")
      .attr("y", 40)
      .attr("x", height / 2)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text("Average Temperature (degree C)");

  // Legend
  svg.append("g")
    .attr("transform", `translate(${width - 260},20)`) 
    .call(g => {
      g.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", 20).attr("y2", 0)
        .attr("stroke", "steelblue").attr("stroke-width", 2);
      g.append("text")
        .attr("x", 25).attr("y", 5)
        .text("Activity (Left Axis)");
      g.append("line")
        .attr("x1", 0).attr("y1", 20)
        .attr("x2", 20).attr("y2", 20)
        .attr("stroke", "tomato").attr("stroke-width", 2);
      g.append("text")
        .attr("x", 25).attr("y", 25)
        .text("Temperature (Right Axis)");
    });
});
