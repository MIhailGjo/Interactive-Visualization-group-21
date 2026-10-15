
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
let selectedStation = null;

let xScale, yScale;

// ------------------------------------
// 3. Create leaderboard SVG
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
// 4. Create Station Spotlight SVG
// ------------------------------------

const spotlightMargin = {
    top: 20,
    right: 30,
    bottom: 60,
    left: 70
};

const spotlightWidth = 900
    - spotlightMargin.left
    - spotlightMargin.right;

const spotlightHeight = 330
    - spotlightMargin.top
    - spotlightMargin.bottom;

const spotlightSvg = d3.select("#spotlight-vis")
    .append("svg")
    .attr("viewBox", "0 0 900 330")
    .append("g")
    .attr(
        "transform",
        `translate(${spotlightMargin.left},${spotlightMargin.top})`
    );

// ------------------------------------
// 5. Weather categories
// ------------------------------------

const settings = {
    TMAX: {
        title: "Hottest Weather Stations",
        unit: "°F",
        color: "#e76f51",
        description: "Daily maximum temperature"
    },

    PRCP: {
        title: "Rainiest Weather Stations",
        unit: "in",
        color: "#3b82f6",
        description: "Daily precipitation"
    },

    WSF5: {
        title: "Windiest Weather Stations",
        unit: "mph",
        color: "#2a9d8f",
        description: "Daily peak five-second wind gust"
    }
};

// ------------------------------------
// 6. Convert CSV strings to numbers
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
// 7. Load weather dataset
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
// 8. Connect dropdowns
// ------------------------------------

function setupSelectors() {

    d3.select("#category")
        .on("change", function() {

            category = this.value;

            // Clear selection when category changes.
            selectedStation = null;

            updateVis();
        });

    d3.select("#month")
        .on("change", function() {

            selectedMonth = this.value;

            // Clear selection when month changes.
            selectedStation = null;

            updateVis();
        });
}

// ------------------------------------
// 9. Check measurement validity
// ------------------------------------

// Exploratory plausibility limits.
// These are NOT official NOAA quality flags.
// They do not guarantee that every remaining
// reading is accurate.

function validReading(value) {

    if (value == null) {
        return false;
    }

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
// 10. Find the top 10 stations
// ------------------------------------

function getTopStations() {

    const bestStations = {};

    // Visit every observation in the dataset.
    for (const d of allData) {

        // Keep only dates from the chosen month.
        if (
            selectedMonth !== "all" &&
            d.date.slice(4, 6) !== selectedMonth
        ) {
            continue;
        }

        const value = d[category];

        // Skip missing or implausible readings.
        if (!validReading(value)) {
            continue;
        }

        // Keep the highest observation for each station.
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

    const ranked = Object.values(bestStations);

    // Sort from largest to smallest.
    ranked.sort((a, b) => b.value - a.value);

    // Return the top 10 stations.
    return ranked.slice(0, 10);
}

// ------------------------------------
// 11. Update leaderboard
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

    // Horizontal scale for measurement values.
    xScale = d3.scaleLinear()
        .domain([
            0,
            d3.max(currentData, d => d.value) || 1
        ])
        .range([0, width]);

    // Vertical scale for station rankings.
    yScale = d3.scaleBand()
        .domain(currentData.map(d => d.id))
        .range([0, height])
        .padding(0.25);

    // X-axis.
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(6));

    // Y-axis with station names.
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

    // Draw and update leaderboard bars.
    svg.selectAll(".bar")
        .data(currentData, d => d.id)
        .join("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => yScale(d.id))
        .attr("width", d => xScale(d.value))
        .attr("height", yScale.bandwidth())

        // Selected station appears gold.
        .style("fill", d =>
            d.id === selectedStation
                ? "#f4b942"
                : currentSettings.color
        )

        // Click a bar to select a station.
        .on("click", function(event, d) {

            selectedStation = d.id;

            // Update both the leaderboard and spotlight.
            updateVis();
        })

        // Leaderboard tooltip.
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
                        Date: ${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}<br>
                        Click to explore this station`
                )
                .style(
                    "left",
                    (event.pageX + 15) + "px"
                )
                .style(
                    "top",
                    (event.pageY - 20) + "px"
                );
        })

        .on("mouseout", function() {

            d3.select(this)
                .style("opacity", 1);

            d3.select("#tooltip")
                .style("display", "none");
        });

    // Numerical labels at the end of bars.
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
        .text(d => d.value.toFixed(1));

    // Horizontal axis label.
    svg.selectAll(".x-label")
        .data([currentSettings.unit])
        .join("text")
        .attr("class", "x-label")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .text(
            `Highest reported measurement (${currentSettings.unit})`
        );

    // Keep the second chart linked to the leaderboard.
    updateSpotlight();
}

// ------------------------------------
// 12. Update Station Spotlight
// ------------------------------------

function updateSpotlight() {

    // If nothing has been selected, show instructions.
    if (selectedStation === null) {

        d3.select("#spotlight-vis")
            .style("display", "none");

        spotlightSvg.selectAll("*").remove();

        d3.select("#spotlight-title")
            .text("Station Spotlight");

        d3.select("#spotlight-description")
            .text(
                "Click a leaderboard bar to explore " +
                "that station's daily weather."
            );

        return;
    }

    d3.select("#spotlight-vis")
        .style("display", "block");

    const currentSettings = settings[category];

    // Find matching daily records for this station.
    const stationData = allData.filter(d => {

        const correctStation =
            d.id === selectedStation;

        const correctMonth =
            selectedMonth === "all" ||
            d.date.slice(4, 6) === selectedMonth;

        return correctStation &&
                correctMonth &&
                validReading(d[category]);
    });

    // Sort records in chronological order.
    stationData.sort((a, b) =>
        a.date.localeCompare(b.date)
    );

    // Handle missing observations.
    if (stationData.length === 0) {

        spotlightSvg.selectAll("*").remove();

        d3.select("#spotlight-title")
            .text("Station Spotlight");

        d3.select("#spotlight-description")
            .text("No valid measurements available.");

        return;
    }

    const stationName = stationData[0].station;
    const stateName = stationData[0].state;

    d3.select("#spotlight-title")
        .text(`Station Spotlight: ${stationName}`);

    d3.select("#spotlight-description")
        .text(
            `${stateName} — ${currentSettings.description} ` +
            `(${currentSettings.unit})`
        );

    // Clear the previous spotlight visualization.
    spotlightSvg.selectAll("*").remove();

    // X-axis: dates.
    const x = d3.scaleBand()
        .domain(stationData.map(d => d.date))
        .range([0, spotlightWidth])
        .padding(0.15);

    // Y-axis: reported measurement.
    const lowestValue = d3.min(
        stationData,
        d => d[category]
    );

    const highestValue = d3.max(
        stationData,
        d => d[category]
    );

    const y = d3.scaleLinear()
        .domain([
            Math.min(0, lowestValue),
            Math.max(1, highestValue)
        ])
        .nice()
        .range([spotlightHeight, 0]);

    // Limit displayed date labels to prevent overlap.
    const labelInterval = Math.ceil(
        stationData.length / 8
    );

    const visibleDates = stationData
        .filter((d, i) =>
            i % labelInterval === 0
        )
        .map(d => d.date);

    // Bottom axis.
    spotlightSvg.append("g")
        .attr("class", "axis")
        .attr(
            "transform",
            `translate(0,${spotlightHeight})`
        )
        .call(
            d3.axisBottom(x)
                .tickValues(visibleDates)
                .tickFormat(date =>
                    date.slice(4, 6) + "/" +
                    date.slice(6, 8)
                )
        );

    // Left axis.
    spotlightSvg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

    // One bar for each daily observation.
    spotlightSvg.selectAll(".spotlight-bar")
        .data(stationData, d => d.date)
        .join("rect")
        .attr("class", "spotlight-bar")

        .attr("x", d => x(d.date))

        .attr("y", d =>
            Math.min(y(0), y(d[category]))
        )

        .attr("width", x.bandwidth())

        .attr("height", d =>
            Math.abs(y(0) - y(d[category]))
        )

        .style("fill", currentSettings.color)

        // Tooltip for individual daily observations.
        .on("mouseover", function(event, d) {

            d3.select(this)
                .style("opacity", 0.7);

            const date =
                d.date.slice(0, 4) + "-" +
                d.date.slice(4, 6) + "-" +
                d.date.slice(6, 8);

            d3.select("#tooltip")
                .style("display", "block")
                .html(
                    `<strong>${date}</strong><br>
                        ${stationName}<br>
                        ${currentSettings.description}:<br>
                        ${d[category].toFixed(2)}
                        ${currentSettings.unit}`
                )
                .style(
                    "left",
                    (event.pageX + 15) + "px"
                )
                .style(
                    "top",
                    (event.pageY - 20) + "px"
                );
        })

        .on("mouseout", function() {

            d3.select(this)
                .style("opacity", 1);

            d3.select("#tooltip")
                .style("display", "none");
        });

    // Label the spotlight's horizontal axis.
    spotlightSvg.append("text")
        .attr("class", "x-label")
        .attr("x", spotlightWidth / 2)
        .attr("y", spotlightHeight + 50)
        .attr("text-anchor", "middle")
        .text("Date (month/day)");
}

// ------------------------------------
// 13. Start application
// ------------------------------------

window.addEventListener("load", init);
