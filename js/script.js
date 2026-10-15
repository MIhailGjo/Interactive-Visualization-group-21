
// Weather Olympics 2017
// CMSC471 - Interactive Visualization

// ------------------------------------
// 1. Chart size and margins
// ------------------------------------

const margin = {
    top: 30,
    right: 90,
    bottom: 60,
    left: 250
};

const width = 900 - margin.left - margin.right;
const height = 550 - margin.top - margin.bottom;

// ------------------------------------
// 2. Global variables
// ------------------------------------

let allData = [];
let category = "TMAX";
let selectedMonth = "all";

let xScale, yScale;

// ------------------------------------
// 3. Create the SVG
// ------------------------------------

const svg = d3.select("#vis")
    .append("svg")
    .attr("viewBox", "0 0 900 550")
    .append("g")
    .attr(
        "transform",
        `translate(${margin.left},${margin.top})`
    );

// ------------------------------------
// 4. Weather categories
// ------------------------------------

const settings = {
    TMAX: {
        title: "Hottest Weather Stations",
        unit: "°F",
        color: "#e76f51"
    },

    PRCP: {
        title: "Rainiest Weather Stations",
        unit: "in",
        color: "#3b82f6"
    },

    WSF5: {
        title: "Windiest Weather Stations",
        unit: "mph",
        color: "#2a9d8f"
    }
};

// ------------------------------------
// 5. Convert CSV strings to numbers
// ------------------------------------

function convertNumber(value) {
    if (value === "" || value == null) {
        return null;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return null;
    }

    return number;
}

// ------------------------------------
// 6. Load weather dataset
// ------------------------------------

function init() {

    d3.csv("./data/weather.csv", d => ({
        id: d.station + "|" + d.latitude + "|" + d.longitude,
        station: d.station,
        state: d.state,
        date: d.date,

        TMAX: convertNumber(d.TMAX),
        PRCP: convertNumber(d.PRCP),
        WSF5: convertNumber(d.WSF5)
    }))
    .then(data => {

        allData = data;

        console.log("Weather data loaded:", allData.length);

        setupSelectors();
        updateVis();

    })
    .catch(error => {
        console.error("Error loading data:", error);
        d3.select("#status")
            .text("Error loading weather.csv");
    });
}

// ------------------------------------
// 7. Connect dropdowns
// ------------------------------------

function setupSelectors() {

    d3.select("#category")
        .on("change", function() {
            category = this.value;
            updateVis();
        });

    d3.select("#month")
        .on("change", function() {
            selectedMonth = this.value;
            updateVis();
        });
}

// ------------------------------------
// 8. Check measurement validity
// ------------------------------------

// Exploratory plausibility limits.
// These are NOT official NOAA quality flags.
// Excluded records should be reported in
// the final project documentation.

function validReading(value) {

    if (value == null) return false;

    if (category === "TMAX") {
        return value >= -80 && value <= 140;
    }

    if (category === "PRCP") {
        return value >= 0 && value <= 40;
    }

    if (category === "WSF5") {
        return value >= 0 && value <= 150;
    }

    return false;
}

// ------------------------------------
// 9. Find the top 10 stations
// ------------------------------------

function getTopStations() {

    // Keep the highest reading per station.
    const bestStations = {};

    for (const d of allData) {

        // Apply month selection.
        if (
            selectedMonth !== "all" &&
            d.date.slice(4, 6) !== selectedMonth
        ) {
            continue;
        }

        const value = d[category];

        if (!validReading(value)) {
            continue;
        }

        // Save the station's best observation.
        if (
            !bestStations[d.id] ||
            value > bestStations[d.id].value
        ) {
            bestStations[d.id] = {
                id: d.id,
                station: d.station,
                state: d.state,
                date: d.date,
                value: value
            };
        }
    }

    // Convert object values into an array.
    const ranked = Object.values(bestStations);

    // Highest values first.
    ranked.sort((a, b) => b.value - a.value);

    // Keep only 10 stations.
    return ranked.slice(0, 10);
}

// ------------------------------------
// 10. Update visualization
// ------------------------------------

function updateVis() {

    const currentData = getTopStations();

    const currentSettings = settings[category];

    d3.select("#chart-title")
        .text(currentSettings.title);

    d3.select("#status")
        .text(
            `Showing top ${currentData.length} stations ` +
            `for the selected category and dates.`
        );

    // Remove old axes before drawing new ones.
    svg.selectAll(".axis").remove();

    // Create scales.
    xScale = d3.scaleLinear()
        .domain([
            0,
            d3.max(currentData, d => d.value) || 1
        ])
        .range([0, width]);

    yScale = d3.scaleBand()
        .domain(currentData.map(d => d.id))
        .range([0, height])
        .padding(0.25);

    // Draw x-axis.
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(6));

    // Draw y-axis with station names.
    svg.append("g")
        .attr("class", "axis")
        .call(
            d3.axisLeft(yScale)
                .tickFormat(id => {
                    const station = currentData.find(
                        d => d.id === id
                    );
                    return station
                        ? station.station.slice(0, 28)
                        : "";
                })
        );

    // Draw or update bars.
    svg.selectAll(".bar")
        .data(currentData, d => d.id)
        .join("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => yScale(d.id))
        .attr("width", d => xScale(d.value))
        .attr("height", yScale.bandwidth())
        .style("fill", currentSettings.color)

        .on("mouseover", function(event, d) {

            d3.select(this)
                .style("opacity", 0.7);

            d3.select("#tooltip")
                .style("display", "block")
                .html(
                    `<strong>${d.station}</strong><br>
                     State: ${d.state}<br>
                     Value: ${d.value.toFixed(2)}
                     ${currentSettings.unit}<br>
                     Date: ${d.date.slice(0,4)}-${d.date.slice(4,6)}-${d.date.slice(6,8)}`
                )
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 20) + "px");
        })

        .on("mouseout", function() {

            d3.select(this)
                .style("opacity", 1);

            d3.select("#tooltip")
                .style("display", "none");
        });

    // Show the numbers at the end of bars.
    svg.selectAll(".value-label")
        .data(currentData, d => d.id)
        .join("text")
        .attr("class", "value-label")
        .attr("x", d => xScale(d.value) + 5)
        .attr("y", d =>
            yScale(d.id) +
            yScale.bandwidth() / 2 + 4
        )
        .attr("font-size", 12)
        .text(d =>
            d.value.toFixed(1)
        );

    // Label the horizontal axis.
    svg.selectAll(".x-label")
        .data([currentSettings.unit])
        .join("text")
        .attr("class", "x-label")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .text(`Highest reported measurement (${currentSettings.unit})`);
}

// ------------------------------------
// 11. Start application
// ------------------------------------

window.addEventListener("load", init);
