// basic CSS style element
const styleElement = document.createElement('style');
styleElement.textContent = `
  .tooltip {
    position: absolute;
    background: white;
    padding: 6px;
    border: 1px solid #ccc;
    border-radius: 4px;
    pointer-events: none;
    font-size: 14px;
    z-index: 100;
  }

  .bg.light { fill: lightyellow; }
  .bg.dark  { fill: lightgrey; }

  .activity-line { stroke: steelblue;    stroke-width: 1.5px; fill: none; }
  .temperature-line { stroke: tomato;     stroke-width: 1.5px; fill: none; }
  .focus-line      { stroke: black;       stroke-width: 1px;   }

  .legend text    { font-size: 12px; }
  .controls       { margin-bottom: 20px; }
`;
document.head.appendChild(styleElement);

// Load D3 from CDN
function loadD3() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/d3@7";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load D3'));
    document.head.appendChild(script);
  });
}

// Initialize once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadD3()
    .then(initVisualization)
    .catch(err => {
      console.error("Error loading D3:", err);
      document.getElementById("chart").innerHTML =
        "<p>Error loading D3. Please check the console for details.</p>";
    });
});

function initVisualization() {
  console.log("D3 loaded, initializing visualization");

  const margin = { top: 20, right: 60, bottom: 40, left: 50 };
  const width  = 800 - margin.left - margin.right;
  const height = 400 - margin.top  - margin.bottom;

  const svg = d3.select("#chart")
    .append("svg")
      .attr("width",  width + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Load and preprocess data
  d3.csv("mice.csv").then(csvData => {
    const data = csvData.map(d => ({
      min:         +d.min_of_day,
      activity:    +d.act,
      temperature: +d.temp,
      mouse_id:     d.mouse_id,
      light:        d.light === "True"
    }));

    const rolled = Array.from(
      d3.rollup(
        data,
        v => ({
          avgAct:  d3.mean(v, d => d.activity),
          avgTemp: d3.mean(v, d => d.temperature),
          light:   d3.mean(v, d => d.light ? 1 : 0) > 0.5
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
        .attr("class", d => d.light ? "bg light" : "bg dark")
        .attr("x",      d => x(d.start))
        .attr("y",      0)
        .attr("width",  d => x(d.end) - x(d.start))
        .attr("height", height)
        .attr("opacity", 0.3);

    // Line generators
    const lineAct  = d3.line().x(d => x(d.min)).y(d => yAct(d.avgAct));
    const lineTemp = d3.line().x(d => x(d.min)).y(d => yTemp(d.avgTemp));

    // Draw lines (with clip path)
    svg.append("defs").append("clipPath")
        .attr("id", "clip")
      .append("rect")
        .attr("width",  width)
        .attr("height", height);

    svg.append("path")
      .datum(rolled)
      .attr("class", "activity-line")
      .attr("clip-path", "url(#clip)")
      .attr("d",         lineAct);

    svg.append("path")
      .datum(rolled)
      .attr("class", "temperature-line")
      .attr("clip-path", "url(#clip)")
      .attr("d",         lineTemp);

    // Axes
    const xAxis = d3.axisBottom(x)
      .tickValues(d3.range(0, 1441, 120))
      .tickFormat(d =>
        (d === 0 || d === 1440) ? "midnight"
        : ((d / 60) % 12 || 12) + ((d / 60) >= 12 ? "pm" : "am")
      );

    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
    .append("text")
      .attr("x", width / 2).attr("y", 35)
      .attr("fill", "#000").attr("text-anchor", "middle")
      .text("Time of Day");

    svg.append("g")
      .attr("class", "y-axis left")
      .call(d3.axisLeft(yAct))
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40).attr("x", -height/2)
      .attr("fill", "#000").attr("text-anchor", "middle")
      .text("Average Activity Level");

    svg.append("g")
      .attr("class", "y-axis right")
      .attr("transform", `translate(${width},0)`)
      .call(d3.axisRight(yTemp))
    .append("text")
      .attr("transform", `translate(${margin.right - 10},${height/2}) rotate(90)`)
      .attr("fill", "#000").attr("text-anchor", "middle")
      .text("Average Temperature (°C)");

  
    // …rest of our interactive code

  }).catch(error => {
    console.error("Error loading the CSV file:", error);
    document.getElementById("chart").innerHTML =
      `<p class="text-red-500 font-bold">
         Error loading data: ${error.message}
       </p>`;
  });
}
