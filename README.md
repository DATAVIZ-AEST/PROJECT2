## Overview

**Research Question:** How does total viewer engagement compare between Netflix Movies and TV Shows across different genres? 

**Grouping & Binning:** To break this down, I grouped the dataset by media type Movie vs. Series and then summed up total views by genre using `d3.rollup`. Since some titles had multiple genres, I split and cleaned those up so each view count was mapped correctly. I then built a nested hierarchy (`d3.hierarchy`) and used a square-root color scale to make sure giant view counts didn't completely wash out the smaller categories.

**Patterns Observed:** Looking at the treemap, both movies and TV shows heavy-hitters are concentrated in Comedy, Action, and Drama. But TV shows definitely show a much wider spread across smaller, niche genres, whereas movie views are way more stacked into just a few huge blockbuster categories.
