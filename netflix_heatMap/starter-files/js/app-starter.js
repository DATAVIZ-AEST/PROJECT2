async function main() {
  const app = d3.select('#app')

  const tooltip = d3
    .select('body')
    .append('div')
    .style('position', 'absolute')
    .style('padding', '20px 24px')
    .style('background', 'rgba(15, 23, 42, 0.9)')
    .style('color', '#ffffff')
    .style('border-radius', '6px')
    .style('font-size', '16px')
    .style('font-family', 'Gill Sans, sans-serif')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('box-shadow', '0 4px 6px -1px rgba(0,0,0,0.3)')
    .style('z-index', '10')



  // ---- PRE-FILLED: load the data -----------------------
  const raw = await d3.csv('../data/NetflixMovies_added.csv')
  console.log('raw rows', raw)

  function toMinutes(runtime) {
    if (!runtime) return 0;
    const hoursMatch = runtime.match(/(\d+)\s*h/);
    const minutesMatch = runtime.match(/(\d+)\s*m/);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

    return hours * 60 + minutes;
  }

  function parseGenres(genres) {
    if (!genres) return [];
    return genres.split(',').map((g) => g.trim());
  }

  // ----------- CLEANING THE DATA ---------------------
  const movies = raw.map((d) => ({
    title: d.Title,
    views: +d.Views,                        // CLEAN 1
    hours_viewed: +d['Hours Viewed'],        // CLEAN 1
    runtime_minutes: toMinutes(d.Runtime),  // CLEAN 2
    release_date: d['Release Date'],
    genres: parseGenres(d.genres),          // CLEAN 3
  }))

  // -------- D3.BIN  --------------------
  const max_views = d3.max(movies, (d) => d.views)


  const thresholds = [1000000, 5000000, 10000000, 20000000, 50000000, 100000000, max_views]

  const bin_generator = d3
    .bin()
    .value((d) => d.views)
    .domain([1000000, max_views])
    .thresholds(thresholds)

  const bins = bin_generator(movies)

  // Range
  bins.forEach((b) => {
    const label = `${d3.format('.1s')(b.x0)} - ${d3.format('.1s')(b.x1)}`
    b.forEach((movie) => {
      movie.view_bin = label
    })
  })

  // X
  const view_bins = bins
    .filter((b) => b.length >= 0)
    .map((b) => `${d3.format('.1s')(b.x0)} - ${d3.format('.1s')(b.x1)}`)

  // ------- CLEAN 4: One row x movie x genre --------
  const genre_rows = movies.flatMap((d) =>
    d.genres.map((genre) => ({
      ...d,
      genre: genre,
    }))
  )

  // --------- STEP 1: d3.rollup -----------
  const count_matrix = d3.rollup(
    genre_rows,
    (v) => v.length,
    (d) => d.genre,
    (d) => d.view_bin
  )

  // --------- STEP 2: domains ------------
  const genres = Array.from(new Set(genre_rows.map((d) => d.genre))).sort()

  const matrix_data = []
  count_matrix.forEach((binMap, genre) => {
    binMap.forEach((count, bin) => {
      matrix_data.push({
        genre: genre,
        bin: bin,
        count: count,
      })
    })
  })

  console.log('view_bins automáticos', view_bins)
  console.log('matrix_data con d3.bin', matrix_data)

  // ------ SVG ------
  const svg = d3
    .create('svg')
    .attr('viewBox', [0, 0, 700, 420])
    .style('border', '1px solid gray')

  
  svg.append('text')
    .attr('x', 350)         //SVG (700 / 2)
    .attr('y', 25)                
    .attr('text-anchor', 'middle')  //Align center 
    .style('font-size', '20px')
    .style('font-weight', 'bold')
    .style('font-family', 'Gill Sans, sans-serif')
    .style('fill', '#111111')
    .text('Netflix movies views by Genre')  

  // ------- STEP 3: Scales ---------
  const y_scale = d3
    .scaleBand()
    .domain(genres)
    .range([40, 360])
    .padding(0.08)

  const x_scale = d3
    .scaleBand()
    .domain(view_bins)
    .range([130, 680])
    .padding(0.08)

  const max_count = d3.max(matrix_data, (d) => d.count)

  // Colors
  const color_scale = d3
    .scaleSequential(d3.interpolateYlOrRd)
    .domain([0, Math.sqrt(max_count)])

  // ------ STEP 4: Rect -------
  const g = svg.append('g').selectAll('g').data(matrix_data).join('g')

  g.append('rect')
    .attr('x', (d) => x_scale(d.bin))
    .attr('y', (d) => y_scale(d.genre))
    .attr('width', x_scale.bandwidth())
    .attr('height', y_scale.bandwidth())
    .attr('fill', (d) => color_scale(Math.sqrt(d.count)))
    .attr('rx', 2)
    .style('cursor', 'pointer')
    .style('transition', 'all 0.15s ease')
    
    // --- EVENTOS HOVER ---
    .on('mouseover', function (event, d) {
  
      d3.select(this)
        .attr('stroke', '#4a4a4a')
        .attr('stroke-width', 2)

  
      tooltip.style('opacity', 1).html(`
        <div style="font-weight: bold; margin-bottom: 2px;">${d.genre}</div>
        <div>Views: <b>${d.bin} </b></div>
        <div>Movies: <b>${d.count}</b></div>
      `)
    })
    .on('mousemove', function (event) {

      tooltip
        .style('left', event.pageX + 12 + 'px')
        .style('top', event.pageY - 28 + 'px')
    })
    .on('mouseleave', function () {
      d3.select(this).attr('stroke', 'none')
      tooltip.style('opacity', 0)
    })

  // ------ STEP 5: text -------
  // 1. Cifras dentro de celdas
  g.append('text')
    .attr('x', (d) => x_scale(d.bin) + x_scale.bandwidth() / 2)
    .attr('y', (d) => y_scale(d.genre) + y_scale.bandwidth() / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '8px')
    .style('font-family', 'Gill Sans, sans-serif')
    .style('fill', (d) =>
      Math.sqrt(d.count) > Math.sqrt(max_count) / 2 ? '#ffffff' : '#0c0c0c'
    )
    .text((d) => (d.count > 0 ? d.count : ''))

  // 2. X Axis: genre
  svg.append('g')
    .selectAll('text')
    .data(genres)
    .join('text')
    .attr('x', 122)
    .attr('y', (d) => y_scale(d) + y_scale.bandwidth() / 2)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '10px')
    .style('font-family', 'Gill Sans, sans-serif')
    .text((d) => d)

  // 3. X Axis: Views (d3.bin)
  svg.append('g')
    .selectAll('text')
    .data(view_bins)
    .join('text')
    .attr('x', (d) => x_scale(d) + x_scale.bandwidth() / 2)
    .attr('y', 380)
    .attr('text-anchor', 'middle')
    .style('font-size', '8.5px')
    .style('font-weight', 'bold')
    .style('font-family', 'Gill Sans, sans-serif')
    .text((d) => d)

    //WOHOOO!
  app.append(() => svg.node())
}

main()
