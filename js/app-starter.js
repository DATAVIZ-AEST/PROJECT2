async function main() {
  const app = d3.select('#app')

  // Tooltip
  const tooltip = d3
    .select('body')
    .append('div')
    .style('position', 'absolute')
    .style('padding', '10px 14px')
    .style('background', 'rgba(15, 23, 42, 0.95)')
    .style('color', '#ffffff')
    .style('border-radius', '8px')
    .style('font-size', '12px')
    .style('font-family', 'Gill Sans, sans-serif')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('box-shadow', '0 4px 6px -1px rgba(0,0,0,0.5)')
    .style('z-index', '10')


  const [rawMovies, rawShows] = await Promise.all([
    d3.csv('data/NetflixMovies_added.csv'),
    d3.csv('data/NetflixTV_added.csv')
  ])

  function parseGenres(genres) {
    if (!genres || genres.trim() === '') return ['Unspecified']
    const parsed = genres
      .split(',')
      .map((g) => g.trim())
      .filter((g) => g.length > 0)
    return parsed.length > 0 ? parsed : ['Unspecified']
  }

// movies
  const movies = rawMovies.flatMap((d) => {
    const views = +(d.Views || d.views || 0)
    const genres = parseGenres(d.genres || d.Genre)
    return genres.map((genre) => ({
      type: 'Movie',
      genre: genre,
      views: views
    }))
  })

  // Series
  const shows = rawShows.flatMap((d) => {
    const views = +(d.Views || d.views || 0)
    const genres = parseGenres(d.genres || d.Genre)
    return genres.map((genre) => ({
      type: 'Serie',
      genre: genre,
      views: views
    }))
  })

  const allData = [...movies, ...shows]

  // ---- STEP 1: d3.rollup --------
  const rolledData = d3.rollup(
    allData,
    (v) => d3.sum(v, (d) => d.views),
    (d) => d.type,
    (d) => d.genre
  )

  // ---- STEP 2: ----
  const hierarchyData = d3
    .hierarchy(rolledData)
    .sum((d) => (typeof d[1] === 'number' ? d[1] : 0))
    .sort((a, b) => b.value - a.value)

  // ---- STEP 3:Treemap -----
  const width = 800
  const height = 560

  const treemapLayout = d3
    .treemap()
    .size([width, height - 110])
    .paddingOuter(4)
    .paddingTop(22)
    .paddingInner(2)

  treemapLayout(hierarchyData)

  const maxViews = d3.max(
    hierarchyData.descendants().filter((d) => d.depth === 2),
    (d) => d.value
  )

  const colorScale = d3
    .scaleSequential(d3.interpolateYlOrRd)
    .domain([0, Math.sqrt(maxViews)])

  // ---- STEP 4:SVG -----
  const svg = d3
    .create('svg')
    .attr('viewBox', [0, 0, width, height])
    .style('font-family', 'Gill Sans, sans-serif')
    .style('background-color', '#0f172a') 

  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', 22)
    .attr('text-anchor', 'middle')
    .style('font-size', '17px')
    .style('font-weight', 'bold')
    .style('fill', '#ffffff') 
    .text('¿What Genres dominate Netflix views?')

  const chartGroup = svg
    .append('g')
    .attr('transform', 'translate(0, 30)')

  // ---- STEP 5: Groups ---
  const nodes = chartGroup
    .selectAll('g')
    .data(hierarchyData.descendants().filter((d) => d.depth === 2))
    .join('g')
    .attr('transform', (d) => `translate(${d.x0},${d.y0})`)

  nodes
    .append('rect')
    .attr('width', (d) => Math.max(0, d.x1 - d.x0))
    .attr('height', (d) => Math.max(0, d.y1 - d.y0))
    .attr('fill', (d) => colorScale(Math.sqrt(d.value)))
    .attr('opacity', 0.9)
    .attr('rx', 3)
    .style('cursor', 'pointer')
    .on('mouseover', function (event, d) {
      d3.select(this).attr('opacity', 1).attr('stroke', '#ffffff').attr('stroke-width', 1.5)
      tooltip.style('opacity', 1).html(`
        <div style="font-weight: bold; margin-bottom: 2px;">${d.parent.data[0]} — ${d.data[0]}</div>
        <div>Total Views: <b>${d3.format(',.0f')(d.value)}</b></div>
      `)
    })
    .on('mousemove', function (event) {
      tooltip
        .style('left', event.pageX + 12 + 'px')
        .style('top', event.pageY - 28 + 'px')
    })
    .on('mouseout', function () {
      d3.select(this).attr('opacity', 0.9).attr('stroke', 'none')
      tooltip.style('opacity', 0)
    })


  nodes
    .append('text')
    .attr('x', 4)
    .attr('y', 11)
    .style('font-size', '8px')
    .style('font-weight', 'bold')
    .style('fill', (d) =>
      Math.sqrt(d.value) > Math.sqrt(maxViews) / 1.8 ? '#010101' : '#060606'
    )
    .style('pointer-events', 'none')
    .text((d) => {
      const w = d.x1 - d.x0
      const h = d.y1 - d.y0
      return w > 22 && h > 12 ? d.data[0] : ''
    })

  // Movies - series titles 
  chartGroup
    .selectAll('.group-label')
    .data(hierarchyData.descendants().filter((d) => d.depth === 1))
    .join('text')
    .attr('x', (d) => d.x0 + 6)
    .attr('y', (d) => d.y0 + 15)
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#e2e8f0') // Blanco suave
    .text((d) => `${d.data[0].toUpperCase()}S`)

  // ---- key 
  const legendWidth = 240
  const legendHeight = 8
  const legendX = (width - legendWidth) / 2
  const legendY = height - 40

  const defs = svg.append('defs')
  const linearGradient = defs
    .append('linearGradient')
    .attr('id', 'views-gradient')

  const stops = 10
  for (let i = 0; i <= stops; i++) {
    const offset = i / stops
    const value = Math.pow(offset, 2) * maxViews
    linearGradient
      .append('stop')
      .attr('offset', `${offset * 100}%`)
      .attr('stop-color', colorScale(Math.sqrt(value)))
  }

  const legendGroup = svg
    .append('g')
    .attr('transform', `translate(${legendX}, ${legendY})`)


// key gradients
  legendGroup
    .append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', 'url(#views-gradient)')
    .attr('rx', 2)

  
  legendGroup
    .append('text')
    .attr('x', legendWidth / 2)
    .attr('y', -6)
    .attr('text-anchor', 'middle')
    .style('font-size', '9px')
    .style('font-weight', 'bold')
    .style('fill', '#cbd5e1') 
    .text('Views per Genre')

  // key numbers
  const formatMillions = (val) => {
    if (val === 0) return '0M'
    return Math.round(val / 1e6) + 'M'
  }

  const legendTicks = [0, maxViews / 2, maxViews]

  legendGroup
    .selectAll('.legend-tick')
    .data(legendTicks)
    .join('text')
    .attr('x', (d, i) => (i / 2) * legendWidth)
    .attr('y', legendHeight + 12)
    .attr('text-anchor', (d, i) => (i === 0 ? 'start' : i === 2 ? 'end' : 'middle'))
    .style('font-size', '8px')
    .style('fill', '#94a3b8')
    .text((d) => formatMillions(d))

  // ---- STEP 7: source
    .append('text')
    .attr('x', 10)
    .attr('y', height - 10)
    .style('font-size', '8.5px')
    .style('fill', '#94a3b8')
    .style('font-style', 'italic')
    .text('Source: Netflix Engagement Dataset')

  
  app.append(() => svg.node())
}

main()