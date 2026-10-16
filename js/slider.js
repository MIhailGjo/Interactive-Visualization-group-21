let startDay = 1;
let selectedDay = null;
let lastDay = null;

// The slider uses two handles for a range and one for a single day.
let singleDay = false;

const duration = 500;

// Reuse the same axis groups when the rankings change.
const xAxisGroup = svg.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`);

const yAxisGroup = svg.append("g")
    .attr("class", "axis y-axis");

function monthName(month) {
    return d3.timeFormat("%B")(
        new Date(2017, +month - 1, 1)
    );
}

function lastDayInData(month) {
    let last = 1;

    for (const d of allData) {
        if (d.date.slice(4, 6) === month) {
            last = Math.max(
                last,
                +d.date.slice(6, 8)
            );
        }
    }

    return last;
}

function updateDayLabel(month, day) {
    d3.select("#day-label")
        .text(
            singleDay
                ? `${monthName(month)} ${day} only`
                : `${monthName(month)} ${startDay} – ${monthName(month)} ${day}`
        );
}

const sliderWidth = 600;

function buildDaySlider(last) {

    // Rebuild the slider when the month or toggle changes.
    d3.select("#day-slider")
        .selectAll("*")
        .remove();

    const slider = d3.sliderHorizontal()
        .min(1)
        .max(last)
        .step(1)
        .width(sliderWidth)
        .ticks(last)
        .tickFormat(d3.format("d"))
        .default(
            singleDay
                ? selectedDay
                : [startDay, selectedDay]
        )
        .displayValue(false)
        .on("onchange", (val) => {

            if (Array.isArray(val)) {
                startDay = +val[0];
                selectedDay = +val[1];
            } else {
                selectedDay = +val;
            }

            updateDayLabel(
                selectedMonth,
                selectedDay
            );

            // A different date range may produce a different top 10.
            selectedStation = null;

            updateVis();
        });

    d3.select("#day-slider")
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${sliderWidth + 60} 70`
        )
        .append("g")
        .attr("transform", "translate(30,20)")
        .call(slider);

    // Use different handle colors to distinguish the two ends of a range.
    d3.selectAll(
        "#day-slider .parameter-value .handle"
    )
        .attr("fill", (d, i, nodes) =>
            nodes.length === 2 && i === 0
                ? "blue"
                : "red"
        );
}

let selectedState = "all";

// Store the month/state subset so moving the day slider
// doesn't require filtering the full CSV every time.
let cachedMonth = null;
let cachedState = null;
let cachedRows = [];

function fillStateOptions() {

    const stationsByState = d3.rollup(
        allData,
        v => new Set(v.map(d => d.id)).size,
        d => d.state
    );

    const states = Array.from(
        stationsByState.keys()
    ).sort();

    d3.select("#state")
        .selectAll("option.state-option")
        .data(states)
        .join("option")
        .attr("class", "state-option")
        .attr("value", d => d)
        .text(d =>
            `${d} (${stationsByState.get(d)} stations)`
        );
}

d3.select("#state")
    .on("change", function() {

        selectedState = this.value;
        selectedStation = null;

        updateVis();
    });

// Reset saved browser form choices so they match the initial chart.
window.addEventListener("pageshow", () => {

    const month = document.getElementById("month");
    const toggle = document.getElementById("day-toggle");

    if (toggle.checked) {
        toggle.checked = false;
        toggle.dispatchEvent(
            new Event("change")
        );
    }

    if (month.value !== "all") {
        month.value = "all";
        month.dispatchEvent(
            new Event("change")
        );
    }
});

// The namespace keeps this listener separate from the one in script.js.
d3.select("#month")
    .on("change.slider", function() {

        d3.select("#day-toggle")
            .property(
                "disabled",
                this.value === "all"
            );

        if (this.value === "all") {
            selectedDay = null;
            startDay = 1;
            lastDay = null;

            d3.select("#day-slider")
                .selectAll("*")
                .remove();

            d3.select("#day-label")
                .text(
                    "Pick a month to use the day slider"
                );

            return;
        }

        lastDay = lastDayInData(this.value);

        startDay = 1;
        selectedDay = lastDay;

        buildDaySlider(lastDay);

        updateDayLabel(
            this.value,
            lastDay
        );
    });

d3.select("#day-toggle")
    .on("change", function() {

        singleDay = this.checked;

        d3.select("#toggle-text")
            .text(
                singleDay
                    ? "Single day"
                    : "Highest extreme"
            );

        if (selectedDay !== null) {
            startDay = Math.min(
                startDay,
                selectedDay
            );

            buildDaySlider(lastDay);

            updateDayLabel(
                selectedMonth,
                selectedDay
            );
        }

        selectedStation = null;
        updateVis();
    });

function getTopStationsByDay() {

    // Only rebuild the cached records when the month or state changes.
    if (
        cachedMonth !== selectedMonth ||
        cachedState !== selectedState
    ) {
        cachedRows = allData.filter(d => {

            const correctMonth =
                selectedMonth === "all" ||
                d.date.slice(4, 6) === selectedMonth;

            const correctState =
                selectedState === "all" ||
                d.state === selectedState;

            return correctMonth && correctState;
        });

        cachedMonth = selectedMonth;
        cachedState = selectedState;
    }

    const bestStations = {};

    for (const d of cachedRows) {

        const day = +d.date.slice(6, 8);

        if (
            selectedMonth !== "all" &&
            selectedDay !== null
        ) {
            if (singleDay && day !== selectedDay) {
                continue;
            }

            if (
                !singleDay &&
                (day < startDay || day > selectedDay)
            ) {
                continue;
            }
        }

        const value = d[category];

        if (!validReading(value)) {
            continue;
        }

        // A station can have many daily readings, but only its
        // highest valid reading should count toward the ranking.
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

function animatedUpdateVis() {

    if (
        allData.length &&
        d3.selectAll(
            "#state option.state-option"
        ).empty()
    ) {
        fillStateOptions();
    }

    const currentData = getTopStationsByDay();
    const currentSettings = settings[category];

    // Stop unfinished transitions before starting another update.
    // This is useful when someone moves the slider repeatedly.
    svg.selectAll(".bar")
        .interrupt();

    svg.selectAll(".value-label")
        .interrupt();

    xAxisGroup.interrupt();
    yAxisGroup.interrupt();

    const t = svg.transition()
        .duration(duration)
        .ease(d3.easeLinear);

    d3.select("#chart-title")
        .text(currentSettings.title);

    d3.select("#status")
        .text(
            `Showing top ${currentData.length} stations ` +
            `for the selected category and dates.`
        );

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

    xAxisGroup.transition(t)
        .call(
            d3.axisBottom(xScale).ticks(6)
        );

    yAxisGroup.transition(t)
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

    // Use station IDs to match existing bars with updated rankings.
    // New stations enter at zero width, while old ones shrink away.
    svg.selectAll(".bar")
        .data(currentData, d => d.id)
        .join(
            enter => enter.append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("y", d => yScale(d.id))
                .attr("height", yScale.bandwidth())
                .attr("width", 0),

            update => update,

            exit => exit.transition(t)
                .attr("width", 0)
                .style("opacity", 0)
                .remove()
        )

        // Keep questionable observations visible, but mark them
        // so users know the reading has not been verified.
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

            // Selecting a station only needs to change the highlight
            // and Spotlight chart, not recalculate the leaderboard.
            svg.selectAll(".bar")
                .interrupt();

            svg.selectAll(".bar")
                .style("fill", bar =>
                    bar.id === selectedStation
                        ? "#f4b942"
                        : currentSettings.color
                );

            updateSpotlight();
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
        })

        .transition(t)
        .attr("y", d => yScale(d.id))
        .attr("width", d => xScale(d.value))
        .attr("height", yScale.bandwidth())
        .style("opacity", 1)
        .style("fill", d =>
            d.id === selectedStation
                ? "#f4b942"
                : currentSettings.color
        );

    svg.selectAll(".value-label")
        .data(currentData, d => d.id)
        .join(
            enter => enter.append("text")
                .attr("class", "value-label")
                .attr("x", 5)
                .attr("y", d =>
                    yScale(d.id) +
                    yScale.bandwidth() / 2 + 4
                )
                .attr("font-size", 12)
                .text("0.0"),

            update => update,

            exit => exit.transition(t)
                .style("opacity", 0)
                .remove()
        )

        .transition(t)
        .style("opacity", 1)
        .attr("x", d => xScale(d.value) + 5)
        .attr("y", d =>
            yScale(d.id) +
            yScale.bandwidth() / 2 + 4
        )

        // Animate the displayed numbers along with the bar lengths.
        .tween("text", function(d) {

            const i = d3.interpolateNumber(
                +this.textContent || 0,
                d.value
            );

            return function(time) {
                this.textContent = i(time).toFixed(1);
            };
        });

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

// script.js calls updateVis(), so use this version once slider.js is loaded.
updateVis = animatedUpdateVis;