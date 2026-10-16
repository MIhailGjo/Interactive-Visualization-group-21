const margin = {
    top: 30,
    right: 90,
    bottom: 60,
    left: 250
};

const width = 900 - margin.left - margin.right;
const height = 550 - margin.top - margin.bottom;

let allData = [];
let category = "TMAX";
let selectedMonth = "all";
let selectedStation = null;

let xScale, yScale;

const svg = d3.select("#vis")
    .append("svg")
    .attr("viewBox", "0 0 900 550")
    .append("g")
    .attr(
        "transform",
        `translate(${margin.left},${margin.top})`
    );

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

// Empty cells should stay missing, not turn into zero.
// Otherwise a station could appear to have a real reading of 0.
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

function init() {

    d3.csv("./data/weather.csv", d => ({

        // Using the station name and coordinates together helps
        // distinguish stations that might share the same name.
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

function setupSelectors() {

    d3.select("#category")
        .on("change", function() {

            category = this.value;

            // The station selected under the previous category
            // might not be in the new top 10.
            selectedStation = null;

            updateVis();
        });

    d3.select("#month")
        .on("change", function() {

            selectedMonth = this.value;
            selectedStation = null;

            updateVis();
        });
}

// These are basic limits we chose to catch implausible values.
// They are not official NOAA checks, and passing them does
// not guarantee that a reading is correct.
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

// We found a few readings worth checking more closely.
// They stay in the rankings because we haven't confirmed
// that they are errors. This isn't a complete NOAA quality check.
function readingWarning(d) {

    const stationName = d.station.trim().toUpperCase();

    if (
        category === "TMAX" &&
        stationName === "PATUXENT RIVER NAS" &&
        d.date === "20170716"
    ) {
        return "Unusually high reported temperature for Maryland; not independently verified.";
    }

    if (
        category === "WSF5" &&
        stationName === "MOBRIDGE MUNI AP" &&
        d.date === "20170211"
    ) {
        return "Exceptionally high reported wind gust; not independently verified.";
    }

    if (
        category === "WSF5" &&
        stationName === "KLAMATH FALLS INTL AP" &&
        d.date === "20170622"
    ) {
        return "Exceptionally high reported wind gust; not independently verified.";
    }

    return "";
}

// This is the original month-based ranking.
// slider.js adds the state and day filters in its own version.
function getTopStations() {

    const bestStations = {};

    for (const d of allData) {

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

        // Only keep the highest valid measurement for each station.
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

    ranked.sort((a, b) => b.value - a.value);

    return ranked.slice(0, 10);
}

// slider.js replaces this with animatedUpdateVis() when it loads.
// Keeping the original update here avoids changing the existing setup.
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

    svg.selectAll(".axis").remove();

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

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(6));

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

    svg.selectAll(".bar")
        .data(currentData, d => d.id)
        .join("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => yScale(d.id))
        .attr("width", d => xScale(d.value))
        .attr("height", yScale.bandwidth())

        .style("fill", d =>
            d.id === selectedStation
                ? "#f4b942"
                : currentSettings.color
        )

        .attr("stroke", d =>
            readingWarning(d) ? "#b45309" : "none"
        )
        .attr("stroke-width", d =>
            readingWarning(d) ? 2 : 0
        )
        .attr("stroke-dasharray", d =>
            readingWarning(d) ? "5,3" : "none"
        )

        .on("click", function(event, d) {

            selectedStation = d.id;
            updateVis();
        })

        .on("mouseover", function(event, d) {

            d3.select(this)
                .style("opacity", 0.7);

            const warning = readingWarning(d);

            d3.select("#tooltip")
                .style("display", "block")
                .html(
                    `<strong>${d.station}</strong><br>
                     State: ${d.state}<br>
                     Value: ${d.value.toFixed(2)}
                     ${currentSettings.unit}<br>
                     Date: ${d.date.slice(0,4)}-${d.date.slice(4,6)}-${d.date.slice(6,8)}<br>
                     ${warning
                         ? "<strong>Data-quality caution:</strong> " +
                           warning + "<br>"
                         : ""}
                     Click to explore this station`
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

    svg.selectAll(".value-label")
        .data(currentData, d => d.id)
        .join("text")
        .attr("class", "value-label")
        .attr("x", d => xScale(d.value) + 5)
        .attr("y", d =>
            yScale(d.id) + yScale.bandwidth() / 2 + 4
        )
        .attr("font-size", 12)
        .text(d => d.value.toFixed(1));

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

    updateSpotlight();
}

function updateSpotlight() {

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

    function isSelectedDate(d) {

        if (
            selectedMonth === "all" ||
            selectedDay === null
        ) {
            return true;
        }

        const day = +d.date.slice(6, 8);

        if (singleDay) {
            return day === selectedDay;
        }

        return day >= startDay && day <= selectedDay;
    }

    // Show all valid readings from the selected month, not just
    // the slider range. The extra days give the selected period context.
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

    stationData.sort((a, b) =>
        a.date.localeCompare(b.date)
    );

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

    let selectedPeriod = "all available dates";

    if (
        selectedMonth !== "all" &&
        selectedDay !== null
    ) {
        if (singleDay) {
            selectedPeriod =
                `${monthName(selectedMonth)} ${selectedDay}`;
        } else {
            selectedPeriod =
                `${monthName(selectedMonth)} ${startDay}–${selectedDay}`;
        }
    }

    let description =
        `${stateName} — ${currentSettings.description} ` +
        `(${currentSettings.unit}). `;

    if (
        selectedMonth !== "all" &&
        selectedDay !== null
    ) {
        description +=
            `Gold bars show ${selectedPeriod}; ` +
            `faded bars provide context. `;
    } else {
        description +=
            "All available dates are highlighted. ";
    }

    description +=
        "Gaps indicate days without valid reported measurements.";

    d3.select("#spotlight-description")
        .text(description);

    spotlightSvg.selectAll("*").remove();

    // Build a position for every date, including dates with no reading.
    // Otherwise missing days would disappear and the timeline could
    // make readings from separate dates look consecutive.
    let allDates = [];

    if (selectedMonth !== "all") {

        const numberOfDays =
            lastDayInData(selectedMonth);

        for (let day = 1; day <= numberOfDays; day++) {

            const monthText =
                String(selectedMonth).padStart(2, "0");

            const dayText =
                String(day).padStart(2, "0");

            allDates.push(
                "2017" + monthText + dayText
            );
        }

    } else {

        // The provided dataset ends on September 21, not December 31.
        const start = new Date(2017, 0, 1);
        const end = new Date(2017, 8, 21);

        for (
            let date = new Date(start);
            date <= end;
            date.setDate(date.getDate() + 1)
        ) {
            const year = date.getFullYear();

            const month = String(
                date.getMonth() + 1
            ).padStart(2, "0");

            const day = String(
                date.getDate()
            ).padStart(2, "0");

            allDates.push(year + month + day);
        }
    }

    const x = d3.scaleBand()
        .domain(allDates)
        .range([0, spotlightWidth])
        .padding(0.15);

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

    // Show only some date labels so they don't overlap,
    // while still keeping every date in the actual scale.
    const labelInterval = Math.max(
        1,
        Math.ceil(allDates.length / 8)
    );

    const visibleDates = allDates.filter(
        (date, i) => i % labelInterval === 0
    );

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

    spotlightSvg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

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

        // Highlight the dates in the slider range, but leave
        // the other observations visible for comparison.
        .attr("fill", d =>
            isSelectedDate(d)
                ? "#f4b942"
                : currentSettings.color
        )

        .attr("opacity", d =>
            isSelectedDate(d) ? 1 : 0.25
        )

        // Use the same warning outlines as the main leaderboard.
        .attr("stroke", d =>
            readingWarning(d) ? "#b45309" : "none"
        )

        .attr("stroke-width", d =>
            readingWarning(d) ? 2 : 0
        )

        .attr("stroke-dasharray", d =>
            readingWarning(d) ? "5,3" : "none"
        )

        .on("mouseover", function(event, d) {

            d3.select(this)
                .attr("opacity", 1);

            const date =
                d.date.slice(0, 4) + "-" +
                d.date.slice(4, 6) + "-" +
                d.date.slice(6, 8);

            const warning = readingWarning(d);

            d3.select("#tooltip")
                .style("display", "block")
                .html(
                    `<strong>${date}</strong><br>
                     ${stationName}<br>
                     ${currentSettings.description}:<br>
                     ${d[category].toFixed(2)}
                     ${currentSettings.unit}
                     ${warning
                         ? "<br><strong>Data-quality caution:</strong> " +
                           warning
                         : ""}`
                )
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 20) + "px");
        })

        .on("mouseout", function(event, d) {

            d3.select(this)
                .attr(
                    "opacity",
                    isSelectedDate(d) ? 1 : 0.25
                );

            d3.select("#tooltip")
                .style("display", "none");
        });

    spotlightSvg.append("text")
        .attr("class", "x-label")
        .attr("x", spotlightWidth / 2)
        .attr("y", spotlightHeight + 50)
        .attr("text-anchor", "middle")
        .text("Date (month/day)");
}

window.addEventListener("load", init);