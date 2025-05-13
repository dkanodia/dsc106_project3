
// Create a basic CSS style element
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
  
  .bg.light {
    fill: lightyellow;
  }
  
  .bg.dark {
    fill: lightgrey;
  }
  
  .activity-line {
    stroke: steelblue;
    stroke-width: 1.5px;
    fill: none;
  }
  
  .temperature-line {
    stroke: tomato;
    stroke-width: 1.5px;
    fill: none;
  }
  
  .focus-line {
    stroke: black;
    stroke-width: 1px;
  }
  
  .legend text {
    font-size: 12px;
  }
  
  .controls {
    margin-bottom: 20px;
  }
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

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  loadD3().then(initVisualization).catch(err => {
    console.error("Error loading D3:", err);
    document.getElementById("chart").innerHTML = "<p>Error loading D3. Please check the console for details.</p>";
  });
});

function initVisualization() {
  console.log("D3 loaded, initializing visualization");
  
  const margin = { top: 20, right: 60, bottom: 40, left: 50 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Use d3.csv to load the data
  d3.csv("data/mice.csv").then(function(csvData) {
    console.log("Data loaded successfully", csvData.slice(0, 5));
    
    // Process the data
    const data = csvData.map(d => ({
      min: +d.min_of_day,
      activity: +d.act,
      temperature: +d.temp,
      mouse_id: d.mouse_id,
      light: d.light === "True"
    }));
    
    // Process data by rolling up
    const rolled = Array.from(
      d3.rollup(
        data,
        v => ({
          avgAct: d3.mean(v, d => d.activity),
          avgTemp: d3.mean(v, d => d.temperature),
          light: d3.mean(v, d => d.light ? 1 : 0) > 0.5
        }),
        d => d.min
      ),
      ([min, vals]) => ({ min, ...vals })
    ).sort((a, b) => a.min - b.min);

    const x = d3.scaleLinear().domain([0, 1440]).range([0, width]);
    const yAct = d3.scaleLinear().domain([0, d3.max(rolled, d => d.avgAct)]).nice().range([height, 0]);
    const yTemp = d3.scaleLinear().domain(d3.extent(rolled, d => d.avgTemp)).nice().range([height, 0]);

    // Set up controls
    const playButton = d3.select("#play-button");
    let playing = false;
    let timer;
    let currentTime = 0;
    let animationRate = 1;
    
    playButton.on("click", () => {
      playing = !playing;
      if (playing) {
        timer = setInterval(updateTime, 100);
      } else {
        clearInterval(timer);
      }
    });

    const scrubber = d3.select("#scrubber");
    scrubber.on("input", function() {
      currentTime = +this.value;
      updateVisualization();
    });

    const speedDropdown = d3.select("#speed-dropdown");
    speedDropdown.on("change", function() {
      animationRate = +this.value;
    });

    function updateTime() {
      currentTime = (currentTime + animationRate) % 1440;
      scrubber.node().value = currentTime;
      updateVisualization();
    }

    // Create light/dark background segments
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
      .attr("x", d => x(d.start))
      .attr("y", 0)
      .attr("width", d => x(d.end) - x(d.start))
      .attr("height", height)
      .attr("opacity", 0.3);

    // Draw lines for activity and temperature
    const lineAct = d3.line()
      .x(d => x(d.min))
      .y(d => yAct(d.avgAct));

    const lineTemp = d3.line()
      .x(d => x(d.min))
      .y(d => yTemp(d.avgTemp));

    svg.append("path")
      .datum(rolled)
      .attr("class", "activity-line")
      .attr("d", lineAct);

    svg.append("path")
      .datum(rolled)
      .attr("class", "temperature-line")
      .attr("d", lineTemp);

    // Add axes
    const xAxis = d3.axisBottom(x)
      .tickValues(d3.range(0, 1441, 120))
      .tickFormat(d => {
        return (d === 0 || d === 1440) ? "midnight"
          : ((d / 60) % 12 || 12) + ((d / 60) >= 12 ? "pm" : "am");
      });

    // Add interactive elements
    const focusLine = svg.append("line")
      .attr("class", "focus-line")
      .attr("y1", 0)
      .attr("y2", height)
      .style("display", "none");

    const tooltip = d3.select("#chart")
      .append("div")
      .attr("class", "tooltip")
      .style("display", "none");

    function updateVisualization() {
      // Update the focus line to show current time
      focusLine
        .attr("x1", x(currentTime))
        .attr("x2", x(currentTime))
        .style("display", null);
      
      // Find the closest data point
      const bisect = d3.bisector(d => d.min).left;
      const i = bisect(rolled, currentTime);
      const d = i < rolled.length ? rolled[i] : null;
      
      if (d) {
        tooltip
          .style("left", `${x(d.min) + margin.left + 10}px`)
          .style("top", `${margin.top + 20}px`)
          .style("display", "inline-block")
          .html(`
            <strong>Time:</strong> ${Math.floor(d.min / 60)}h ${d.min % 60}m<br>
            <strong>Activity:</strong> ${d.avgAct.toFixed(2)}<br>
            <strong>Temp:</strong> ${d.avgTemp.toFixed(2)} °C<br>
            <strong>Light:</strong> ${d.light ? "Day" : "Night"}
          `);
      }
    }

    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", function(event) {
        const [mx] = d3.pointer(event, this);
        const min = x.invert(mx);
        const bisect = d3.bisector(d => d.min).left;
        const i = bisect(rolled, min);
        const d = i < rolled.length ? rolled[i] : null;

        if (d) {
          focusLine
            .attr("x1", x(d.min))
            .attr("x2", x(d.min))
            .style("display", null);

          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY}px`)
            .style("display", "inline-block")
            .html(`
              <strong>Time:</strong> ${Math.floor(d.min / 60)}h ${d.min % 60}m<br>
              <strong>Activity:</strong> ${d.avgAct.toFixed(2)}<br>
              <strong>Temp:</strong> ${d.avgTemp.toFixed(2)} °C<br>
              <strong>Light:</strong> ${d.light ? "Day" : "Night"}
            `);
        }
      })
      .on("mouseout", () => {
        if (!playing) {
          focusLine.style("display", "none");
          tooltip.style("display", "none");
        }
      });

    // Add checkbox functionality
    const activityCheckbox = d3.select("#activity-checkbox");
    activityCheckbox.on("change", function() {
      const visible = this.checked;
      svg.selectAll(".activity-line").style("visibility", visible ? "visible" : "hidden");
    });

    // Add mouse dropdown functionality
    const mouseDropdown = d3.select("#mouse-dropdown");
    mouseDropdown.on("change", function() {
      // In a real implementation, this would filter data for the selected mouse
      const mouseId = this.value;
      console.log(`Selected mouse: ${mouseId}`);
    });



    
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .append("text")
      .attr("x", width / 2)
      .attr("y", 35)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text("Time of Day");

    svg.append("g")
      .call(d3.axisLeft(yAct))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text("Activity Level");

    svg.append("g")
      .attr("transform", `translate(${width},0)`)
      .call(d3.axisRight(yTemp))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", height / 2)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text(" Temperature (°C)");

    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 260},20)`);
      
    legend.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", 20).attr("y2", 0)
      .attr("stroke", "steelblue").attr("stroke-width", 2);
      
    legend.append("text")
      .attr("x", 25).attr("y", 5)
      .text("Average Activity (Left Axis)");
      
    legend.append("line")
      .attr("x1", 0).attr("y1", 20)
      .attr("x2", 20).attr("y2", 20)
      .attr("stroke", "tomato").attr("stroke-width", 2);
      
    legend.append("text")
      .attr("x", 25).attr("y", 25)
      .text("Average Temperature (Right Axis)");
  })
  .catch(error => {
    console.error("Error loading the CSV file:", error);
    document.getElementById("chart").innerHTML = `<p class="text-red-500 font-bold">Error loading data: ${error.message}. Please check the console for details.</p>`;
  });
}

