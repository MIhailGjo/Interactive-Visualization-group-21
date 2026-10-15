
// Weather Olympics 2017 - day slider + animations
// Loaded after script.js. Adds a day-of-month slider
// and replaces updateVis with an animated version.

// ------------------------------------
// 1. Slider state
// ------------------------------------

// Lower and upper day of the range.
// selectedDay null = no day limit (whole period)
let startDay = 1;
let selectedDay = null;

// Last day with data in the selected month.
let lastDay = null;

// false = highest extreme from startDay to selectedDay
// true  = only readings from selectedDay
let singleDay = false;

const duration = 500;

// Axis groups stay on the page so they can animate.
const xAxisGroup = svg.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`);

const yAxisGroup = svg.append("g")
    .attr("class", "axis y-axis");

// ------------------------------------
// 2. Slider helpers
// ------------------------------------

function monthName(month) {
    return d3.timeFormat("%B")(new Date(2017, +month - 1, 1));
}

// Last day with data in a month (data ends Sept 21).
function lastDayInData(month) {
    let last = 1;

    for (const d of allData) {
        if (d.date.slice(4, 6) === month) {
            last = Math.max(last, +d.date.slice(6, 8));
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

// ------------------------------------
// 3. Connect the slider
// ------------------------------------

// Same d3-simple-slider setup as Lab 5,
// rebuilt for each month so the max day is right.
// Two handles (lower + upper day) in range mode,
// one handle in single-day mode.
const sliderWidth = 600;

function buildDaySlider(last) {

    d3.select("#day-slider").selectAll("*").remove();

    const slider = d3
        .sliderHorizontal()
        .min(1)
        .max(last)
        .step(1)
        .width(sliderWidth)
        .ticks(last)
        .tickFormat(d3.format("d"))
        .default(singleDay ? selectedDay : [startDay, selectedDay])
        .displayValue(false)
        .on("onchange", (val) => {
            if (Array.isArray(val)) {
                startDay = +val[0];
                selectedDay = +val[1];
            } else {
                selectedDay = +val;
            }
            updateDayLabel(selectedMonth, selectedDay);
            updateVis();
        });

    d3.select("#day-slider")
        .append("svg")
        .attr("viewBox", `0 0 ${sliderWidth + 60} 70`)
        .append("g")
        .attr("transform", "translate(30,20)")
        .call(slider);

    // Lower-day handle blue, upper-day handle red.
    // In single-day mode the one handle is the upper day.
    d3.selectAll("#day-slider .parameter-value .handle")
        .attr("fill", (d, i, nodes) =>
            nodes.length === 2 && i === 0 ? "blue" : "red"
        );
}

// ------------------------------------
// State filter
// ------------------------------------

// "all" = every state
let selectedState = "all";

// Fill the state dropdown once the data has loaded,
// with the number of stations in each state.
function fillStateOptions() {

    const stationsByState = d3.rollup(
        allData,
        v => new Set(v.map(d => d.id)).size,
        d => d.state
    );

    const states = Array.from(stationsByState.keys()).sort();

    d3.select("#state")
        .selectAll("option.state-option")
        .data(states)
        .join("option")
        .attr("class", "state-option")
        .attr("value", d => d)
        .text(d => `${d} (${stationsByState.get(d)} stations)`);
}

d3.select("#state")
    .on("change", function() {
        selectedState = this.value;
        updateVis();
    });

// Browsers can restore the last dropdown/toggle choice on
// reload, so always start from "All available months".
window.addEventListener("pageshow", () => {

    const month = document.getElementById("month");
    const toggle = document.getElementById("day-toggle");

    if (toggle.checked) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change"));
    }

    if (month.value !== "all") {
        month.value = "all";
        month.dispatchEvent(new Event("change"));
    }
});

// Runs before the month listener in script.js,
// so it reads the new month from the dropdown itself.
d3.select("#month")
    .on("change.slider", function() {

        d3.select("#day-toggle")
            .property("disabled", this.value === "all");

        if (this.value === "all") {
            selectedDay = null;
            d3.select("#day-slider").selectAll("*").remove();
            d3.select("#day-label")
                .text("Pick a month to use the day slider");
            return;
        }

        lastDay = lastDayInData(this.value);
        startDay = 1;
        selectedDay = lastDay;

        buildDaySlider(lastDay);
        updateDayLabel(this.value, lastDay);
    });

d3.select("#day-toggle")
    .on("change", function() {
        singleDay = this.checked;

        d3.select("#toggle-text")
            .text(singleDay ? "Single day" : "Highest extreme");

        if (selectedDay !== null) {
            startDay = Math.min(startDay, selectedDay);
            buildDaySlider(lastDay);
            updateDayLabel(selectedMonth, selectedDay);
        }

        updateVis();
    });

// ------------------------------------
// 4. Top 10 stations in the selected days
// ------------------------------------

function getTopStationsByDay() {

    const bestStations = {};

    for (const d of allData) {

        if (
            selectedState !== "all" &&
            d.state !== selectedState
        ) {
            continue;
        }

        if (selectedMonth !== "all") {

            if (d.date.slice(4, 6) !== selectedMonth) {
                continue;
            }

            const day = +d.date.slice(6, 8);

            if (selectedDay !== null) {

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
        }

        const value = d[category];

        if (!validReading(value)) {
            continue;
        }

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

// ------------------------------------
// 5. Animated update
// ------------------------------------

function animatedUpdateVis() {

    if (
        allData.length &&
        d3.selectAll("#state option.state-option").empty()
    ) {
        fillStateOptions();
    }

    const currentData = getTopStationsByDay();

    const currentSettings = settings[category];

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
        .call(d3.axisBottom(xScale).ticks(6));

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

    // Bars: new ones grow from 0, old ones shrink away,
    // remaining ones slide to their new rank.
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
        })

        .transition(t)
        .attr("y", d => yScale(d.id))
        .attr("width", d => xScale(d.value))
        .attr("height", yScale.bandwidth())
        .style("opacity", 1)
        .style("fill", currentSettings.color);

    // Value labels slide with the bars and count up/down.
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
        .text(`Highest reported measurement (${currentSettings.unit})`);
}

// script.js calls updateVis by name, so this makes
// the dropdowns and the slider use the animated version.
updateVis = animatedUpdateVis;
