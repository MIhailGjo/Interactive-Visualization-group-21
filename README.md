# CMSC471 A1: Interactive Visualization

## Weather Olympics 2017

Which U.S. weather stations recorded the most extreme weather in 2017?
An interactive D3 bar chart ranking the top 10 stations by hottest
temperature, most rain or strongest wind gust.

Team: Kiran Manoj, Mihail Gjoni, Tong Zhan


## Features

- Category, month and state dropdowns (dynamic queries)
- Two-handle day range slider (d3-simple-slider, as in Lab 5)
- Highest extreme / single day toggle
- Animated transitions (`d3.easeLinear`) when the ranking changes
- Tooltips with station, state, value and date
- Hover highlighting

The full write-up (design rationale, references, process, AI usage) is at
the bottom of the page.

## Structure

```
index.html        page + write-up
css/styles.css    styles
js/script.js      D3 code: data loading, ranking, bar chart
js/slider.js      day slider, toggle, state filter, animated updates
data/weather.csv  NOAA GHCN-Daily 2017 subset (course-provided)
```

## Run locally

Serve the folder (opening the file directly blocks loading the CSV), e.g.:

```
python3 -m http.server
```

then open http://localhost:8000.

## Remaining

- [ ] Enable GitHub Pages (Settings → Pages → `main` / root) and check the live site
- [ ] Record the demo video
- [ ] Submit the site URL and video to Canvas
